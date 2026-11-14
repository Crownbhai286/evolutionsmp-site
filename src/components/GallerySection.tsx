"use client";

import React, { useState } from "react";
import { X, ZoomIn } from "lucide-react";
import ProgressiveImage from "./ProgressiveImage";
import { ScrollReveal, StaggerReveal, StaggerItem } from "./ScrollReveal";
import type { HomepageSectionData } from "@/lib/types";

interface GalleryItem {
  id: string;
  img: string;
  caption: string;
  desc?: string;
}

const DEFAULT_GALLERY_ITEMS: GalleryItem[] = [
  {
    id: "spawn",
    img: "/images/survival-spawn-hub-v2.jpg",
    caption: "Main EvolutionSMP Survival Spawn with community trading hubs",
  },
  {
    id: "nether",
    img: "/images/survival-claims-towns-v2.jpg",
    caption: "Survival wilderness with protected player land claims & towns",
  },
  {
    id: "arena",
    img: "/images/survival-community-events.jpg",
    caption: "Community colosseum for player events & seasonal gatherings",
  },
  {
    id: "dungeons",
    img: "/images/survival-dungeons.jpg",
    caption: "Ancient survival dungeons with custom bosses and rare loot",
  },
  {
    id: "world",
    img: "/images/survival-world-terrain.jpg",
    caption: "Custom World Terrain Generation",
    desc: "Unique landscapes, natural biomes, and immersive survival exploration.",
  },
];

export default function GallerySection({ section }: { section?: HomepageSectionData } = {}) {
  const [activeZoom, setActiveZoom] = useState<GalleryItem | null>(null);
  const kicker = section?.kicker || "Gallery";
  const title = section?.title || "A Glimpse of the World";
  const subtitle =
    section?.subtitle ||
    "Explore authentic screenshots captured directly inside the Evolution Survival SMP realm.";

  const rawItems = Array.isArray(section?.content?.items)
    ? (section.content.items as Record<string, unknown>[])
    : [];
  const galleryItems: GalleryItem[] =
    rawItems.length > 0
      ? rawItems
          .map((item, idx) => ({
            id: String(item.id || `gallery-${idx + 1}`),
            img: String(item.img || ""),
            caption: String(item.caption || "EvolutionSMP Screenshot"),
            desc: typeof item.desc === "string" && item.desc.trim() ? item.desc : undefined,
          }))
          .filter((item) => Boolean(item.img))
      : DEFAULT_GALLERY_ITEMS;

  return (
    <section id="gallery" className="py-20 px-5 relative">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <ScrollReveal direction="up" duration={0.65} className="text-center max-w-2xl mx-auto mb-14">
          <span className="kicker">{kicker}</span>
          <h2 className="font-head text-[clamp(32px,4.5vw,52px)] text-white tracking-wide uppercase mb-3">
            {title}
          </h2>
          <p className="text-[#a3abd6] text-base leading-relaxed">
            {subtitle}
          </p>
        </ScrollReveal>

        {/* Playbex Dynamic 4-Column Asymmetric Gallery Grid with Progressive Blur-to-Sharp Reveal */}
        <StaggerReveal staggerDelay={0.08} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 auto-rows-[210px]">
          {galleryItems.map((item, index) => {
            const isFeatured = index === 0;
            return (
              <StaggerItem
                key={item.id}
                className={isFeatured ? "sm:col-span-2 sm:row-span-2 min-h-[360px]" : "min-h-[210px]"}
              >
                <figure
                  onClick={() => setActiveZoom(item)}
                  className="group relative h-full w-full rounded-[18px] overflow-hidden border border-white/[0.08] cursor-zoom-in transition-all duration-300 hover:border-[#ff9a1f]/60 hover:shadow-xl hover:shadow-[#ff9a1f]/10"
                >
                  <ProgressiveImage
                    src={item.img}
                    alt={item.caption}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d22]/90 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

                  <figcaption className="absolute bottom-0 left-0 right-0 p-4 text-xs sm:text-sm font-bold text-white flex items-center justify-between">
                    <div>
                      <span>{item.caption}</span>
                      {item.desc && (
                        <p className="text-[11px] font-normal text-[#c7ccf0] mt-0.5 leading-snug line-clamp-1">
                          {item.desc}
                        </p>
                      )}
                    </div>
                    <ZoomIn className="h-4 w-4 text-[#ff9a1f] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                  </figcaption>
                </figure>
              </StaggerItem>
            );
          })}
        </StaggerReveal>
      </div>

      {/* Playbex Lightbox Zoom Modal */}
      {activeZoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer animate-fadeIn"
          onClick={() => setActiveZoom(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden bg-[#0f1433] border border-[rgba(130,150,255,0.3)] shadow-2xl p-2 cursor-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveZoom(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="relative w-full h-[65vh] rounded-xl overflow-hidden">
              <ProgressiveImage
                src={activeZoom.img}
                alt={activeZoom.caption}
                fill
                className="object-cover"
                sizes="(max-width: 1200px) 100vw, 1200px"
              />
            </div>
            <div className="p-3 text-center">
              <p className="text-sm font-bold text-white">{activeZoom.caption}</p>
              {activeZoom.desc && (
                <p className="text-xs text-[#a3abd6] mt-1">{activeZoom.desc}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
