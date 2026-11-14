import { NextResponse } from "next/server";
import { requireAdminSession, revalidateAllPublicPaths } from "@/lib/auth/admin";
import { recordAuditLog } from "@/lib/audit";
import { getRequestIp } from "@/lib/rate-limit";
import { storeCategorySchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  const { data, error } = await guard.db
    .from("store_categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ categories: data ?? [] });
}

export async function PATCH(req: Request) {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = storeCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed." }, { status: 400 });
  }

  const { data, error } = await guard.db
    .from("store_categories")
    .upsert(parsed.data, { onConflict: "slug" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAuditLog({
    adminUserId: guard.admin.id,
    adminEmail: guard.admin.email,
    adminRole: guard.admin.role,
    action: "UPDATE_STORE_CATEGORY",
    entityType: "store_categories",
    entityId: data.id,
    ipAddress: getRequestIp(req),
  });

  revalidateAllPublicPaths();
  return NextResponse.json({ category: data });
}
