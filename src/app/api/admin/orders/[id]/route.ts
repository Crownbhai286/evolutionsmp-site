import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth/admin";
import { recordAuditLog } from "@/lib/audit";
import { getRequestIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  delivery_status: z.enum(["pending", "delivered", "failed", "manual_review"]).optional(),
  status: z.enum(["pending", "paid", "failed", "expired", "cancelled"]).optional(),
  payment_status: z.enum(["unpaid", "paid", "failed", "expired"]).optional(),
  utr: z.string().trim().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminSession("admin");
  if (!guard.ok) return guard.response;

  const { data, error } = await guard.db
    .from("store_orders")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  return NextResponse.json({ order: data });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminSession("admin");
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.delivery_status === "delivered") {
    updateData.delivered_at = new Date().toISOString();
  }

  const { data, error } = await guard.db
    .from("store_orders")
    .update(updateData)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAuditLog({
    adminUserId: guard.admin.id,
    adminEmail: guard.admin.email,
    adminRole: guard.admin.role,
    action: "STORE_ORDER_UPDATE",
    entityType: "store_order",
    entityId: params.id,
    details: parsed.data,
    ipAddress: getRequestIp(req),
  });

  return NextResponse.json({ success: true, order: data });
}
