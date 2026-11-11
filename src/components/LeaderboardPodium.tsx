"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Trophy, Crown, Coins, Clock, Pickaxe } from "lucide-react";
import { LEADERBOARD_DATA } from "@/lib/data";
import { getPlayerBody, formatNumber } from "@/lib/utils";
import { ScrollReveal, StaggerReveal, StaggerItem } from "./ScrollReveal";

export default function LeaderboardPodium() {
  const [board, setBoard] = useState<"money" | "playtime" | "blocksMined">("money");

  const rows = LEADERBOARD_DATA[board] || [];
  // Playbex order: Rank 2 on left, Rank 1 in center (taller), Rank 3 on right
  const p1 = rows.find((r) => r.rank === 1) || rows[0];
  const p2 = rows.find((r) => r.rank === 2) || rows[1];
  const p3 = rows.find((r) => r.rank === 3) || rows[2];
  const podiumOrder = [p2, p1, p3];

  const unit = board === "money" ? "Money" : board === "playtime" ? "Playtime" : "Blocks Mined";

  return (
    <section id="leaderboards" className="py-20 px-5 relative">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <ScrollReveal direction="up" duration={0.65} className="text-center max-w-2xl mx-auto mb-10">
          <span className="kicker">Hall of Fame</span>
          <h2 className="font-head text-[clamp(32px,4.5vw,52px)] text-white tracking-wide uppercase mb-3">
            The Best of EvolutionSMP
          </h2>
          <p className="text-[#a3abd6] text-base leading-relaxed">
            Official survival leaderboards synced every 5 minutes directly from the network.
          </p>

          {/* Board switch pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setBoard("money")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                board === "money"
                  ? "bg-[#ff9a1f] text-[#0a0d22] shadow-md shadow-[#ff9a1f]/20"
                  : "bg-[#141a42] text-[#a3abd6] hover:text-white border border-white/[0.08]"
              }`}
            >
              <Coins className="h-4 w-4" />
              <span>TOP MONEY</span>
            </button>
            <button
              onClick={() => setBoard("playtime")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                board === "playtime"
                  ? "bg-[#ff9a1f] text-[#0a0d22] shadow-md shadow-[#ff9a1f]/20"
                  : "bg-[#141a42] text-[#a3abd6] hover:text-white border border-white/[0.08]"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>TOP PLAYTIME</span>
            </button>
            <button
              onClick={() => setBoard("blocksMined")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                board === "blocksMined"
                  ? "bg-[#ff9a1f] text-[#0a0d22] shadow-md shadow-[#ff9a1f]/20"
                  : "bg-[#141a42] text-[#a3abd6] hover:text-white border border-white/[0.08]"
              }`}
            >
              <Pickaxe className="h-4 w-4" />
              <span>TOP BLOCKS MINED</span>
            </button>
          </div>
        </ScrollReveal>

        {/* Playbex Exact Signature 3-Podium Layout (.hpodium) with Staggered Reveal */}
        <StaggerReveal key={board} staggerDelay={0.12} className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-5 items-end max-w-[900px] mx-auto pt-24 pb-8">
          {podiumOrder.map((player) => {
            if (!player) return null;
            const isRank1 = player.rank === 1;
            const isRank2 = player.rank === 2;

            return (
              <StaggerItem
                key={`${board}-${player.rank}`}
                distance={isRank1 ? 36 : 28}
                className={isRank1 ? "order-first md:order-none" : ""}
              >
                <div
                  className={`relative rounded-[20px] text-center border transition-all duration-300 hover:-translate-y-1 ${
                    isRank1
                      ? "pt-[210px] pb-6 px-5 border-[rgba(255,201,60,0.45)] bg-gradient-to-b from-[#3a3550] to-[#141a3c] shadow-2xl shadow-[#ffb02e]/10 -mt-10"
                      : isRank2
                      ? "pt-[170px] pb-6 px-5 border-[rgba(200,210,240,0.35)] bg-gradient-to-b from-[#26306a] to-[#141a3c]"
                      : "pt-[170px] pb-6 px-5 border-[rgba(205,127,50,0.35)] bg-gradient-to-b from-[#26306a] to-[#141a3c]"
                  }`}
                >
                  {/* Crown for Rank 1 */}
                  {isRank1 && (
                    <Crown className="absolute -top-14 left-1/2 -translate-x-1/2 h-10 w-10 text-[#fbbf24] drop-shadow-[0_4px_12px_rgba(251,191,36,0.5)] animate-bounce" />
                  )}

                  {/* Circular Rank Badge */}
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 rounded-full font-head flex items-center justify-center border-2 ${
                      isRank1
                        ? "-top-6 h-12 w-12 text-2xl bg-[#eab308] text-[#0b1030] border-[#fde047] shadow-lg shadow-[#eab308]/40"
                        : "-top-5 h-10 w-10 text-lg bg-[#232c6a] text-white border-[rgba(130,150,255,0.4)]"
                    }`}
                  >
                    {player.rank}
                  </div>

                  {/* Standing Player Body Skin Render */}
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

                  {/* Player Name */}
                  <b className="font-head text-2xl text-white block mb-1 tracking-wide">
                    {player.username}
                  </b>

                  {/* Score in gradient text */}
                  <div className="font-head text-2xl g">
                    {board === "money"
                      ? `$${formatNumber(player.score)}`
                      : board === "playtime"
                      ? `${formatNumber(player.score)} hrs`
                      : formatNumber(player.score)}
                  </div>

                  <small className="text-[#a3abd6] text-xs uppercase font-extrabold tracking-wider block mt-0.5">
                    {unit}
                  </small>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerReveal>

        {/* Playbex Button to Full Leaderboards */}
        <ScrollReveal direction="up" delay={0.15} duration={0.6} className="text-center mt-6">
          <Link href="/leaderboard" className="btn glass">
            <Trophy className="h-4 w-4 text-[#ffc23d]" />
            <span>View Full Leaderboards</span>
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
