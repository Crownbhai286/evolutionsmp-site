"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Coins,
  Sparkles,
  ShieldCheck,
  Gift,
  Users,
  Compass,
  ShoppingCart,
  CheckCircle2,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { ScrollReveal, StaggerReveal, StaggerItem } from "./ScrollReveal";
import type { HomepageSectionData } from "@/lib/types";

interface PillarItem {
  id: string;
  title: string;
  tagline: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  tags: string[];
  accentColor: string;
}

interface GameModesSectionProps {
  section?: HomepageSectionData;
  onlinePlayers?: number;
  online?: boolean;
}

export default function GameModesSection({
  section,
  onlinePlayers = 1148,
  online = true,
}: GameModesSectionProps = {}) {
  const kicker = section?.kicker || "Pure Minecraft Experience";
  const title = section?.title || "Survival SMP";
  const subtitle =
    section?.subtitle ||
    "EvolutionSMP is dedicated exclusively to delivering an authentic, high-performance Survival SMP. Claim your land, master the player economy, forge custom enchantments, and build with an active community.";
  const bannerUrl =
    typeof section?.content?.bannerUrl === "string" && section.content.bannerUrl
      ? section.content.bannerUrl
      : "/images/survival-showcase-v2.jpg";
  const versionLabel =
    typeof section?.content?.versionLabel === "string" && section.content.versionLabel
      ? section.content.versionLabel
      : "1.20 - 1.21.x Seamless Crossplay (Java & Bedrock)";
  const showcaseTitle =
    typeof section?.content?.showcaseTitle === "string" && section.content.showcaseTitle
      ? section.content.showcaseTitle
      : "Evolution Survival SMP";
  const showcaseDescription =
    typeof section?.content?.showcaseDescription === "string" && section.content.showcaseDescription
      ? section.content.showcaseDescription
      : "Our flagship survival realm engineered for peak stability, balanced longevity, and fair gameplay. Establish safe land claims, build massive towns with your team, participate in a player-driven chest shop economy, conquer seasonal dungeon catacombs, and unlock mythic vote crates.";
  const highlights =
    Array.isArray(section?.content?.highlights) && section.content.highlights.length > 0
      ? section.content.highlights.map((item) => String(item))
      : [
          "Player-Run Chest Shops",
          "Grief-Free Land Claims",
          "45+ Custom Enchants",
          "Seasonal Dungeon Bosses",
          "Daily Free Vote Crates",
          "Java & Bedrock Crossplay",
        ];
  const pillars: PillarItem[] = [
    {
      id: "economy",
      title: "Player Economy",
      tagline: "Player-Driven Markets",
      desc: "Buy, sell, and trade in a thriving player-run marketplace. Set up your own chest shops at player warps, trade on the Global Auction House, and rise through the wealth leaderboards.",
      icon: Coins,
      tags: ["Chest Shops", "Auction House", "Jobs System", "Coin Trade"],
      accentColor: "#ff9a1f",
    },
    {
      id: "custom-features",
      title: "Custom Features",
      tagline: "Deep Progression",
      desc: "Over 45 balanced custom enchantments, celestial world bosses, seasonal dungeon catacombs, and rare artifacts tailored for deep survival without pay-to-win.",
      icon: Sparkles,
      tags: ["45+ Enchants", "Dungeon Catacombs", "World Bosses", "Artifacts"],
      accentColor: "#3aa0ff",
    },
    {
      id: "teams",
      title: "Teams & Land Claims",
      tagline: "100% Grief-Free",
      desc: "Protect your builds with grief-free land claiming. Create teams, manage trust permissions, share player vaults, and construct massive towns in complete safety.",
      icon: ShieldCheck,
      tags: ["Land Claims", "Team Trust", "Sub-Divisions", "Shared Vaults"],
      accentColor: "#2fd47a",
    },
    {
      id: "crates",
      title: "Crates & Rewards",
      tagline: "Daily Progression",
      desc: "Vote daily for free server keys, complete daily survival quests, and open Mythic Crates for cosmetics, particle auras, pets, and valuable progression items.",
      icon: Gift,
      tags: ["Daily Vote Keys", "Mythic Crates", "Cosmetic Auras", "Quest Rewards"],
      accentColor: "#a855f7",
    },
    {
      id: "community",
      title: "Welcoming Community",
      tagline: "Active & Friendly",
      desc: "Join an engaged community of survival enthusiasts. Enjoy weekly build showcases, active voice chats, seasonal events, and 24/7 dedicated staff support.",
      icon: Users,
      tags: ["Discord Events", "Build Contests", "24/7 Support", "Crossplay"],
      accentColor: "#ff3d5a",
    },
  ];

  return (
    <section id="modes" className="py-20 px-5 relative overflow-hidden">
      <div className="max-w-[1200px] mx-auto">
        {/* Section Header */}
        <ScrollReveal direction="up" duration={0.65} className="text-center max-w-2xl mx-auto mb-12">
          <span className="kicker">{kicker}</span>
          <h2 className="font-head text-[clamp(32px,4.5vw,52px)] text-white tracking-wide uppercase mb-3">
            {title}
          </h2>
          <p className="text-[#a3abd6] text-base leading-relaxed">
            {subtitle}
          </p>
        </ScrollReveal>

        {/* Flagship Survival Showcase Card */}
        <ScrollReveal direction="scale" delay={0.08} duration={0.7} className="mb-10">
          <div className="relative rounded-[28px] overflow-hidden border border-[rgba(130,150,255,0.24)] p-8 sm:p-12 isolate transition-all duration-300 hover:border-[#ff9a1f]/60 hover:shadow-2xl hover:shadow-[#ff9a1f]/10">
            {/* Background cover image with hover scale */}
            <div
              className="absolute inset-0 -z-10 bg-cover bg-center transition-transform duration-700 hover:scale-105"
              style={{
                backgroundImage: `url('${bannerUrl}')`,
              }}
            />

            {/* Dark vignette overlay */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0a0d22] via-[#0a0d22]/90 to-[rgba(10,13,34,0.45)]" />

            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-[#0a0d22]/85 backdrop-blur-md border border-[rgba(130,150,255,0.24)]">
                <span className={`live-dot ${online ? "on" : ""}`} />
                <span className="text-[#2fd47a]">
                  {online ? "Online" : "Maintenance"} &bull; {formatNumber(onlinePlayers)} Players Active
                </span>
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-[#0a0d22]/85 backdrop-blur-md border border-[rgba(130,150,255,0.24)] text-[#a3abd6]">
                <span>{versionLabel}</span>
              </div>
            </div>

            {/* Main Info */}
            <div className="max-w-3xl">
              <h3 className="font-head text-[clamp(28px,3.8vw,44px)] text-white tracking-wide uppercase leading-tight mb-4">
                {showcaseTitle}
              </h3>

              <p className="text-base text-[#d1d7f0] leading-relaxed mb-6 font-normal">
                {showcaseDescription}
              </p>

              {/* Micro Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-8 text-xs font-bold text-white">
                {highlights.map((highlight) => (
                  <div
                    key={highlight}
                    className="flex items-center gap-2 bg-white/[0.06] backdrop-blur-sm px-3.5 py-2 rounded-xl border border-white/[0.08]"
                  >
                    <CheckCircle2 className="h-4 w-4 text-[#ff9a1f] shrink-0" />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href="#join"
                  className="btn primary"
                >
                  <Compass className="h-4 w-4" />
                  <span>How to Join Survival</span>
                  <ArrowRight className="h-4 w-4" />
                </a>

                <Link
                  href="/store"
                  className="btn glass"
                >
                  <ShoppingCart className="h-4 w-4 text-[#ff9a1f]" />
                  <span>Visit Survival Store</span>
                </Link>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* 5 Survival Pillars: Top Row (3 Cards with Progressive Reveal) */}
        <StaggerReveal staggerDelay={0.08} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {pillars.slice(0, 3).map((pillar) => {
            const Icon = pillar.icon;
            return (
              <StaggerItem key={pillar.id} className="h-full">
                <div className="group relative rounded-[24px] p-7 bg-gradient-to-b from-[#1b2254]/80 to-[#141a42]/90 border border-[rgba(130,150,255,0.2)] hover:border-[#ff9a1f]/60 hover:shadow-xl hover:shadow-[#ff9a1f]/10 transition-all duration-300 flex flex-col justify-between h-full hover:-translate-y-1">
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div
                        className="h-12 w-12 rounded-2xl flex items-center justify-center border transition-all duration-300 group-hover:scale-105"
                        style={{
                          backgroundColor: `${pillar.accentColor}18`,
                          borderColor: `${pillar.accentColor}40`,
                          color: pillar.accentColor,
                        }}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#a3abd6] bg-[#0a0d22]/60 px-3 py-1 rounded-full border border-white/[0.06]">
                        {pillar.tagline}
                      </span>
                    </div>

                    <h4 className="font-head text-2xl text-white tracking-wide uppercase mb-2">
                      {pillar.title}
                    </h4>

                    <p className="text-sm text-[#a3abd6] leading-relaxed mb-5">
                      {pillar.desc}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.06]">
                    {pillar.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#d1d7f0] bg-white/[0.06]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerReveal>

        {/* 5 Survival Pillars: Bottom Row (2 Wide Cards with Progressive Reveal) */}
        <StaggerReveal staggerDelay={0.08} delayChildren={0.1} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pillars.slice(3, 5).map((pillar) => {
            const Icon = pillar.icon;
            return (
              <StaggerItem key={pillar.id} className="h-full">
                <div className="group relative rounded-[24px] p-7 bg-gradient-to-b from-[#1b2254]/80 to-[#141a42]/90 border border-[rgba(130,150,255,0.2)] hover:border-[#ff9a1f]/60 hover:shadow-xl hover:shadow-[#ff9a1f]/10 transition-all duration-300 flex flex-col justify-between h-full hover:-translate-y-1">
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div
                        className="h-12 w-12 rounded-2xl flex items-center justify-center border transition-all duration-300 group-hover:scale-105"
                        style={{
                          backgroundColor: `${pillar.accentColor}18`,
                          borderColor: `${pillar.accentColor}40`,
                          color: pillar.accentColor,
                        }}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#a3abd6] bg-[#0a0d22]/60 px-3 py-1 rounded-full border border-white/[0.06]">
                        {pillar.tagline}
                      </span>
                    </div>

                    <h4 className="font-head text-2xl text-white tracking-wide uppercase mb-2">
                      {pillar.title}
                    </h4>

                    <p className="text-sm text-[#a3abd6] leading-relaxed mb-5">
                      {pillar.desc}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.06]">
                    {pillar.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#d1d7f0] bg-white/[0.06]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerReveal>
      </div>
    </section>
  );
}
