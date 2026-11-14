import React from "react";
import HeroSection from "@/components/HeroSection";
import GameModesSection from "@/components/GameModesSection";
import GallerySection from "@/components/GallerySection";
import HowToJoinSection from "@/components/HowToJoinSection";
import LeaderboardPodium from "@/components/LeaderboardPodium";
import DiscordSection from "@/components/DiscordSection";
import {
  getHomepageSections,
  getPublicLeaderboard,
  getPublicServerStats,
  getWebsiteSettings,
} from "@/lib/services/public-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, sections, leaderboardResult, serverStats] = await Promise.all([
    getWebsiteSettings(),
    getHomepageSections(),
    getPublicLeaderboard(),
    getPublicServerStats(),
  ]);

  const orderedSections = [...sections]
    .filter((s) => s.sectionKey !== "footer" && s.isEnabled !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const onlinePlayers = serverStats?.onlinePlayers || 1148;
  const serverOnline = serverStats ? serverStats.javaOnline || serverStats.bedrockOnline : true;

  return (
    <div className="flex flex-col">
      {orderedSections.map((section) => {
        switch (section.sectionKey) {
          case "hero":
            return (
              <HeroSection
                key={section.sectionKey}
                playerCount={onlinePlayers}
                online={serverOnline}
                settings={settings}
                section={section}
              />
            );
          case "modes":
            return (
              <GameModesSection
                key={section.sectionKey}
                section={section}
                onlinePlayers={onlinePlayers}
                online={serverOnline}
              />
            );
          case "gallery":
            return <GallerySection key={section.sectionKey} section={section} />;
          case "join":
            return (
              <HowToJoinSection
                key={section.sectionKey}
                settings={settings}
                section={section}
              />
            );
          case "leaderboards":
            return (
              <LeaderboardPodium
                key={section.sectionKey}
                boardData={leaderboardResult.boards}
                section={section}
              />
            );
          case "discord":
            return (
              <DiscordSection
                key={section.sectionKey}
                settings={settings}
                section={section}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
