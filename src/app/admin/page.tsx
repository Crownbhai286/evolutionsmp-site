"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  ShoppingBag,
  Newspaper,
  Shield,
  Vote,
  Trophy,
  Activity,
  Server,
  Settings,
  Image as ImageIcon,
  LayoutTemplate,
  UserCog,
  Loader2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { useToast } from "@/components/NotificationToast";

interface OverviewData {
  admin: { id: string; email: string; displayName: string; role: "owner" | "admin" };
  databaseConnected: boolean;
  serviceRoleConfigured: boolean;
  tebexStatus: { configured: boolean; hasPublicToken: boolean; hasSecretKey: boolean };
  stats: {
    total_registered_players: number;
    online_players: number;
    max_players: number;
    total_votes: number;
    java_online: boolean;
    bedrock_online: boolean;
    data_source: string;
    last_synced_at: string | null;
  } | null;
  settings: {
    java_ip: string;
    bedrock_ip: string;
    bedrock_port: number;
    season_name: string;
    minecraft_version: string;
  } | null;
  counts: {
    products: number;
    newsTotal: number;
    newsPublished: number;
    staff: number;
    voteSites: number;
    votesTodayTotal: number;
  };
  recentActivities: Array<{
    id: string;
    admin_email: string;
    admin_role: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    created_at: string;
  }>;
}

