import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { getPublicStoreData } from "@/lib/services/public-data";
import {
  getFamGatewayConfigStatus,
  convertUsdToInr,
  generateInternalOrderId,
  createFamGatewayOrder,
} from "@/lib/famgateway";
import {
  buildDeliveryCommands,
  createInternalOrder,
  updateOrderGatewayInfo,
  StoredOrderItem,
} from "@/lib/orders";

export const dynamic = "force-dynamic";

const checkoutReqSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(16)
    .regex(/^[A-Za-z0-9_]{3,16}$/, "Invalid Minecraft username"),
  items: z
    .array(
      z.object({
        slug: z.string().trim().min(1),
        quantity: z.coerce.number().int().min(1).max(99),
      })
    )
    .min(1, "Cart cannot be empty"),
});

export async function GET() {
  const status = getFamGatewayConfigStatus();
  return NextResponse.json({
    famgateway: {
      configured: status.configured,
      usdToInrRate: status.usdToInrRate,
    },
  });
}

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const rl = checkRateLimit(`fam-checkout:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many checkout requests. Please wait." }, { status: 429 });
  }

  const config = getFamGatewayConfigStatus();
  if (!config.configured) {
    return NextResponse.json(
      {
        error: "FamGateway UPI payments are not configured on this server yet.",
        configured: false,
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = checkoutReqSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid checkout request.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { username, items } = parsed.data;
  const { products, coinConfig } = await getPublicStoreData();

  // Validate items and calculate totals
  const storedItems: StoredOrderItem[] = [];
  let totalUsd = 0;

  for (const item of items) {
    const customCoinMatch = /^coins-custom-(\d+)$/.exec(item.slug);
    if (customCoinMatch) {
      const coins = Number(customCoinMatch[1]);
      if (
        !Number.isInteger(coins) ||
        coins < coinConfig.minCustomCoins ||
        coins > coinConfig.maxCustomCoins
      ) {
        return NextResponse.json(
          { error: `Invalid custom coin quantity: ${coins}` },
          { status: 400 }
        );
      }

      // Calculate coin price using discount tiers
      let unitRate = coinConfig.baseRatePerCoin;
      const sortedTiers = [...coinConfig.discountTiers].sort((a, b) => b.minCoins - a.minCoins);
      for (const tier of sortedTiers) {
        if (coins >= tier.minCoins) {
          unitRate = tier.unitRate;
          break;
        }
      }
      const unitPrice = Math.max(0.5, Math.round(coins * unitRate * 100) / 100);
      const subtotal = Math.round(unitPrice * item.quantity * 100) / 100;
      totalUsd += subtotal;

      storedItems.push({
        slug: item.slug,
        name: `Custom Coins (${(coins * item.quantity).toLocaleString()} Coins)`,
        quantity: item.quantity,
        unitPriceUsd: unitPrice,
        subtotalUsd: subtotal,
        coinAmount: coins * item.quantity,
      });
      continue;
    }

    const product = products.find((p) => p.id === item.slug);
    if (!product || !product.isEnabled) {
      return NextResponse.json(
        { error: `Product "${item.slug}" is unavailable or disabled.` },
        { status: 400 }
      );
    }

    const subtotal = Math.round(product.price * item.quantity * 100) / 100;
    totalUsd += subtotal;

    storedItems.push({
      slug: product.id,
      name: product.name,
      quantity: item.quantity,
      unitPriceUsd: product.price,
      subtotalUsd: subtotal,
      coinAmount: product.coinAmount ? product.coinAmount * item.quantity : undefined,
    });
  }

  totalUsd = Math.round(totalUsd * 100) / 100;
  if (totalUsd <= 0) {
    return NextResponse.json({ error: "Order total must be greater than zero." }, { status: 400 });
  }

  // Convert USD to INR only when creating the FamGateway payment session (rate: ₹94.25/USD, 2 decimal places)
  const amountInr = convertUsdToInr(totalUsd, config.usdToInrRate);
  const deliveryCommands = buildDeliveryCommands({
    username,
    items,
    catalog: products,
    coinConfig,
  });

  const orderId = generateInternalOrderId();

  // Create internal order record in Supabase
  await createInternalOrder({
    orderId,
    username,
    amountInr,
    amountUsd: totalUsd,
    items: storedItems,
    deliveryCommands,
    metadata: {
      clientIp: ip,
      usdToInrRate: config.usdToInrRate,
    },
  });

  // Base domain determination for redirect and webhook
  const rawOrigin = new URL(req.url).origin;
  const isLocal = rawOrigin.includes("localhost") || rawOrigin.includes("127.0.0.1");
  const productionHost = process.env.NEXT_PUBLIC_DOMAIN
    ? `https://${process.env.NEXT_PUBLIC_DOMAIN}`
    : "https://evolutionsmp-site.vercel.app";
  const siteUrl = isLocal ? rawOrigin : productionHost;

  const redirectUrl = `${siteUrl}/store?order_id=${encodeURIComponent(orderId)}&upi=complete`;
  const webhookUrl = `${siteUrl}/api/webhooks/famgateway`;

  try {
    const gatewayOrder = await createFamGatewayOrder({
      amount: amountInr,
      customerName: username,
      redirectUrl,
      webhookUrl,
    });

    // Update order with gateway identifiers
    await updateOrderGatewayInfo({
      orderId,
      gatewayOrderId: gatewayOrder.gatewayOrderId,
      checkoutUrl: gatewayOrder.checkoutUrl,
    });

    return NextResponse.json({
      success: true,
      orderId,
      gatewayOrderId: gatewayOrder.gatewayOrderId,
      checkoutUrl: gatewayOrder.checkoutUrl,
      amountInr,
      amountUsd: totalUsd,
      username,
      qrUrl: gatewayOrder.qrUrl,
      upiIntent: gatewayOrder.upiIntent,
    });
  } catch (err: any) {
    console.error("[FamGateway Checkout] Error creating order:", err);
    return NextResponse.json(
      {
        error: err?.message || "Failed to initialize FamGateway UPI order. Please try again.",
      },
      { status: 502 }
    );
  }
}
