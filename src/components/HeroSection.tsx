"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Server, ShoppingCart, Copy, Check } from "lucide-react";
import confetti from "canvas-confetti";
import { motion, useReducedMotion } from "framer-motion";
import { SERVER_CONFIG } from "@/lib/data";
import { copyToClipboard } from "@/lib/utils";
import { useToast } from "./NotificationToast";

interface HeroSectionProps {
  playerCount?: number;
  online?: boolean;
}

export default function HeroSection({ playerCount = 1148, online = true }: HeroSectionProps) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();
  const shouldReduceMotion = useReducedMotion();

  const handleCopyIP = async () => {
    const ok = await copyToClipboard(SERVER_CONFIG.javaIp);
    if (ok) {
      setCopied(true);
      showToast("IP Copied to clipboard!", `Connect with ${SERVER_CONFIG.javaIp}`, "success");

      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.75 },
          colors: ["#ff9a1f", "#ff3d5a", "#3aa0ff", "#ffc23d"],
        });
      } catch {
        // no-op
      }

      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section
      className="relative overflow-hidden isolate min-h-[min(100vh,920px)] flex items-center justify-center pt-36 pb-28 px-5"
    >
      {/* Main Hero Background Image with subtle ambient floating motion */}
      <motion.div
        className="absolute inset-0 -z-20 bg-center bg-cover bg-no-repeat will-change-transform"
        style={{
          backgroundImage: "url('/images/hero-bg-v2.jpg')",
        }}
        animate={
          shouldReduceMotion
            ? {}
            : {
                scale: [1, 1.03, 1],
                y: [0, -8, 0],
              }
        }
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Subtle dark overlay for text readability & smooth bottom blend */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0a0d22]/70 via-[#0a0d22]/45 to-[#0a0d22] pointer-events-none" />

      <div className="relative z-10 max-w-[1200px] mx-auto w-full text-center flex flex-col items-center">
        {/* Main Playbex Signature Heading with Elegant Entrance */}
        <motion.h1
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="font-head text-[clamp(40px,6.8vw,86px)] uppercase leading-[1.02] tracking-[0.02em] max-w-4xl drop-shadow-[0_10px_35px_rgba(0,0,0,0.8)] text-center select-none"
        >
          <span className="block text-white">YOUR ADVENTURE</span>
          <span className="block g mt-0.5 sm:mt-1">STARTS HERE.</span>
        </motion.h1>

        {/* Subtitle Entrance */}
        <motion.p
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 text-[#a3abd6] text-base sm:text-lg max-w-xl font-medium"
        >
          The premier Minecraft Survival SMP for Java &amp; Bedrock. Land claims, player economy, custom features, and a thriving community.
        </motion.p>

        {/* Playbex Floating IP Card Entrance */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 22, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 ipcard shadow-2xl hover:shadow-[#ff9a1f]/20 transition-all"
        >
          <div className="ico">
            <Server className="h-6 w-6" />
          </div>
          <div className="text-left pr-2">
            <small>Server IP</small>
            <b id="ipText" className="select-all">{SERVER_CONFIG.javaIp}</b>
          </div>
          <button
            type="button"
            onClick={handleCopyIP}
            className={`copy ${copied ? "ok" : ""}`}
            aria-label="Copy IP"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 stroke-[3]" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy</span>
              </>
            )}
          </button>
        </motion.div>

        {/* Playbex Hero CTAs Entrance */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 flex flex-wrap items-center justify-center gap-3.5"
        >
          <Link href="/store" className="btn glass">
            <ShoppingCart className="h-4 w-4 text-[#ff9a1f]" />
            <span>Store</span>
          </Link>

          <a
            href={SERVER_CONFIG.discordInvite}
            target="_blank"
            rel="noopener noreferrer"
            className="btn glass"
          >
            <svg className="h-4 w-4 fill-[#5865F2]" width="16" height="16" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            <span>Discord</span>
          </a>
        </motion.div>

        {/* Bedrock info line */}
        <motion.p
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.52 }}
          className="mt-8 text-xs sm:text-sm text-[#a3abd6]"
        >
          Bedrock (Mobile &amp; Console): <b className="text-white font-mono">{SERVER_CONFIG.bedrockIp}</b> · port{" "}
          <b className="text-white font-mono">{SERVER_CONFIG.bedrockPort}</b>
        </motion.p>
      </div>

      {/* Playbex Mouse scroll down indicator */}
      <a href="#modes" className="mouse" aria-label="Scroll down to game modes" />
    </section>
  );
}
