import { NextResponse } from "next/server";
import { z } from "zod";
import { createTebexHeadlessCheckout, getTebexConfigStatus } from "@/lib/tebex";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { getPublicStoreData } from "@/lib/services/public-data";

export const dynamic = "force-dynamic";

const tebexCheckoutReqSchema = z.object({
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
    .min(1),
});

export async function GET() {
  return NextResponse.json({ tebex: getTebexConfigStatus() });
}

export async function POST(req: Request) {
  const rl = checkRateLimit(`tebex-checkout:${getRequestIp(req)}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const status = getTebexConfigStatus();
  if (!status.hasPublicToken) {
    return NextResponse.json(
      {
        error: "Tebex Headless API credentials are not configured yet.",
        configured: false,
        tebex: status,
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

  const parsed = tebexCheckoutReqSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid checkout request.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { products, coinConfig } = await getPublicStoreData();
  const mappedPackages: { tebexPackageId: string; quantity: number }[] = [];

  for (const item of parsed.data.items) {
    const product = products.find((p) => p.id === item.slug);
    const pkgId =
      product?.tebexPackageId ||
      (item.slug.startsWith("coins-custom-") ? coinConfig.tebexPackageId : "");

    if (!pkgId) {
      return NextResponse.json(
        {
          error: `Product "${item.slug}" is not mapped to a Tebex Package ID yet in Admin -> Store.`,
        },
        { status: 400 }
      );
    }

    mappedPackages.push({ tebexPackageId: pkgId, quantity: item.quantity });
  }

  try {
    const origin = new URL(req.url).origin;
    const checkout = await createTebexHeadlessCheckout({
      username: parsed.data.username,
      returnUrl: `${origin}/store?tebex=complete`,
      cancelUrl: `${origin}/store?tebex=cancelled`,
      items: mappedPackages,
    });

    return NextResponse.json({
      success: true,
      basketIdent: checkout.basketIdent,
      checkoutUrl: checkout.checkoutUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to initialize Tebex checkout." },
      { status: 502 }
    );
  }
}
