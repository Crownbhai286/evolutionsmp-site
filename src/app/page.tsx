import React from "react";
import HeroSection from "@/components/HeroSection";
import GameModesSection from "@/components/GameModesSection";
import GallerySection from "@/components/GallerySection";
import HowToJoinSection from "@/components/HowToJoinSection";
import LeaderboardPodium from "@/components/LeaderboardPodium";
import DiscordSection from "@/components/DiscordSection";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Survival Realms (#modes) */}
      <GameModesSection />

      {/* 3. Gallery (#gallery) */}
      <GallerySection />

      {/* 4. How to Join (#join) */}
      <HowToJoinSection />

      {/* 5. Hall of Fame (#leaderboards) */}
      <LeaderboardPodium />

      {/* 6. Discord Community (#discord) */}
      <DiscordSection />
    </div>
  );
}
