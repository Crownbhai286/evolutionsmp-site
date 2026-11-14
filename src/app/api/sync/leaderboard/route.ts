import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { formatLeaderboardScore, leaderboardPlayerSchema } from "@/lib/validations";
import { revalidateAllPublicPaths } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

const syncPayloadSchema = z.object({
  statistics: z
    .object({
      total_registered_players: z.coerce.number().int().min(0).optional(),
      online_players: z.coerce.number().int().min(0).optional(),
      max_players: z.coerce.number().int().min(1).optional(),
      total_votes: z.coerce.number().int().min(0).optional(),
      java_online: z.boolean().optional(),
      bedrock_online: z.boolean().optional(),
    })
    .optional(),
  players: z.array(leaderboardPlayerSchema.omit({ data_source: true })).max(500).optional(),
});

function verifyApiKey(headerKey: string | null): boolean {
  const expected = process.env.MINECRAFT_SYNC_API_KEY?.trim();
  if (!expected || expected.includes("replace-with") || !headerKey) return false;
  const a = Buffer.from(headerKey, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Authenticated Minecraft Server -> Website Sync endpoint.
 * Send header `x-sync-api-key: <MINECRAFT_SYNC_API_KEY>` from your server plugin/cron.
 */
export async function POST(req: Request) {
  const rl = checkRateLimit(`mc-sync:${getRequestIp(req)}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  if (!verifyApiKey(req.headers.get("x-sync-api-key"))) {
    return NextResponse.json(
      { error: "Invalid or unconfigured MINECRAFT_SYNC_API_KEY." },
      { status: 401 }
    );
  }

  const adminDb = createSupabaseAdminClient();
  if (!adminDb) {
    return NextResponse.json(
      { error: "Supabase service role credentials are not configured." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = syncPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  if (parsed.data.statistics) {
    await adminDb.from("server_statistics").upsert(
      {
        key: "default",
        ...parsed.data.statistics,
        data_source: "minecraft_plugin",
        last_synced_at: now,
      },
      { onConflict: "key" }
    );
  }

  let syncedPlayers = 0;
  if (parsed.data.players && parsed.data.players.length > 0) {
    const rows = parsed.data.players.map((p) => ({
      ...p,
      formatted_score: p.formatted_score || formatLeaderboardScore(p.category, p.score),
      data_source: "minecraft_api" as const,
      synced_at: now,
    }));

    const { error } = await adminDb
      .from("leaderboard_players")
      .upsert(rows, { onConflict: "category,username" });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    syncedPlayers = rows.length;
  }

  revalidateAllPublicPaths();
  return NextResponse.json({
    ok: true,
    syncedAt: now,
    syncedPlayers,
  });
}
