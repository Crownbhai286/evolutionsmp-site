"use client";

import React, { useEffect, useState } from "react";
import { Plus, Edit3, Trash2, Eye, EyeOff, ExternalLink, Loader2, X } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/NotificationToast";

interface VoteSiteRow {
  id: string;
  slug: string;
  name: string;
  domain: string;
  url: string;
  reward: string;
  reward_description: string;
  cooldown: string;
  votes_today: number;
  is_enabled: boolean;
  sort_order: number;
}

const EMPTY_SITE: Omit<VoteSiteRow, "id"> = {
  slug: "",
  name: "",
  domain: "",
  url: "https://",
  reward: "1x Vote Crate Key + $250",
  reward_description: "",
  cooldown: "24 Hours",
  votes_today: 0,
  is_enabled: true,
  sort_order: 10,
};

function toSlug(val: string) {
  return val
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export default function AdminVotingPage() {
  const { showToast } = useToast();
  const [sites, setSites] = useState<VoteSiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<VoteSiteRow, "id">>(EMPTY_SITE);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VoteSiteRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadSites = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/voting");
      const json = await res.json();
      if (res.ok) setSites(json.items || []);
    } catch {
      showToast("Error", "Failed to load voting portals.", "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_SITE, sort_order: sites.length + 1 });
    setModalOpen(true);
  };

  const openEdit = (row: VoteSiteRow) => {
    setEditingId(row.id);
    setForm({
      slug: row.slug,
      name: row.name,
      domain: row.domain || "",
      url: row.url,
      reward: row.reward,
      reward_description: row.reward_description || "",
      cooldown: row.cooldown || "24 Hours",
      votes_today: Number(row.votes_today) || 0,
      is_enabled: Boolean(row.is_enabled),
      sort_order: Number(row.sort_order) || 0,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const payload = {
      ...form,
      slug: form.slug.trim() || toSlug(form.name),
    };
    try {
      const res = await fetch(
        editingId ? `/api/admin/voting/${editingId}` : "/api/admin/voting",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        showToast("Validation Error", json.error || "Check URL & fields.", "warning");
        return;
      }
      setModalOpen(false);
      showToast("Vote Site Saved", `${payload.name} updated.`, "success");
      loadSites();
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (row: VoteSiteRow) => {
    const res = await fetch(`/api/admin/voting/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_enabled: !row.is_enabled }),
    });
    if (res.ok) {
      setSites((prev) =>
        prev.map((s) => (s.id === row.id ? { ...s, is_enabled: !row.is_enabled } : s))
      );
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/voting/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setSites((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        setDeleteTarget(null);
        showToast("Deleted", "Voting portal removed.", "success");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminShell
      title="Voting Portals"
      subtitle="Manage voting links, rewards, cooldowns, and portal order on /vote."
      actions={
        <button type="button" onClick={openCreate} className="btn small text-xs">
          <Plus className="h-3.5 w-3.5" />
          <span>Add Vote Site</span>
        </button>
      }
    >
      {loading ? (
        <div className="py-20 flex items-center justify-center gap-2 text-[#a3abd6]">
          <Loader2 className="h-6 w-6 animate-spin text-[#ff9a1f]" />
          <span className="text-xs">Loading vote portals...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {sites.map((site, idx) => (
            <div
              key={site.id}
              className="rounded-2xl p-4 sm:p-5 bg-[#0f1535] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-[#141a42] text-[#ff9a1f] font-head flex items-center justify-center shrink-0">
                  {String(idx + 1).padStart(2, "0")}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-white text-sm">{site.name}</h3>
                    <span className="text-[11px] font-mono text-[#7d87b8]">{site.cooldown}</span>
                  </div>
                  <p className="text-xs text-emerald-300 font-semibold mt-0.5">
                    Reward: {site.reward}
                  </p>
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-[#3aa0ff] hover:underline mt-1"
                  >
                    <span className="truncate max-w-xs">{site.url}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleEnabled(site)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold ${
                    site.is_enabled
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-slate-700/40 text-slate-400"
                  }`}
                >
                  {site.is_enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  <span>{site.is_enabled ? "Enabled" : "Disabled"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(site)}
                  className="p-2 rounded-lg bg-[#141a42] text-[#ff9a1f]"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(site)}
                  className="p-2 rounded-lg bg-red-500/10 text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[#0f1433] border border-white/[0.15] p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-head text-lg text-white uppercase">
                {editingId ? "Edit Vote Portal" : "Add Vote Portal"}
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
              <div>
                <label className="text-xs font-bold text-[#a3abd6] block mb-1">Portal Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                      slug: editingId ? form.slug : toSlug(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#a3abd6] block mb-1">Voting URL</label>
                <input
                  type="url"
                  required
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm font-mono text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Reward Label</label>
                  <input
                    required
                    value={form.reward}
                    onChange={(e) => setForm({ ...form, reward: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Cooldown</label>
                  <input
                    required
                    value={form.cooldown}
                    onChange={(e) => setForm({ ...form, cooldown: e.target.value })}
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
                  {saving ? "Saving..." : "Save Vote Site"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Voting Site?"
        description={`Remove "${deleteTarget?.name}" from /vote?`}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminShell>
  );
}
