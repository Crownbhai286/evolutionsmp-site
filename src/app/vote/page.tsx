import React from "react";
import VoteClient from "@/components/VoteClient";
import { getPublicVoteSites } from "@/lib/services/public-data";

export const dynamic = "force-dynamic";

export default async function VotePage() {
  const sites = await getPublicVoteSites();
  return <VoteClient sites={sites} />;
}
