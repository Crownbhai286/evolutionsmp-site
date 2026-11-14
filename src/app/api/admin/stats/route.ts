import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession, revalidateAllPublicPaths } from "@/lib/auth/admin";
import { recordAuditLog } from "@/lib/audit";
import { getRequestIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const statsPatchSchema = z.object({
  total_registered_players: z.coerce.number().int().min(0),
  online_players: z.coerce.number().int().min(0),
  max_players: z.coerce.number().int().min(1),
  total_votes: z.coerce.number().int().min(0),
  java_online: z.boolean(),
  bedrock_online: z.boolean(),
});

export async function PATCH(req: Request) {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = statsPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed." }, { status: 400 });
  }

  const { data, error } = await guard.db
    .from("server_statistics")
    .upsert(
      {
        key: "default",
        ...parsed.data,
        data_source: "manual",
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAuditLog({
    adminUserId: guard.admin.id,
    adminEmail: guard.admin.email,
    adminRole: guard.admin.role,
    action: "UPDATE_SERVER_STATISTICS",
    entityType: "server_statistics",
    entityId: "default",
    ipAddress: getRequestIp(req),
  });

  revalidateAllPublicPaths();
  return NextResponse.json({ stats: data });
}
