import React from "react";
import LeaderboardClient from "@/components/LeaderboardClient";
import { getPublicLeaderboard } from "@/lib/services/public-data";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const { boards, source, lastSyncedAt } = await getPublicLeaderboard();
  return <LeaderboardClient boards={boards} source={source} lastSyncedAt={lastSyncedAt} />;
}
