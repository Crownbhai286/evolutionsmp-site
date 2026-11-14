"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Megaphone, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { HomepageSectionData, WebsiteSettingsData } from "@/lib/types";

interface SiteChromeProps {
  children: React.ReactNode;
  settings: WebsiteSettingsData;
  footerSection?: HomepageSectionData;
}

export default function SiteChrome({
  children,
  settings,
  footerSection,
}: SiteChromeProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <>
      {settings.announcementEnabled && settings.announcementText.trim() && (
        <div className="relative z-50 bg-gradient-to-r from-[#ff7a1f] via-[#ff8c2e] to-[#ff5500] text-white px-4 py-2 text-center text-xs sm:text-sm font-bold shadow-md">
          <div className="max-w-[1200px] mx-auto flex items-center justify-center gap-2 flex-wrap">
            <Megaphone className="h-3.5 w-3.5 shrink-0" />
            <span>{settings.announcementText}</span>
            {settings.announcementUrl?.trim() && (
              <Link
                href={settings.announcementUrl}
                className="inline-flex items-center gap-1 underline underline-offset-2 font-extrabold hover:opacity-90"
              >
                <span>View Details</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      )}

      <Navbar settings={settings} />

      <main className="relative z-10">{children}</main>

      <Footer settings={settings} footerSection={footerSection} />
    </>
  );
}
