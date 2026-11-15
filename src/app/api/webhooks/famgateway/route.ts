import { NextResponse } from "next/server";
import { getRequestIp } from "@/lib/rate-limit";
import { recordAuditLog } from "@/lib/audit";
import {
  verifyFamGatewayWebhookSignature,
  verifyFamGatewayOrderServerToServer,
} from "@/lib/famgateway";
import { getStoreOrder, fulfillStoreOrder } from "@/lib/orders";

export const dynamic = "force-dynamic";

/**
 * Health check & verification ping handler for gateway dashboards (e.g. FamGateway URL tester).
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/webhooks/famgateway",
    service: "EvolutionSMP FamGateway Webhook Receiver",
    timestamp: new Date().toISOString(),
  });
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const rawBody = await req.text();
  const signature =
    req.headers.get("x-famgateway-signature") ||
    req.headers.get("x-signature") ||
    req.headers.get("signature") ||
    null;

  // 1. Authenticate webhook using HMAC-SHA256 signature
  const isSignatureValid = verifyFamGatewayWebhookSignature(rawBody, signature);
  if (!isSignatureValid) {
    console.warn("[FamGateway Webhook] Rejected: Invalid or missing X-FamGateway-Signature from IP:", ip);
    return NextResponse.json(
      { error: "Invalid cryptographic signature." },
      { status: 401 }
    );
  }

  let payload: any = {};
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Handle nested or top-level payload data
  const data = payload.data || payload;
  const orderId = String(data.order_id || payload.order_id || "").trim();
  const event = String(payload.event || data.event || "payment.success").toLowerCase();
  const webhookStatus = String(data.status || payload.status || "").toLowerCase();
  const webhookUtr = String(data.utr || data.bank_ref_num || payload.utr || "").trim();
  const webhookAmount = Number(data.amount || payload.amount) || undefined;
  const senderUpi = data.sender_upi || payload.sender_upi || undefined;

  // Handle test events sent by dashboard webhook verification
  if (
    event === "test" ||
    event === "ping" ||
    event === "webhook.test" ||
    orderId.toLowerCase() === "test" ||
    orderId.toLowerCase().startsWith("test_")
  ) {
    return NextResponse.json({
      success: true,
      message: "FamGateway test webhook verified and accepted.",
      event,
      timestamp: new Date().toISOString(),
    });
  }

  if (!orderId) {
    return NextResponse.json({
      received: true,
      message: "Webhook acknowledged without order_id.",
    });
  }

  // 2. Locate stored order in Supabase
  const storedOrder = await getStoreOrder(orderId);
  if (!storedOrder) {
    console.warn(`[FamGateway Webhook] Stored order not found for identifier: ${orderId}`);
    // Return 200 OK so the gateway does not register a 404 or retry storm for mock/unknown events
    return NextResponse.json({
      received: true,
      message: `Order "${orderId}" not found in database. Event acknowledged.`,
    });
  }

  // 3. Strict Idempotency Check
  if (storedOrder.payment_status === "paid" && storedOrder.delivery_status === "delivered") {
    return NextResponse.json({
      success: true,
      message: "Order already verified and fulfilled.",
      order_id: storedOrder.order_id,
      utr: storedOrder.utr,
    });
  }

  // 4. Handle non-success states (failed, expired)
  if (webhookStatus === "failed" || webhookStatus === "expired" || webhookStatus === "cancelled") {
    await recordAuditLog({
      adminEmail: "famgateway-webhook@system",
      adminRole: "system",
      action: `FAMGATEWAY_ORDER_${webhookStatus.toUpperCase()}`,
      entityType: "store_order",
      entityId: storedOrder.order_id,
      details: {
        orderId: storedOrder.order_id,
        status: webhookStatus,
        reason: data.message || "Webhook reported failed payment",
      },
      ipAddress: ip,
    });

    return NextResponse.json({
      received: true,
      order_id: storedOrder.order_id,
      status: webhookStatus,
    });
  }

  // 5. Authoritative Server-to-Server Verification (Rule 8)
  let serverVerification;
  try {
    serverVerification = await verifyFamGatewayOrderServerToServer(orderId);
  } catch (err: any) {
    console.error(`[FamGateway Webhook] Server-to-server verify failed for ${orderId}:`, err);
    return NextResponse.json(
      { error: "Server-to-server payment verification failed." },
      { status: 502 }
    );
  }

  if (!serverVerification.verified) {
    console.warn(
      `[FamGateway Webhook] S2S verify returned not paid for ${orderId}: status=${serverVerification.status}`
    );
    return NextResponse.json(
      {
        error: "Payment could not be verified server-to-server.",
        currentStatus: serverVerification.status,
      },
      { status: 400 }
    );
  }

  // 6. Validate exact amount against stored order (Rule 9)
  const finalAmount = serverVerification.amount || webhookAmount;
  if (finalAmount && Math.abs(Number(storedOrder.amount) - finalAmount) > 1.0) {
    console.error(
      `[FamGateway Webhook] Amount mismatch! Stored: ₹${storedOrder.amount}, Verified: ₹${finalAmount}`
    );
    return NextResponse.json(
      { error: "Payment amount does not match stored order amount." },
      { status: 400 }
    );
  }

  const finalUtr = serverVerification.utr || webhookUtr || undefined;

  // 7. Fulfill order and record Minecraft perks (Rule 10 & 11)
  const fulfillment = await fulfillStoreOrder({
    orderId: storedOrder.order_id,
    utr: finalUtr,
    senderUpi: serverVerification.senderUpi || senderUpi,
    verifiedAmount: finalAmount,
    source: "webhook_hmac_verified",
  });

  if (!fulfillment.success) {
    return NextResponse.json(
      { error: fulfillment.error || "Failed to finalize order fulfillment." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    order_id: storedOrder.order_id,
    status: "paid",
    delivery_status: "delivered",
    utr: finalUtr,
    delivered_commands_count: storedOrder.delivery_commands?.length || 0,
  });
}
