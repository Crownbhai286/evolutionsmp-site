import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession, revalidateAllPublicPaths } from "@/lib/auth/admin";
import { recordAuditLog } from "@/lib/audit";
import { getRequestIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  if (!z.string().uuid().safeParse(params.id).success) {
    return NextResponse.json({ error: "Invalid product ID." }, { status: 400 });
  }

  const { data: source, error: fetchErr } = await guard.db
    .from("store_products")
    .select("*")
    .eq("id", params.id)
    .single();

  if (fetchErr || !source) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const suffix = Math.random().toString(36).slice(2, 6);
  const newSlug = `${source.slug}-copy-${suffix}`;

  const { data: copy, error: insertErr } = await guard.db
    .from("store_products")
    .insert({
      slug: newSlug,
      category_id: source.category_id,
      category_slug: source.category_slug,
      name: `${source.name} (Copy)`,
      description: source.description,
      price: source.price,
      original_price: source.original_price,
      accent_color: source.accent_color,
      badge: source.badge,
      image_url: source.image_url,
      icon_name: source.icon_name,
      perks: source.perks,
      popular: false,
      featured: false,
      is_enabled: false,
      sort_order: (source.sort_order ?? 0) + 1,
      coin_amount: source.coin_amount,
      is_custom_coin: source.is_custom_coin,
      bonus_percent: source.bonus_percent,
      delivery_command: source.delivery_command,
      tebex_package_id: source.tebex_package_id,
      checkout_url: source.checkout_url,
    })
    .select("*")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  await recordAuditLog({
    adminUserId: guard.admin.id,
    adminEmail: guard.admin.email,
    adminRole: guard.admin.role,
    action: "DUPLICATE_PRODUCT",
    entityType: "store_products",
    entityId: copy.id,
    details: { sourceId: params.id, newSlug },
    ipAddress: getRequestIp(req),
  });

  revalidateAllPublicPaths();
  return NextResponse.json({ product: copy }, { status: 201 });
}
