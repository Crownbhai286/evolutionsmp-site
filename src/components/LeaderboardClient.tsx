"use client";

import React, { useState } from "react";
import { Search, Clock, Coins, Pickaxe, Crown, Database } from "lucide-react";
import type { LeaderboardPlayer } from "@/lib/types";
import { getPlayerBody, getPlayerAvatar, formatNumber } from "@/lib/utils";

export default function LeaderboardClient({
  boards,
  source,
  lastSyncedAt,
}: {
  boards: Record<"money" | "playtime" | "blocksMined", LeaderboardPlayer[]>;
  source: "database_manual" | "database_api" | "fallback_seed";
  lastSyncedAt: string | null;
}) {
  const [activeTab, setActiveTab] = useState<"money" | "playtime" | "blocksMined">("money");
  const [search, setSearch] = useState("");

  const allPlayers = boards[activeTab] || [];
  const filtered = allPlayers.filter(
    (p) =>
      p.username.toLowerCase().includes(search.toLowerCase()) ||
      (p.guild && p.guild.toLowerCase().includes(search.toLowerCase()))
  );

  const p1 = allPlayers.find((p) => p.rank === 1);
  const p2 = allPlayers.find((p) => p.rank === 2);
  const p3 = allPlayers.find((p) => p.rank === 3);
  const podium = [p2, p1, p3].filter(Boolean);

  const rest = filtered.filter((p) => p.rank > 3);
  const unit = activeTab === "money" ? "Money" : activeTab === "playtime" ? "Playtime" : "Blocks Mined";

  const sourceLabel =
    source === "database_api"
      ? "Synced via Minecraft Server API"
      : source === "database_manual"
      ? "Managed via EvolutionSMP Database"
      : "Default Season Snapshot";

  return (
    <div className="pt-28 pb-24 px-5 max-w-[1200px] mx-auto min-h-screen">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="kicker">Hall of Fame</span>
        <h1 className="font-head text-[clamp(36px,5vw,56px)] text-white tracking-wide uppercase mb-3">
          Leaderboard
        </h1>
        <p className="text-[#a3abd6] text-sm sm:text-base leading-relaxed">
          The top-ranked survival players of the season on EvolutionSMP.
        </p>

        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141a42] border border-white/[0.08] text-[11px] font-mono text-[#a3abd6]">
          <Database className="h-3.5 w-3.5 text-[#3aa0ff]" />
          <span>{sourceLabel}</span>
          {lastSyncedAt && (
            <span className="text-[#6f78a8]">
              &bull; {new Date(lastSyncedAt).toLocaleString()}
            </span>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setActiveTab("money")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${
              activeTab === "money"
                ? "bg-[#ff9a1f] text-[#0a0d22] shadow-md shadow-[#ff9a1f]/20"
                : "bg-[#141a42] text-[#a3abd6] hover:text-white border border-white/[0.08]"
            }`}
          >
            <Coins className="h-4 w-4" />
            <span>TOP MONEY</span>
          </button>

          <button
            onClick={() => setActiveTab("playtime")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${
              activeTab === "playtime"
                ? "bg-[#ff9a1f] text-[#0a0d22] shadow-md shadow-[#ff9a1f]/20"
                : "bg-[#141a42] text-[#a3abd6] hover:text-white border border-white/[0.08]"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>TOP PLAYTIME</span>
          </button>

          <button
            onClick={() => setActiveTab("blocksMined")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${
              activeTab === "blocksMined"
                ? "bg-[#ff9a1f] text-[#0a0d22] shadow-md shadow-[#ff9a1f]/20"
                : "bg-[#141a42] text-[#a3abd6] hover:text-white border border-white/[0.08]"
            }`}
          >
            <Pickaxe className="h-4 w-4" />
            <span>TOP BLOCKS MINED</span>
          </button>
        </div>

        {/* Search */}
        <div className="mt-6 max-w-md mx-auto relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a3abd6]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by player or clan..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141a42] border border-white/[0.08] text-white placeholder-slate-400 text-xs focus:outline-none focus:border-[#ff9a1f]"
          />
        </div>
      </div>

      {/* Podium Top 3 */}
      {podium.length > 0 && !search && (
        <div key={activeTab} className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-5 items-end max-w-[900px] mx-auto pt-24 pb-8 mb-10">
          {podium.map((player) => {
            if (!player) return null;
            const isRank1 = player.rank === 1;
            const isRank2 = player.rank === 2;

            return (
              <div
                key={`${activeTab}-${player.rank}`}
                className={`relative rounded-[20px] text-center border transition-all ${
                  isRank1
                    ? "pt-[210px] pb-6 px-5 border-[rgba(255,201,60,0.45)] bg-gradient-to-b from-[#3a3550] to-[#141a3c] shadow-2xl shadow-[#ffb02e]/10 order-first md:order-none -mt-10"
                    : isRank2
                    ? "pt-[170px] pb-6 px-5 border-[rgba(200,210,240,0.35)] bg-gradient-to-b from-[#26306a] to-[#141a3c]"
                    : "pt-[170px] pb-6 px-5 border-[rgba(205,127,50,0.35)] bg-gradient-to-b from-[#26306a] to-[#141a3c]"
                }`}
              >
                {isRank1 && (
                  <Crown className="absolute -top-14 left-1/2 -translate-x-1/2 h-10 w-10 text-[#fbbf24] drop-shadow-[0_4px_12px_rgba(251,191,36,0.5)] animate-bounce" />
                )}

                <div
                  className={`absolute left-1/2 -translate-x-1/2 rounded-full font-head flex items-center justify-center border-2 ${
                    isRank1
                      ? "-top-6 h-12 w-12 text-2xl bg-[#eab308] text-[#0b1030] border-[#fde047] shadow-lg shadow-[#eab308]/40"
                      : "-top-5 h-10 w-10 text-lg bg-[#232c6a] text-white border-[rgba(130,150,255,0.4)]"
                  }`}
                >
                  {player.rank}
                </div>

                <div
                  className={`absolute left-1/2 -translate-x-1/2 ${
                    isRank1 ? "bottom-[130px] w-40 h-[240px]" : "bottom-[120px] w-36 h-[210px]"
                  }`}
                >
                  <img
                    src={getPlayerBody(player.username)}
                    alt={player.username}
                    className="w-full h-full object-contain filter drop-shadow-[0_15px_25px_rgba(0,0,0,0.7)] image-rendering-pixelated"
                    loading="lazy"
                  />
                </div>

                <b className="font-head text-2xl text-white block mb-1 tracking-wide">
                  {player.username}
                </b>

                <div className="font-head text-2xl g">
                  {activeTab === "money"
                    ? `$${formatNumber(player.score)}`
                    : activeTab === "playtime"
                    ? `${formatNumber(player.score)} hrs`
                    : formatNumber(player.score)}
                </div>

                <small className="text-[#a3abd6] text-xs uppercase font-extrabold tracking-wider block mt-0.5">
                  {unit}
                </small>
              </div>
            );
          })}
        </div>
      )}

      {/* Ranks Table */}
      <div className="rounded-[18px] bg-gradient-to-b from-[#1b2254] to-[#141a42] border border-[rgba(130,150,255,0.2)] overflow-hidden shadow-xl">
        <div className="px-6 py-4 bg-[#0f1433] border-b border-white/[0.08] flex items-center justify-between text-xs font-head uppercase tracking-wider text-[#a3abd6]">
          <div className="flex items-center gap-6">
            <span>Rank</span>
            <span>Player</span>
          </div>
          <div className="flex items-center gap-8">
            {activeTab !== "playtime" && (
              <span className="hidden sm:inline-block">Playtime</span>
            )}
            <span>{activeTab === "money" ? "Balance" : activeTab === "playtime" ? "Playtime" : "Blocks Mined"}</span>
          </div>
        </div>

        <div className="divide-y divide-white/[0.08]">
          {(search ? filtered : rest).map((player) => (
            <div
              key={`${activeTab}-${player.rank}-${player.username}`}
              className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="h-7 w-7 rounded-lg bg-[#232c6a] flex items-center justify-center font-head text-xs text-white">
                  #{player.rank}
                </span>
                <img
                  src={getPlayerAvatar(player.username, 36)}
                  alt={player.username}
                  className="h-8 w-8 rounded-lg image-rendering-pixelated bg-[#141a42]"
                />
                <div>
                  <span className="font-bold text-white text-sm">{player.username}</span>
                  {player.guild && (
                    <span className="text-xs text-[#a3abd6] ml-2 font-mono">[{player.guild}]</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-8">
                {activeTab !== "playtime" && player.playtime && (
                  <span className="hidden sm:inline-block text-xs font-mono text-[#a3abd6]">
                    {player.playtime}
                  </span>
                )}
                <span className="font-head text-base g">
                  {activeTab === "money"
                    ? `$${formatNumber(player.score)}`
                    : activeTab === "playtime"
                    ? `${formatNumber(player.score)} hrs`
                    : `${formatNumber(player.score)} Blocks`}
                </span>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-[#a3abd6]">
              No players found matching &ldquo;{search}&rdquo;.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