export default function AdminOverviewPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [liveStatus, setLiveStatus] = useState<{
    online: boolean;
    players?: { online: number; max: number; list?: string[] };
    playersOnline?: number;
    playersMax?: number;
    source: string;
    isSimulated: boolean;
  } | null>(null);

  // Manual statistics modal
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [savingStats, setSavingStats] = useState(false);
  const [statsForm, setStatsForm] = useState({
    total_registered_players: 0,
    online_players: 0,
    max_players: 2000,
    total_votes: 0,
    java_online: true,
    bedrock_online: true,
  });

  const loadOverview = async () => {
    setLoading(true);
    setError("");
    try {
      const [ovRes, stRes] = await Promise.all([
        fetch("/api/admin/overview"),
        fetch("/api/server-status").catch(() => null),
      ]);
      const ovJson = await ovRes.json();
      if (!ovRes.ok) {
        setError(ovJson.error || "Failed to load admin overview.");
        return;
      }
      setData(ovJson);
      if (ovJson.stats) {
        setStatsForm({
          total_registered_players: ovJson.stats.total_registered_players ?? 0,
          online_players: ovJson.stats.online_players ?? 0,
          max_players: ovJson.stats.max_players ?? 2000,
          total_votes: ovJson.stats.total_votes ?? 0,
          java_online: Boolean(ovJson.stats.java_online),
          bedrock_online: Boolean(ovJson.stats.bedrock_online),
        });
      }
      if (stRes && stRes.ok) {
        const stJson = await stRes.json();
        setLiveStatus(stJson);
      }
    } catch {
      setError("Network error loading dashboard overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const handleSaveStats = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStats(true);
    try {
      const res = await fetch("/api/admin/stats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statsForm),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast("Update failed", json.error || "Unable to save statistics.", "warning");
        return;
      }
      showToast("Statistics saved", "Manual fallback server stats updated.", "success");
      setStatsModalOpen(false);
      loadOverview();
    } catch {
      showToast("Error", "Network error saving statistics.", "warning");
    } finally {
      setSavingStats(false);
    }
  };

  const quickShortcuts = [
    { href: "/admin/settings", label: "Website Settings", desc: "IPs, Discord, SEO, Hero", icon: Settings },
    { href: "/admin/store", label: "Store Catalog", desc: "Products, Ranks & Coins", icon: ShoppingBag },
    { href: "/admin/news", label: "Write News", desc: "Announcements & Patch Notes", icon: Newspaper },
    { href: "/admin/leaderboard", label: "Leaderboard & Sync", desc: "Players, CSV & Plugin API", icon: Trophy },
    { href: "/admin/homepage", label: "Homepage Builder", desc: "Sections, Gallery & Copy", icon: LayoutTemplate },
    { href: "/admin/media", label: "Media Library", desc: "Upload & Manage Images", icon: ImageIcon },
    { href: "/admin/users", label: "Admin Accounts", desc: "Manage Owner/Admin RBAC", icon: UserCog },
  ];

  const statCards = [
    {
      label: "Total Registered Players",
      value: (data?.stats?.total_registered_players ?? 0).toLocaleString(),
      sub: `Source: ${data?.stats?.data_source || "manual"}`,
      icon: Users,
      accent: "#3aa0ff",
    },
    {
      label: "Online Players",
      value: String(
        liveStatus?.players?.online ?? liveStatus?.playersOnline ?? data?.stats?.online_players ?? 0
      ),
      sub: liveStatus?.isSimulated ? "Simulated / Manual Fallback" : `Live (${liveStatus?.source || "api"})`,
      icon: Activity,
      accent: "#2fd47a",
    },
    {
      label: "Store Products",
      value: String(data?.counts.products ?? 0),
      sub: data?.tebexStatus.configured ? "Tebex Configured" : "Discord / Unmapped",
      icon: ShoppingBag,
      accent: "#ff9a1f",
    },
    {
      label: "News Articles",
      value: String(data?.counts.newsTotal ?? 0),
      sub: `${data?.counts.newsPublished ?? 0} published`,
      icon: Newspaper,
      accent: "#a855f7",
    },
    {
      label: "Staff Members",
      value: String(data?.counts.staff ?? 0),
      sub: "Active roster profiles",
      icon: Shield,
      accent: "#ec4899",
    },
    {
      label: "Total Votes Recorded",
      value: (data?.stats?.total_votes ?? data?.counts.votesTodayTotal ?? 0).toLocaleString(),
      sub: `${data?.counts.voteSites ?? 0} voting portals`,
      icon: Vote,
      accent: "#fbbf24",
    },
  ];

  return (
    <AdminShell
      title="Dashboard Overview"
      subtitle="Live metrics, Java & Bedrock server status, integrations, and recent staff activity."
      admin={data?.admin}
      databaseConnected={data?.databaseConnected ?? false}
      tebexConfigured={data?.tebexStatus.configured ?? false}
      actions={
        <button
          type="button"
          onClick={() => setStatsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#141a42] border border-white/[0.12] text-xs font-bold text-white hover:border-[#ff9a1f] transition-colors"
        >
          <Edit3 className="h-3.5 w-3.5 text-[#ff9a1f]" />
          <span>Edit Fallback Stats</span>
        </button>
      }
    >
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-[#a3abd6] gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-[#ff9a1f]" />
          <span className="text-xs">Loading live dashboard data...</span>
        </div>
      ) : error ? (
        <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="rounded-2xl p-5 bg-[#0f1535] border border-white/[0.08] flex items-start justify-between gap-4 hover:border-white/[0.16] transition-colors"
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#8f98c7]">
                      {card.label}
                    </p>
                    <p className="font-head text-3xl text-white mt-1.5 tracking-wide">
                      {card.value}
                    </p>
                    <p className="text-[11px] font-mono text-[#7d87b8] mt-1">{card.sub}</p>
                  </div>
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center border shrink-0"
                    style={{
                      backgroundColor: `${card.accent}18`,
                      borderColor: `${card.accent}40`,
                      color: card.accent,
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Server Status + Quick Shortcuts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Java & Bedrock Status Panel */}
            <div className="rounded-2xl p-6 bg-[#0f1535] border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-head text-lg text-white uppercase tracking-wide flex items-center gap-2">
                  <Server className="h-4 w-4 text-[#ff9a1f]" />
                  <span>Network Endpoints</span>
                </h2>
                <span className="text-[11px] font-mono text-[#8f98c7]">
                  {data?.settings?.season_name || "Season 4"}
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[#090d22] border border-white/[0.07] flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-white">Java Edition</p>
                    <p className="text-[11px] font-mono text-[#8f98c7]">
                      {data?.settings?.java_ip || "play.evolutionsmp.fun"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      data?.stats?.java_online
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-red-500/15 text-red-300"
                    }`}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{data?.stats?.java_online ? "Online" : "Offline"}</span>
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#090d22] border border-white/[0.07] flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-white">Bedrock Crossplay</p>
                    <p className="text-[11px] font-mono text-[#8f98c7]">
                      {data?.settings?.bedrock_ip || "bedrock.evolutionsmp.fun"} :{" "}
                      {data?.settings?.bedrock_port || 19132}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      data?.stats?.bedrock_online
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-red-500/15 text-red-300"
                    }`}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{data?.stats?.bedrock_online ? "Online" : "Offline"}</span>
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#141a42]/60 border border-white/[0.06] text-[11px] text-[#a3abd6] leading-relaxed">
                <strong className="text-white">Honest Telemetry Notice:</strong>{" "}
                {liveStatus?.isSimulated
                  ? "Player count shown publicly is reading manual fallback statistics until a Minecraft server ping or plugin sync arrives."
                  : "Live player ping telemetry is active from your server endpoint."}
              </div>
            </div>

            {/* Quick Management Shortcuts */}
            <div className="lg:col-span-2 rounded-2xl p-6 bg-[#0f1535] border border-white/[0.08]">
              <h2 className="font-head text-lg text-white uppercase tracking-wide mb-4">
                Quick Management Shortcuts
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {quickShortcuts.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group p-4 rounded-xl bg-[#090d22] border border-white/[0.07] hover:border-[#ff9a1f]/50 transition-all"
                    >
                      <Icon className="h-5 w-5 text-[#ff9a1f] mb-2.5 group-hover:scale-110 transition-transform" />
                      <h3 className="text-xs font-extrabold text-white uppercase tracking-wide">
                        {item.label}
                      </h3>
                      <p className="text-[11px] text-[#8f98c7] mt-0.5">{item.desc}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Admin Activity */}
          <div className="rounded-2xl bg-[#0f1535] border border-white/[0.08] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <h2 className="font-head text-lg text-white uppercase tracking-wide">
                Recent Admin Activities
              </h2>
              <Link
                href="/admin/audit-logs"
                className="text-xs font-bold text-[#ff9a1f] hover:underline"
              >
                View All Audit Logs &rarr;
              </Link>
            </div>

            {data?.recentActivities.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8f98c7]">
                No admin activity recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {data?.recentActivities.map((log) => (
                  <div
                    key={log.id}
                    className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-[#ff9a1f]/15 text-[#ff9a1f] font-mono font-bold text-[11px]">
                        {log.action}
                      </span>
                      <span className="text-white font-semibold">{log.admin_email}</span>
                      <span className="text-[#8f98c7] font-mono">
                        {log.entity_type}
                        {log.entity_id ? ` (${log.entity_id.slice(0, 8)}...)` : ""}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#7d87b8]">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Statistics Modal */}
      {statsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => !savingStats && setStatsModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[#0f1433] border border-white/[0.15] shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-head text-xl text-white uppercase">
                Manual Fallback Statistics
              </h3>
              <button
                type="button"
                onClick={() => setStatsModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#141a42] text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStats} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">
                    Registered Players
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={statsForm.total_registered_players}
                    onChange={(e) =>
                      setStatsForm((s) => ({
                        ...s,
                        total_registered_players: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">
                    Fallback Online Players
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={statsForm.online_players}
                    onChange={(e) =>
                      setStatsForm((s) => ({
                        ...s,
                        online_players: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">
                    Max Players
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={statsForm.max_players}
                    onChange={(e) =>
                      setStatsForm((s) => ({
                        ...s,
                        max_players: Number(e.target.value) || 1,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">
                    Total Votes
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={statsForm.total_votes}
                    onChange={(e) =>
                      setStatsForm((s) => ({
                        ...s,
                        total_votes: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={statsForm.java_online}
                    onChange={(e) =>
                      setStatsForm((s) => ({ ...s, java_online: e.target.checked }))
                    }
                  />
                  <span>Java Server Online</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={statsForm.bedrock_online}
                    onChange={(e) =>
                      setStatsForm((s) => ({ ...s, bedrock_online: e.target.checked }))
                    }
                  />
                  <span>Bedrock Server Online</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setStatsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#141a42] text-xs font-bold text-[#c7ccf0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStats}
                  className="btn small text-xs"
                >
                  {savingStats ? "Saving..." : "Save Manual Stats"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
