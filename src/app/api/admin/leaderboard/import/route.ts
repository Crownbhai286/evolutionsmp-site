import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession, revalidateAllPublicPaths } from "@/lib/auth/admin";
import { recordAuditLog } from "@/lib/audit";
import { getRequestIp } from "@/lib/rate-limit";
import { formatLeaderboardScore, leaderboardPlayerSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

const importSchema = z.object({
  rows: z.array(leaderboardPlayerSchema).min(1).max(500),
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

  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "CSV/batch validation failed.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const upsertRows = parsed.data.rows.map((r) => ({
    ...r,
    formatted_score:
      r.formatted_score && r.formatted_score.length > 0
        ? r.formatted_score
        : formatLeaderboardScore(r.category, r.score),
    data_source: "csv_import" as const,
    synced_at: now,
  }));

  const { data, error } = await guard.db
    .from("leaderboard_players")
    .upsert(upsertRows, { onConflict: "category,username" })
    .select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordAuditLog({
    adminUserId: guard.admin.id,
    adminEmail: guard.admin.email,
    adminRole: guard.admin.role,
    action: "IMPORT_LEADERBOARD_CSV",
    entityType: "leaderboard_players",
    details: { count: upsertRows.length },
    ipAddress: getRequestIp(req),
  });

  revalidateAllPublicPaths();
  return NextResponse.json({ imported: data?.length ?? upsertRows.length });
}
