import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function verifyApiKey(headerKey: string | null): boolean {
  const expected = process.env.MINECRAFT_SYNC_API_KEY?.trim();
  if (!expected || expected.includes("replace-with") || !headerKey) return false;
  const a = Buffer.from(headerKey, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Endpoint for Minecraft server or RCON sync plugin to poll paid store deliveries.
 * Requires header `x-sync-api-key: <MINECRAFT_SYNC_API_KEY>`.
 */
export async function GET(req: Request) {
  const rl = checkRateLimit(`mc-deliveries:${getRequestIp(req)}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });

  if (!verifyApiKey(req.headers.get("x-sync-api-key"))) {
    return NextResponse.json({ error: "Invalid or unconfigured MINECRAFT_SYNC_API_KEY." }, { status: 401 });
  }

  const db = createSupabaseAdminClient();
  if (!db) {
    return NextResponse.json({ error: "Database client unavailable." }, { status: 503 });
  }

  const { data, error } = await db
    .from("store_orders")
    .select("id, order_id, username, amount, currency, delivery_commands, delivery_status, payment_status, created_at")
    .eq("payment_status", "paid")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    deliveries: data ?? [],
  });
}

const ackSchema = z.object({
  order_id: z.string().trim().min(1),
  delivered: z.boolean(),
  error: z.string().optional(),
});

export async function POST(req: Request) {
  if (!verifyApiKey(req.headers.get("x-sync-api-key"))) {
    return NextResponse.json({ error: "Invalid or unconfigured MINECRAFT_SYNC_API_KEY." }, { status: 401 });
  }

  const db = createSupabaseAdminClient();
  if (!db) {
    return NextResponse.json({ error: "Database client unavailable." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = ackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { order_id, delivered, error: deliveryErr } = parsed.data;

  const updatePayload: Record<string, unknown> = {
    delivery_status: delivered ? "delivered" : "failed",
    updated_at: new Date().toISOString(),
  };

  if (delivered) {
    updatePayload.delivered_at = new Date().toISOString();
  } else if (deliveryErr) {
    updatePayload.delivery_error = deliveryErr;
  }

  const { data, error } = await db
    .from("store_orders")
    .update(updatePayload)
    .eq("order_id", order_id)
    .select("order_id, delivery_status, delivered_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, order: data });
}
