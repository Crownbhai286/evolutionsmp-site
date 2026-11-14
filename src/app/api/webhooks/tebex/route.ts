import { NextResponse } from "next/server";
import { verifyTebexWebhookSignature } from "@/lib/tebex";
import { recordAuditLog } from "@/lib/audit";
import { getRequestIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature");

  let payload: any = {};
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON webhook payload." }, { status: 400 });
  }

  // Official Tebex webhook validation ping uses type = "validation.webhook"
  if (!verifyTebexWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid Tebex webhook signature." }, { status: 401 });
  }

  if (payload?.type === "validation.webhook" && payload?.id) {
    return NextResponse.json({ id: payload.id });
  }

  await recordAuditLog({
    adminEmail: "tebex-webhook@system",
    adminRole: "system",
    action: `TEBEX_${String(payload?.type || "EVENT").toUpperCase()}`,
    entityType: "tebex_webhook",
    entityId: String(payload?.id || payload?.subject?.transaction_id || ""),
    details: {
      type: payload?.type,
      username: payload?.subject?.customer?.username?.username ?? null,
    },
    ipAddress: getRequestIp(req),
  });

  return NextResponse.json({ received: true });
}
