import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession, revalidateAllPublicPaths } from "@/lib/auth/admin";
import { recordAuditLog } from "@/lib/audit";
import { getRequestIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const reorderSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().uuid(),
        sort_order: z.coerce.number().int().min(0),
        rule_number: z.string().trim().min(1).max(20).optional(),
      })
    )
    .min(1),
});

export async function POST(req: Request) {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed." }, { status: 400 });
  }

  for (const item of parsed.data.updates) {
    const patch: Record<string, unknown> = { sort_order: item.sort_order };
    if (item.rule_number) patch.rule_number = item.rule_number;
    const { error } = await guard.db
      .from("server_rules")
      .update(patch)
      .eq("id", item.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  await recordAuditLog({
    adminUserId: guard.admin.id,
    adminEmail: guard.admin.email,
    adminRole: guard.admin.role,
    action: "REORDER_RULES",
    entityType: "server_rules",
    details: { count: parsed.data.updates.length },
    ipAddress: getRequestIp(req),
  });

  revalidateAllPublicPaths();
  return NextResponse.json({ ok: true });
}
