"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  ShoppingCart,
  Copy,
  Check,
  Disc as DiscordIcon,
  Server,
  ChevronDown,
  Globe,
} from "lucide-react";
import { SERVER_CONFIG as DEFAULT_SERVER_CONFIG } from "@/lib/data";
import { copyToClipboard, formatNumber } from "@/lib/utils";
import type { WebsiteSettingsData } from "@/lib/types";
import {
  CART_UPDATED_EVENT,
  computeOrderLines,
  readCartFromStorage,
} from "@/lib/checkout";
import { useToast } from "./NotificationToast";

interface NavbarProps {
  onOpenCart?: () => void;
  cartCount?: number;
  settings?: WebsiteSettingsData;
}

export default function Navbar({ onOpenCart, cartCount = 0, settings }: NavbarProps) {
  const SERVER_CONFIG = {
    ...DEFAULT_SERVER_CONFIG,
    name: settings?.serverName || DEFAULT_SERVER_CONFIG.name,
    javaIp: settings?.javaIp || DEFAULT_SERVER_CONFIG.javaIp,
    discordInvite: settings?.discordInviteUrl || DEFAULT_SERVER_CONFIG.discordInvite,
  };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [serverOnline, setServerOnline] = useState(true);
  const [onlineCount, setOnlineCount] = useState(1148);
  const [storedCartCount, setStoredCartCount] = useState(0);
  const pathname = usePathname();
  const { showToast } = useToast();

  useEffect(() => {
    const syncCartCount = () => {
      const { items } = readCartFromStorage();
      setStoredCartCount(computeOrderLines(items).totalCount);
    };
    syncCartCount();
    window.addEventListener(CART_UPDATED_EVENT, syncCartCount);
    window.addEventListener("storage", syncCartCount);
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, syncCartCount);
      window.removeEventListener("storage", syncCartCount);
    };
  }, []);

  const displayedCartCount = cartCount > 0 ? cartCount : storedCartCount;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Fetch live status
    fetch("/api/server-status")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setServerOnline(data.online);
          setOnlineCount(data.players?.online || 1148);
        }
      })
      .catch(() => {});
  }, []);

  const handleCopy = async () => {
    const ok = await copyToClipboard(SERVER_CONFIG.javaIp);
    if (ok) {
      setCopied(true);
      showToast("IP Copied!", `${SERVER_CONFIG.javaIp} has been copied to your clipboard.`, "success");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Store", href: "/store" },
    { name: "Leaderboard", href: "/leaderboard" },
    { name: "Rules & Support", href: "/rules" },
    { name: "Vote", href: "/vote" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0a0d22]/90 backdrop-blur-xl border-b border-white/[0.08] shadow-2xl py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-5 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group shrink-0" aria-label="EvolutionSMP Home">
          <div className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-xl overflow-hidden bg-[#0a0d22] border border-[#3aa0ff]/40 shadow-lg shadow-[#3aa0ff]/20 group-hover:scale-105 group-hover:border-[#3aa0ff] group-hover:shadow-[#3aa0ff]/40 transition-all p-0.5 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="EvolutionSMP Official Logo"
              width={44}
              height={44}
              priority
              className="w-full h-full object-contain filter drop-shadow-[0_2px_10px_rgba(58,160,255,0.6)]"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-head text-2xl tracking-wide text-white group-hover:text-[#ff9a1f] transition-colors leading-none">
              Evolution<span className="g">SMP</span>
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1.5 bg-[#141a42]/70 px-4 py-1.5 rounded-full border border-white/[0.08] backdrop-blur-md">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-[#1b2254] text-white border border-[#3aa0ff]/40 shadow-sm"
                    : "text-[#a3abd6] hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {link.name}
              </Link>
            );
          })}

          <a
            href={SERVER_CONFIG.discordInvite}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold text-[#a3abd6] hover:text-[#5865F2] hover:bg-white/[0.04] transition-all"
          >
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            <span>Discord</span>
          </a>
        </nav>

        {/* Right Elements (Server Status, Copy IP & Cart Button) */}
        <div className="flex items-center gap-2.5">
          {/* Server Status Pill (Playbex style) */}
          <button
            onClick={handleCopy}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141a42] border border-white/[0.08] text-xs font-semibold hover:border-[#3aa0ff]/40 transition-all text-[#a3abd6] hover:text-white"
            title="Copy server IP"
          >
            <span className={`live-dot ${serverOnline ? "on" : ""}`} />
            <span>
              {serverOnline ? `${formatNumber(onlineCount)} Players` : "Offline"}
            </span>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-400 ml-0.5" />
            ) : (
              <Copy className="h-3 w-3 text-[#6f78a8] ml-0.5" />
            )}
          </button>

          {/* Cart Button */}
          <Link
            href="/store#cart"
            onClick={() => {
              if (onOpenCart) onOpenCart();
              if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("evo-open-cart"));
              }
            }}
            className="relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#1b2254] hover:bg-[#232c6a] border border-[rgba(130,150,255,0.24)] text-xs font-bold text-white transition-all shadow-sm"
          >
            <ShoppingCart className="h-4 w-4 text-[#ff9a1f]" />
            <span className="hidden sm:inline">Cart</span>
            {displayedCartCount > 0 && (
              <span className="flex items-center justify-center h-4 w-4 rounded-full bg-[#ff3d5a] text-[10px] font-bold text-white">
                {displayedCartCount}
              </span>
            )}
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-[#141a42] border border-white/[0.08] text-white lg:hidden"
            aria-label="Open menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-0 right-0 bottom-0 w-full max-w-xs bg-[#0f1433] border-l border-white/[0.1] p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="relative h-8 w-8 rounded-lg overflow-hidden bg-[#0a0d22] border border-[#3aa0ff]/40 shadow-md p-0.5 flex items-center justify-center">
                    <Image
                      src="/logo.png"
                      alt="EvolutionSMP Official Logo"
                      width={32}
                      height={32}
                      className="w-full h-full object-contain filter drop-shadow-[0_1px_6px_rgba(58,160,255,0.6)]"
                    />
                  </div>
                  <span className="font-head text-xl text-white">{SERVER_CONFIG.name}</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex flex-col gap-1 mt-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/[0.05] transition-all"
                  >
                    {link.name}
                  </Link>
                ))}
                <a
                  href={SERVER_CONFIG.discordInvite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 rounded-xl text-sm font-semibold text-[#5865F2] hover:bg-white/[0.05] transition-all flex items-center gap-2"
                >
                  <span>Discord</span>
                </a>
              </nav>
            </div>

            <div className="pt-6 border-t border-white/[0.08] space-y-3">
              <button
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#141a42] text-xs font-mono text-white border border-white/[0.08]"
              >
                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? "IP Copied!" : SERVER_CONFIG.javaIp}</span>
              </button>

              <Link
                href="/store"
                onClick={() => setMobileMenuOpen(false)}
                className="btn block text-center w-full"
              >
                Visit Store
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
