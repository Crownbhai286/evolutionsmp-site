import { NextResponse } from "next/server";
import { requireAdminSession, revalidateAllPublicPaths } from "@/lib/auth/admin";
import { recordAuditLog } from "@/lib/audit";
import { getRequestIp } from "@/lib/rate-limit";
import { coinConfigSchema } from "@/lib/validations";
import { DEFAULT_COIN_CONFIG } from "@/lib/services/public-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  const { data, error } = await guard.db
    .from("coin_config")
    .select("*")
    .eq("key", "default")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    coinConfig: data ?? {
      min_custom_coins: DEFAULT_COIN_CONFIG.minCustomCoins,
      max_custom_coins: DEFAULT_COIN_CONFIG.maxCustomCoins,
      base_rate_per_coin: DEFAULT_COIN_CONFIG.baseRatePerCoin,
      discount_tiers: DEFAULT_COIN_CONFIG.discountTiers,
      delivery_command_template: DEFAULT_COIN_CONFIG.deliveryCommandTemplate,
      tebex_package_id: DEFAULT_COIN_CONFIG.tebexPackageId,
    },
  });
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

  const parsed = coinConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error } = await guard.db
    .from("coin_config")
    .upsert({ key: "default", ...parsed.data }, { onConflict: "key" })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordAuditLog({
    adminUserId: guard.admin.id,
    adminEmail: guard.admin.email,
    adminRole: guard.admin.role,
    action: "UPDATE_COIN_CONFIG",
    entityType: "coin_config",
    entityId: "default",
    ipAddress: getRequestIp(req),
  });

  revalidateAllPublicPaths();
  return NextResponse.json({ coinConfig: data });
}
