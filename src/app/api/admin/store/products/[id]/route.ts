import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession, revalidateAllPublicPaths } from "@/lib/auth/admin";
import { recordAuditLog } from "@/lib/audit";
import { getRequestIp } from "@/lib/rate-limit";
import { storeProductSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

const uuidSchema = z.string().uuid();

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  if (!uuidSchema.safeParse(params.id).success) {
    return NextResponse.json({ error: "Invalid product ID." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = storeProductSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  let categoryId: string | undefined;
  if (parsed.data.category_slug) {
    const { data: catRow } = await guard.db
      .from("store_categories")
      .select("id")
      .eq("slug", parsed.data.category_slug)
      .maybeSingle();
    if (catRow?.id) categoryId = catRow.id;
  }

  const { data, error } = await guard.db
    .from("store_products")
    .update({
      ...parsed.data,
      ...(categoryId ? { category_id: categoryId } : {}),
    })
    .eq("id", params.id)
    .select("*")
    .maybeSingle();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json(
      {
        error:
          error.code === "23505"
            ? "A store product with this slug already exists."
            : error.message,
      },
      { status }
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  await recordAuditLog({
    adminUserId: guard.admin.id,
    adminEmail: guard.admin.email,
    adminRole: guard.admin.role,
    action: "UPDATE_PRODUCT",
    entityType: "store_products",
    entityId: params.id,
    details: { name: data.name, price: data.price, is_enabled: data.is_enabled },
    ipAddress: getRequestIp(req),
  });

  revalidateAllPublicPaths();
  return NextResponse.json({ product: data });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  if (!uuidSchema.safeParse(params.id).success) {
    return NextResponse.json({ error: "Invalid product ID." }, { status: 400 });
  }

  const { data: existing } = await guard.db
    .from("store_products")
    .select("name, slug")
    .eq("id", params.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const { error } = await guard.db
    .from("store_products")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordAuditLog({
    adminUserId: guard.admin.id,
    adminEmail: guard.admin.email,
    adminRole: guard.admin.role,
    action: "DELETE_PRODUCT",
    entityType: "store_products",
    entityId: params.id,
    details: existing ?? {},
    ipAddress: getRequestIp(req),
  });

  revalidateAllPublicPaths();
  return NextResponse.json({ deleted: true });
}
