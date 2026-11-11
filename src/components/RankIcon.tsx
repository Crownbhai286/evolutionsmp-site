"use client";

import React, { useEffect, useState, useRef } from "react";

interface RankIconProps {
  name: string;
  category?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const RANK_IMAGE_MAP: Record<string, string> = {
  vip: "/ranks/vip.jpg",
  mvp: "/ranks/mvp.jpg",
  titan: "/ranks/titan.jpg",
  elite: "/ranks/elite.jpg",
  master: "/ranks/master.jpg",
  supreme: "/ranks/supreme.jpg",
  evolution: "/ranks/evolution.jpg",
  keys: "/ranks/keys.jpg",
  bundle: "/ranks/bundle.jpg",
  coins: "/ranks/coins.jpg",
  "custom-coins": "/ranks/custom-coins.jpg",
};

export function getRankKey(name: string, category?: string): string {
  const n = name.toLowerCase();
  if (category === "COINS" || n.includes("custom coin") || n.includes("custom-coin")) {
    if (n.includes("custom")) return "custom-coins";
    return "coins";
  }
  if (n.includes("coin")) return "coins";
  if (n.includes("vip")) return "vip";
  if (n.includes("mvp")) return "mvp";
  if (n.includes("titan")) return "titan";
  if (n.includes("elite")) return "elite";
  if (n.includes("master")) return "master";
  if (n.includes("supreme")) return "supreme";
  if (n.includes("evolution") || n.includes("evo")) return "evolution";
  if (n.includes("key")) return "keys";
  if (n.includes("bundle") || n.includes("pack") || n.includes("starter") || n.includes("ascendant")) return "bundle";
  return "coins";
}

export default function RankIcon({ name, category, className = "", size = "md" }: RankIconProps) {
  const key = getRankKey(name, category);
  const rawSrc = RANK_IMAGE_MAP[key] || "/ranks/vip.jpg";
  const [transparentDataUrl, setTransparentDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // In-browser real-time alpha transparency processing
  useEffect(() => {
    let isMounted = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = rawSrc;

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = Math.min(img.naturalWidth || 512, 512);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, size, size);
        const imgData = ctx.getImageData(0, 0, size, size);
        const d = imgData.data;

        // Convert solid black background to pure transparent alpha with smooth edge anti-aliasing
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          // Perceived brightness
          const brightness = Math.max(r, g, b);

          if (brightness < 16) {
            // Pure transparent
            d[i + 3] = 0;
          } else if (brightness < 48) {
            // Smooth edge feathering
            const factor = (brightness - 16) / 32;
            d[i + 3] = Math.round(d[i + 3] * factor);
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const pngUrl = canvas.toDataURL("image/png");
        if (isMounted) {
          setTransparentDataUrl(pngUrl);
        }
      } catch {
        // Fallback to screen blend mode
      }
    };

    return () => {
      isMounted = false;
    };
  }, [rawSrc]);

  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-20 h-20 sm:w-22 sm:h-22",
    lg: "w-28 h-28",
  }[size];

  return (
    <div className={`relative flex items-center justify-center ${sizeClasses} ${className}`}>
      {/* Subtle orange & red ambient radial glow */}
      <div
        className="absolute inset-0 -z-10 rounded-full blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none scale-90 group-hover:scale-110"
        style={{
          background: "radial-gradient(circle, rgba(255, 154, 31, 0.45) 0%, rgba(255, 61, 90, 0.25) 50%, transparent 75%)",
        }}
      />

      {/* Render 3D Minecraft Item with hover animation & transparency */}
      <img
        src={transparentDataUrl || rawSrc}
        alt={name}
        className="w-full h-full object-contain pointer-events-none select-none transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1 filter drop-shadow-[0_8px_16px_rgba(255,154,31,0.35)] group-hover:drop-shadow-[0_12px_24px_rgba(255,61,90,0.65)]"
        style={
          transparentDataUrl
            ? undefined
            : {
                mixBlendMode: "screen", // Seamless fallback while canvas generates alpha PNG
              }
        }
        loading="eager"
      />
    </div>
  );
}
