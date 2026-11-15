import { NextResponse } from "next/server";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { getStoreOrder, fulfillStoreOrder } from "@/lib/orders";
import {
  getFamGatewayConfigStatus,
  verifyFamGatewayOrderServerToServer,
} from "@/lib/famgateway";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ip = getRequestIp(req);
  const rl = checkRateLimit(`order-status:${ip}`, 40, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many status checks." }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("order_id")?.trim();

  if (!orderId) {
    return NextResponse.json({ error: "Missing order_id parameter." }, { status: 400 });
  }

  const order = await getStoreOrder(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  // If already verified and fulfilled
  if (order.payment_status === "paid" && order.delivery_status === "delivered") {
    return NextResponse.json({
      orderId: order.order_id,
      username: order.username,
      amountInr: order.amount,
      amountUsd: order.original_usd_total,
      currency: order.currency,
      status: order.status,
      paymentStatus: order.payment_status,
      deliveryStatus: order.delivery_status,
      utr: order.utr,
      deliveredAt: order.delivered_at,
      items: order.items,
    });
  }

  // If order is still pending, perform server-to-server verification fallback (Rule 8 & 14)
  const config = getFamGatewayConfigStatus();
  if (config.configured && order.payment_status === "unpaid") {
    try {
      const s2s = await verifyFamGatewayOrderServerToServer(order.order_id);
      if (s2s.verified && s2s.status === "paid") {
        const fulfillment = await fulfillStoreOrder({
          orderId: order.order_id,
          utr: s2s.utr,
          senderUpi: s2s.senderUpi,
          verifiedAmount: s2s.amount,
          source: "poll_server_to_server_verified",
        });

        if (fulfillment.success && fulfillment.order) {
          return NextResponse.json({
            orderId: fulfillment.order.order_id,
            username: fulfillment.order.username,
            amountInr: fulfillment.order.amount,
            amountUsd: fulfillment.order.original_usd_total,
            currency: fulfillment.order.currency,
            status: fulfillment.order.status,
            paymentStatus: fulfillment.order.payment_status,
            deliveryStatus: fulfillment.order.delivery_status,
            utr: fulfillment.order.utr,
            deliveredAt: fulfillment.order.delivered_at,
            items: fulfillment.order.items,
          });
        }
      }
    } catch (err) {
      console.warn(`[Order Status] Auto S2S check failed for ${orderId}:`, err);
    }
  }

  // Return safe sanitized public status
  return NextResponse.json({
    orderId: order.order_id,
    username: order.username,
    amountInr: order.amount,
    amountUsd: order.original_usd_total,
    currency: order.currency,
    status: order.status,
    paymentStatus: order.payment_status,
    deliveryStatus: order.delivery_status,
    items: order.items,
  });
}
