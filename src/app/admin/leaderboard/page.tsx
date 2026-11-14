"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Download,
  Upload,
  Terminal,
  Loader2,
  X,
} from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { getPlayerAvatar } from "@/lib/utils";
import { useToast } from "@/components/NotificationToast";

interface LeaderboardRow {
  id: string;
  category: "money" | "playtime" | "blocksMined";
  rank_position: number;
  username: string;
  score: number;
  formatted_score: string;
  guild: string | null;
  tier: "diamond" | "gold" | "silver" | "bronze" | "standard";
  playtime_label: string | null;
  data_source: string;
  synced_at: string;
}

export default function AdminLeaderboardPage() {
  const { showToast } = useToast();
  const [category, setCategory] = useState<"money" | "playtime" | "blocksMined">("money");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // Player modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    category: "money" as "money" | "playtime" | "blocksMined",
    rank_position: 1,
    username: "",
    score: 0,
    guild: "",
    tier: "standard" as "diamond" | "gold" | "silver" | "bronze" | "standard",
    playtime_label: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LeaderboardRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showApiDocs, setShowApiDocs] = useState(false);

  const loadRows = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/leaderboard");
      const json = await res.json();
      if (res.ok) setRows(json.items || []);
    } catch {
      showToast("Error", "Failed to load leaderboard records.", "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const catRows = rows
    .filter((r) => r.category === category)
    .filter(
      (r) =>
        r.username.toLowerCase().includes(search.toLowerCase()) ||
        (r.guild && r.guild.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => a.rank_position - b.rank_position);

  const totalPages = Math.max(1, Math.ceil(catRows.length / PAGE_SIZE));
  const pagedRows = catRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      category,
      rank_position: catRows.length + 1,
      username: "",
      score: 1000,
      guild: "",
      tier: "standard",
      playtime_label: "",
    });
    setModalOpen(true);
  };

  const openEdit = (r: LeaderboardRow) => {
    setEditingId(r.id);
    setForm({
      category: r.category,
      rank_position: r.rank_position,
      username: r.username,
      score: Number(r.score),
      guild: r.guild || "",
      tier: r.tier || "standard",
      playtime_label: r.playtime_label || "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(
        editingId ? `/api/admin/leaderboard/${editingId}` : "/api/admin/leaderboard",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            guild: form.guild.trim() || null,
            playtime_label: form.playtime_label.trim() || null,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        showToast("Validation Error", json.error || "Check player fields.", "warning");
        return;
      }
      setModalOpen(false);
      showToast("Saved", `${form.username} saved to leaderboard.`, "success");
      loadRows();
    } finally {
      setSaving(false);
    }
  };

  const handleCsvExport = () => {
    const header = "category,rank_position,username,score,guild,playtime_label";
    const body = catRows
      .map(
        (r) =>
          `${r.category},${r.rank_position},"${r.username}",${r.score},"${r.guild || ""}","${r.playtime_label || ""}"`
      )
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evolutionsmp-${category}-leaderboard.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvImport = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const startIdx = lines[0]?.toLowerCase().includes("username") ? 1 : 0;
    const parsedRows = lines.slice(startIdx).map((line, i) => {
      const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
      if (cols.length >= 3 && ["money", "playtime", "blocksMined"].includes(cols[0])) {
        return {
          category: cols[0] as "money" | "playtime" | "blocksMined",
          rank_position: Number(cols[1]) || i + 1,
          username: cols[2],
          score: Number(cols[3]) || 0,
          guild: cols[4] || null,
          playtime_label: cols[5] || null,
        };
      }
      return {
        category,
        rank_position: Number(cols[0]) || i + 1,
        username: cols[1] || `Player${i + 1}`,
        score: Number(cols[2]) || 0,
        guild: cols[3] || null,
        playtime_label: cols[4] || null,
      };
    });

    const res = await fetch("/api/admin/leaderboard/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: parsedRows }),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast("Import Failed", json.error || "Check CSV format.", "warning");
      return;
    }
    showToast("CSV Imported", `${json.imported} leaderboard rows synced.`, "success");
    loadRows();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/leaderboard/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
        setDeleteTarget(null);
        showToast("Deleted", "Leaderboard entry removed.", "success");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminShell
      title="Leaderboard & Server Sync"
      subtitle="Manage Money, Playtime & Blocks Mined rankings, CSV imports, and Minecraft plugin API sync."
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowApiDocs((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141a42] border border-white/[0.12] text-xs font-bold text-[#3aa0ff]"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Plugin Sync API</span>
          </button>
          <button type="button" onClick={openAdd} className="btn small text-xs">
            <Plus className="h-3.5 w-3.5" />
            <span>Add Player</span>
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {showApiDocs && (
          <div className="rounded-2xl p-5 bg-[#0f1535] border border-sky-500/30 space-y-2.5 text-xs">
            <h2 className="font-head text-base text-white uppercase">
              Minecraft Server Sync Endpoint: <code className="text-sky-300">POST /api/sync/leaderboard</code>
            </h2>
            <p className="text-[#a3abd6]">
              Send <code className="text-white font-mono">x-sync-api-key: &lt;MINECRAFT_SYNC_API_KEY&gt;</code>{" "}
              from your Paper/Velocity plugin or scheduled task:
            </p>
            <pre className="p-3 rounded-xl bg-[#080b1c] border border-white/[0.08] font-mono text-[11px] text-emerald-300 overflow-x-auto">
{`{
  "statistics": {
    "online_players": 142,
    "max_players": 500,
    "total_registered_players": 18420,
    "java_online": true,
    "bedrock_online": true
  },
  "players": [
    { "category": "money", "rank_position": 1, "username": "Steve", "score": 950000, "guild": "Evo", "tier": "diamond" }
  ]
}`}
            </pre>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: "money", label: "Top Money" },
                { id: "playtime", label: "Top Playtime" },
                { id: "blocksMined", label: "Top Blocks Mined" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setCategory(t.id);
                  setPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase ${
                  category === t.id
                    ? "bg-[#ff9a1f] text-[#0a0d22]"
                    : "bg-[#0f1535] text-[#a3abd6] border border-white/[0.08]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 text-[#7d87b8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search player or guild..."
                className="pl-9 pr-3 py-2 rounded-xl bg-[#0f1535] border border-white/[0.1] text-xs text-white"
              />
            </div>

            <button
              type="button"
              onClick={handleCsvExport}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141a42] border border-white/[0.1] text-xs font-bold text-white"
            >
              <Download className="h-3.5 w-3.5 text-[#3aa0ff]" />
              <span>Export CSV</span>
            </button>

            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141a42] border border-white/[0.1] text-xs font-bold text-white">
              <Upload className="h-3.5 w-3.5 text-[#ff9a1f]" />
              <span>Import CSV</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCsvImport(file);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex items-center justify-center gap-2 text-[#a3abd6]">
            <Loader2 className="h-6 w-6 animate-spin text-[#ff9a1f]" />
            <span className="text-xs">Loading leaderboard...</span>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#0f1535] border border-white/[0.08] overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#090d22] border-b border-white/[0.08] text-[#8f98c7] uppercase font-bold">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {pagedRows.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-head text-sm text-[#ff9a1f]">
                      #{p.rank_position}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={getPlayerAvatar(p.username, 32)}
                          alt={p.username}
                          className="h-7 w-7 rounded bg-[#080b1c]"
                        />
                        <span className="font-bold text-white">{p.username}</span>
                        {p.guild && (
                          <span className="text-[11px] font-mono text-[#7d87b8]">[{p.guild}]</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-white">
                      {p.formatted_score || p.score.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-white/[0.06] font-mono text-[10px] text-[#c7ccf0]">
                        {p.data_source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg bg-[#141a42] text-[#ff9a1f]"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(p)}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-[#8f98c7]">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1 rounded bg-[#141a42] text-white disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 rounded bg-[#141a42] text-white disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#0f1433] border border-white/[0.15] p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-head text-lg text-white uppercase">
                {editingId ? "Edit Player Score" : "Add Leaderboard Player"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#141a42] text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Rank #</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={form.rank_position}
                    onChange={(e) => setForm({ ...form, rank_position: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Numeric Score</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.score}
                    onChange={(e) => setForm({ ...form, score: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm font-mono text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-[#a3abd6] block mb-1">Minecraft Username</label>
                <input
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Guild / Clan</label>
                  <input
                    value={form.guild}
                    onChange={(e) => setForm({ ...form, guild: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Playtime Label</label>
                  <input
                    value={form.playtime_label}
                    onChange={(e) => setForm({ ...form, playtime_label: e.target.value })}
                    placeholder="312 hrs"
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#141a42] text-xs font-bold text-[#c7ccf0]"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn small text-xs">
                  {saving ? "Saving..." : "Save Player"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove Player Record?"
        description={`Delete "${deleteTarget?.username}" from ${deleteTarget?.category}?`}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminShell>
  );
}
