import { NextResponse } from "next/server";
import { requireAdminSession, revalidateAllPublicPaths } from "@/lib/auth/admin";
import { recordAuditLog } from "@/lib/audit";
import { getRequestIp } from "@/lib/rate-limit";
import { storeProductSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  const [productsRes, categoriesRes, coinConfigRes] = await Promise.all([
    guard.db.from("store_products").select("*").order("sort_order", { ascending: true }),
    guard.db.from("store_categories").select("*").order("sort_order", { ascending: true }),
    guard.db.from("coin_config").select("*").eq("key", "default").maybeSingle(),
  ]);

  if (productsRes.error) {
    return NextResponse.json({ error: productsRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    products: productsRes.data ?? [],
    categories: categoriesRes.data ?? [],
    coinConfig: coinConfigRes.data ?? null,
  });
}

export async function POST(req: Request) {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = storeProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: catRow } = await guard.db
    .from("store_categories")
    .select("id")
    .eq("slug", parsed.data.category_slug)
    .maybeSingle();

  const { data, error } = await guard.db
    .from("store_products")
    .insert({
      ...parsed.data,
      category_id: catRow?.id ?? null,
    })
    .select("*")
    .single();

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

  await recordAuditLog({
    adminUserId: guard.admin.id,
    adminEmail: guard.admin.email,
    adminRole: guard.admin.role,
    action: "CREATE_PRODUCT",
    entityType: "store_products",
    entityId: data.id,
    details: { name: data.name, slug: data.slug, price: data.price },
    ipAddress: getRequestIp(req),
  });

  revalidateAllPublicPaths();
  return NextResponse.json({ product: data }, { status: 201 });
}
