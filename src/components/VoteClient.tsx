"use client";

import React, { useState } from "react";
import { Vote, Gift, Trophy, ExternalLink, Copy, Check } from "lucide-react";
import type { VoteSite } from "@/lib/types";
import { copyToClipboard } from "@/lib/utils";
import { useToast } from "@/components/NotificationToast";

export default function VoteClient({ sites }: { sites: VoteSite[] }) {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const { showToast } = useToast();

  const handleCopyCommand = async (cmd: string) => {
    const ok = await copyToClipboard(cmd);
    if (ok) {
      setCopiedCmd(true);
      showToast("Command copied!", `Type ${cmd} in in-game chat to claim.`, "success");
      setTimeout(() => setCopiedCmd(false), 2000);
    }
  };

  return (
    <div className="pt-28 pb-24 px-5 max-w-[1200px] mx-auto min-h-screen">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="kicker">Support the Network</span>
        <h1 className="font-head text-[clamp(36px,5vw,56px)] text-white tracking-wide uppercase mb-3">
          Vote for Rewards
        </h1>
        <p className="text-[#a3abd6] text-sm sm:text-base leading-relaxed">
          Voting takes just 30 seconds and keeps EvolutionSMP at the top of the server rankings. In return,
          you will receive Vote Crate keys, in-game currency, and streak bonuses.
        </p>

        {/* Claim command pill */}
        <div className="mt-6 inline-flex items-center gap-3 p-2 rounded-2xl bg-[#141a42] border border-white/[0.08]">
          <span className="text-xs text-[#a3abd6] pl-2">Claim in-game:</span>
          <code className="text-xs font-mono font-bold text-[#ffc23d] bg-black/40 px-3 py-1 rounded-lg border border-white/[0.08]">
            /vote
          </code>
          <button
            onClick={() => handleCopyCommand("/vote")}
            className="p-1.5 rounded-lg bg-[#1b2254] hover:bg-[#232c6a] text-white text-xs transition-colors"
          >
            {copiedCmd ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Perks Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        <div className="rounded-[18px] p-6 bg-gradient-to-b from-[#1b2254] to-[#141a42] border border-[rgba(130,150,255,0.2)] text-center">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-[#ffb02e] to-[#ff3d5a] flex items-center justify-center text-white mx-auto mb-4 shadow-md">
            <Gift className="h-6 w-6" />
          </div>
          <h3 className="font-head text-xl text-white uppercase mb-1">
            {sites.length}x Daily Keys
          </h3>
          <p className="text-xs text-[#a3abd6] leading-relaxed">
            Vote on all {sites.length} portals every 24 hours to open the Vote Crate at spawn.
          </p>
        </div>

        <div className="rounded-[18px] p-6 bg-gradient-to-b from-[#1b2254] to-[#141a42] border border-[rgba(130,150,255,0.2)] text-center">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-[#ffb02e] to-[#ff3d5a] flex items-center justify-center text-white mx-auto mb-4 shadow-md">
            <Trophy className="h-6 w-6" />
          </div>
          <h3 className="font-head text-xl text-white uppercase mb-1">Top Voter of the Month</h3>
          <p className="text-xs text-[#a3abd6] leading-relaxed">
            The player with the most verified votes each month wins an{" "}
            <span className="text-[#ffc23d] font-bold" title="Elite Rank (14 Days)">
              Elite Rank for 14 days
            </span>
            .
          </p>
        </div>

        <div className="rounded-[18px] p-6 bg-gradient-to-b from-[#1b2254] to-[#141a42] border border-[rgba(130,150,255,0.2)] text-center">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-[#ffb02e] to-[#ff3d5a] flex items-center justify-center text-white mx-auto mb-4 shadow-md">
            <Vote className="h-6 w-6" />
          </div>
          <h3 className="font-head text-xl text-white uppercase mb-1">Streak Multipliers</h3>
          <p className="text-xs text-[#a3abd6] leading-relaxed">
            Multiply your coin and EXP payouts by maintaining consecutive voting streaks of 7 and 30 days.
          </p>
        </div>
      </div>

      {/* Voting Sites */}
      <div className="space-y-3">
        <h2 className="font-head text-2xl text-white uppercase tracking-wide mb-4">
          Voting Portals
        </h2>

        {sites.map((site, index) => (
          <div
            key={site.id}
            className="rounded-[18px] p-4 sm:p-5 bg-gradient-to-b from-[#1b2254] to-[#141a42] border border-[rgba(130,150,255,0.2)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-[#232c6a] flex items-center justify-center font-head text-base text-[#ff9a1f] shrink-0">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-white text-base">{site.name}</h3>
                  {site.cooldown && (
                    <span className="px-2 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono text-[#a3abd6]">
                      {site.cooldown}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#2fd47a] font-semibold mt-0.5">
                  Reward: {site.reward}
                </p>
              </div>
            </div>

            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn small text-xs"
            >
              <span>Vote Now</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
