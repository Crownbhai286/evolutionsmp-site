import { NextResponse } from "next/server";
import { handleAdminCreate, handleAdminList } from "@/lib/auth/crud-helpers";
import { formatLeaderboardScore, leaderboardPlayerSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleAdminList({
    table: "leaderboard_players",
    orderBy: "category",
    ascending: true,
    secondaryOrderBy: "rank_position",
  });
}

export async function POST(req: Request) {
  return handleAdminCreate(req, {
    table: "leaderboard_players",
    entityType: "leaderboard_players",
    actionName: "UPSERT_LEADERBOARD_PLAYER",
    schema: leaderboardPlayerSchema,
    transform: (parsed) => ({
      ...parsed,
      formatted_score:
        parsed.formatted_score && parsed.formatted_score.length > 0
          ? parsed.formatted_score
          : formatLeaderboardScore(parsed.category, parsed.score),
      synced_at: new Date().toISOString(),
    }),
  });
}
