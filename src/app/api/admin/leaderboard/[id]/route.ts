import { handleAdminDelete, handleAdminUpdate } from "@/lib/auth/crud-helpers";
import { formatLeaderboardScore, leaderboardPlayerSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return handleAdminUpdate(req, params.id, {
    table: "leaderboard_players",
    entityType: "leaderboard_players",
    actionName: "UPDATE_LEADERBOARD_PLAYER",
    schema: leaderboardPlayerSchema.partial(),
    transform: (parsed) => ({
      ...parsed,
      ...(parsed.category && parsed.score !== undefined && !parsed.formatted_score
        ? { formatted_score: formatLeaderboardScore(parsed.category, parsed.score) }
        : {}),
      synced_at: new Date().toISOString(),
    }),
  });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return handleAdminDelete(req, params.id, {
    table: "leaderboard_players",
    entityType: "leaderboard_players",
    actionName: "DELETE_LEADERBOARD_PLAYER",
  });
}
