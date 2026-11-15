"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  ShoppingBag,
  Newspaper,
  Users,
  ShieldAlert,
  Vote,
  Trophy,
  LayoutTemplate,
  Image as ImageIcon,
  UserCog,
  ClipboardList,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Database,
  CreditCard,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/NotificationToast";

export interface AdminShellProps {
  children: React.ReactNode;
  admin?: {
    email: string;
    displayName: string;
    role: "owner" | "admin";
  } | null;
  databaseConnected?: boolean;
  tebexConfigured?: boolean;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/settings", label: "Site Settings", icon: Settings },
  { href: "/admin/store", label: "Store & Coins", icon: ShoppingBag },
  { href: "/admin/orders", label: "Orders & UPI", icon: CreditCard },
  { href: "/admin/news", label: "News & Posts", icon: Newspaper },
  { href: "/admin/staff", label: "Staff Team", icon: Users },
  { href: "/admin/rules", label: "Server Rules", icon: ShieldAlert },
  { href: "/admin/voting", label: "Vote Portals", icon: Vote },
  { href: "/admin/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/admin/homepage", label: "Homepage Sections", icon: LayoutTemplate },
  { href: "/admin/media", label: "Media Library", icon: ImageIcon },
  { href: "/admin/users", label: "Admin Users", icon: UserCog },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ClipboardList },
];

export default function AdminShell({
  children,
  admin,
  databaseConnected = true,
  tebexConfigured = false,
  title,
  subtitle,
  actions,
}: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
      showToast("Signed out", "Your admin session has been closed.", "info");
      router.replace("/admin/login");
      router.refresh();
    } catch {
      router.replace("/admin/login");
    } finally {
      setSigningOut(false);
    }
  };

  const SidebarBody = () => (
    <div className="flex flex-col h-full justify-between p-4">
      <div>
        <Link
          href="/admin"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 px-2 py-2.5 rounded-xl mb-6 group"
        >
          <div className="h-9 w-9 rounded-xl bg-[#0a0d22] border border-[#3aa0ff]/40 p-1 flex items-center justify-center shrink-0">
            <Image
              src="/logo.png"
              alt="EvolutionSMP"
              width={32}
              height={32}
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <span className="font-head text-lg text-white tracking-wide block leading-none">
              Evolution<span className="g">Admin</span>
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8f98c7]">
              Control Center
            </span>
          </div>
        </Link>

        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? "bg-gradient-to-r from-[#ff9a1f]/20 to-[#ff3d5a]/10 text-white border border-[#ff9a1f]/40 shadow-sm"
                    : "text-[#a3abd6] hover:text-white hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    active ? "text-[#ff9a1f]" : "text-[#7d87b8]"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 mt-6 border-t border-white/[0.08] space-y-2.5">
        {admin && (
          <div className="px-3 py-2.5 rounded-xl bg-[#0a0d22]/80 border border-white/[0.06]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white truncate">
                {admin.displayName}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-[#ff9a1f]/20 text-[#ff9a1f] border border-[#ff9a1f]/30">
                {admin.role}
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#7d87b8] truncate mt-0.5">
              {admin.email}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#141a42] border border-white/[0.08] text-[11px] font-bold text-[#c7ccf0] hover:text-white hover:border-[#3aa0ff]/40 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>View Site</span>
          </Link>

          <button
            type="button"
            disabled={signingOut}
            onClick={handleSignOut}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#141a42] border border-white/[0.08] text-[11px] font-bold text-red-300 hover:text-white hover:bg-red-500/20 hover:border-red-500/40 transition-colors disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080b1c] text-[#f4f6ff] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 bg-[#0d122d] border-r border-white/[0.08] sticky top-0 h-screen overflow-y-auto">
        <SidebarBody />
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-72 bg-[#0d122d] border-r border-white/[0.1] overflow-y-auto z-10">
            <div className="flex justify-end p-3 pb-0">
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg bg-[#141a42] text-slate-300 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarBody />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-[#0b0f26]/90 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-[#141a42] border border-white/[0.08] text-white"
              aria-label="Open admin menu"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="min-w-0">
              <h1 className="font-head text-xl sm:text-2xl text-white tracking-wide uppercase truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-[#8f98c7] truncate">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden md:flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  databaseConnected
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                }`}
              >
                <Database className="h-3 w-3" />
                <span>{databaseConnected ? "Supabase Ready" : "DB Setup Needed"}</span>
              </span>

              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  tebexConfigured
                    ? "bg-sky-500/10 text-sky-300 border-sky-500/30"
                    : "bg-white/[0.05] text-[#9aa3cf] border-white/[0.1]"
                }`}
              >
                <CreditCard className="h-3 w-3" />
                <span>{tebexConfigured ? "Tebex Linked" : "Tebex Unconfigured"}</span>
              </span>
            </div>

            {actions}
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
