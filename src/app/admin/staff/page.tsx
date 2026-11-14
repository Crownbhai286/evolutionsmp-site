"use client";

import React, { useEffect, useState } from "react";
import { Plus, Edit3, Trash2, Image as ImageIcon, Loader2, X, Eye, EyeOff } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import MediaPickerModal from "@/components/admin/MediaPickerModal";
import { getPlayerAvatar } from "@/lib/utils";
import { useToast } from "@/components/NotificationToast";

interface StaffRow {
  id: string;
  slug: string;
  name: string;
  role: string;
  role_color: string;
  badge: string;
  minecraft_username: string;
  discord_username: string;
  bio: string;
  avatar_url: string | null;
  responsibilities: string[];
  joined_date: string;
  sort_order: number;
  is_active: boolean;
}

const EMPTY_STAFF: Omit<StaffRow, "id"> = {
  slug: "",
  name: "",
  role: "Moderator",
  role_color: "#10b981",
  badge: "",
  minecraft_username: "",
  discord_username: "",
  bio: "",
  avatar_url: "",
  responsibilities: [],
  joined_date: "2024",
  sort_order: 10,
  is_active: true,
};

function toSlug(val: string) {
  return val
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export default function AdminStaffPage() {
  const { showToast } = useToast();
  const [members, setMembers] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<StaffRow, "id">>(EMPTY_STAFF);
  const [respInput, setRespInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff");
      const json = await res.json();
      if (res.ok) setMembers(json.items || []);
    } catch {
      showToast("Error", "Failed to load staff roster.", "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_STAFF);
    setRespInput("Community Moderation, Ticket Support");
    setModalOpen(true);
  };

  const openEdit = (m: StaffRow) => {
    setEditingId(m.id);
    setForm({
      slug: m.slug,
      name: m.name,
      role: m.role,
      role_color: m.role_color || "#10b981",
      badge: m.badge || "",
      minecraft_username: m.minecraft_username,
      discord_username: m.discord_username || "",
      bio: m.bio || "",
      avatar_url: m.avatar_url || "",
      responsibilities: m.responsibilities || [],
      joined_date: m.joined_date || "2024",
      sort_order: Number(m.sort_order) || 0,
      is_active: Boolean(m.is_active),
    });
    setRespInput((m.responsibilities || []).join(", "));
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const payload = {
      ...form,
      slug: form.slug.trim() || toSlug(form.name),
      avatar_url: form.avatar_url?.trim() || null,
      responsibilities: respInput
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean),
    };

    setSaving(true);
    try {
      const res = await fetch(
        editingId ? `/api/admin/staff/${editingId}` : "/api/admin/staff",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        showToast("Save Failed", json.error || "Check required fields.", "warning");
        return;
      }
      showToast(
        editingId ? "Staff Updated" : "Staff Added",
        `${payload.name} saved to team roster.`,
        "success"
      );
      setModalOpen(false);
      loadStaff();
    } catch {
      showToast("Error", "Network error saving staff member.", "warning");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (m: StaffRow) => {
    try {
      const res = await fetch(`/api/admin/staff/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !m.is_active }),
      });
      if (!res.ok) return;
      setMembers((prev) =>
        prev.map((row) => (row.id === m.id ? { ...row, is_active: !m.is_active } : row))
      );
    } catch {
      showToast("Error", "Failed to toggle visibility.", "warning");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/staff/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        showToast("Delete Failed", "Could not delete member.", "warning");
        return;
      }
      setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast("Removed", "Staff member removed from roster.", "success");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminShell
      title="Staff Team Management"
      subtitle="Add, edit, sort, and customize EvolutionSMP administrators, developers, and moderators."
      actions={
        <button type="button" onClick={openCreate} className="btn small text-xs">
          <Plus className="h-3.5 w-3.5" />
          <span>Add Staff Member</span>
        </button>
      }
    >
      {loading ? (
        <div className="py-20 flex items-center justify-center gap-2 text-[#a3abd6]">
          <Loader2 className="h-6 w-6 animate-spin text-[#ff9a1f]" />
          <span className="text-xs">Loading staff roster...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => {
            const avatar = m.avatar_url || getPlayerAvatar(m.minecraft_username, 64);
            return (
              <div
                key={m.id}
                className="rounded-2xl p-5 bg-[#0f1535] border border-white/[0.08] flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={avatar}
                        alt={m.name}
                        className="h-12 w-12 rounded-xl bg-[#080b1c] object-cover border border-white/[0.1]"
                      />
                      <div>
                        <h3 className="font-head text-lg text-white">{m.name}</h3>
                        <span
                          className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-white/[0.06]"
                          style={{ color: m.role_color }}
                        >
                          {m.role}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleActive(m)}
                      className={`p-1.5 rounded-lg text-xs ${
                        m.is_active
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-slate-700/40 text-slate-400"
                      }`}
                      title={m.is_active ? "Visible publicly" : "Hidden"}
                    >
                      {m.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  <p className="text-xs text-[#a3abd6] mt-3 line-clamp-2">{m.bio}</p>
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-[#7d87b8]">
                    Order #{m.sort_order} &bull; {m.discord_username || "No Discord"}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(m)}
                      className="p-1.5 rounded-lg bg-[#141a42] text-[#ff9a1f]"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(m)}
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          onClick={() => !saving && setModalOpen(false)}
        >
          <div
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0f1433] border border-white/[0.15] p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="font-head text-xl text-white uppercase">
                {editingId ? "Edit Staff Member" : "Add Staff Member"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#141a42] text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Display Name</label>
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
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Minecraft IGN</label>
                  <input
                    required
                    value={form.minecraft_username}
                    onChange={(e) => setForm({ ...form, minecraft_username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Role</label>
                  <input
                    required
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Role Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={form.role_color}
                      onChange={(e) => setForm({ ...form, role_color: e.target.value })}
                      className="h-9 w-12 rounded-lg bg-[#080b1c] border border-white/[0.12]"
                    />
                    <input
                      value={form.role_color}
                      onChange={(e) => setForm({ ...form, role_color: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-xs font-mono text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Discord Tag</label>
                  <input
                    value={form.discord_username}
                    onChange={(e) => setForm({ ...form, discord_username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Sort Order</label>
                  <input
                    type="number"
                    min={0}
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm font-mono text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#a3abd6] block mb-1">
                  Custom Avatar URL (optional — uses Minecraft skin if blank)
                </label>
                <div className="flex gap-2">
                  <input
                    value={form.avatar_url || ""}
                    onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-xs font-mono text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setMediaOpen(true)}
                    className="px-3 py-2 rounded-xl bg-[#141a42] border border-white/[0.12] text-xs font-bold text-white inline-flex items-center gap-1.5"
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-[#ff9a1f]" />
                    <span>Pick Image</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#a3abd6] block mb-1">Bio</label>
                <textarea
                  rows={2}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#a3abd6] block mb-1">
                  Responsibilities (comma separated)
                </label>
                <input
                  value={respInput}
                  onChange={(e) => setRespInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-xs text-white"
                />
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#141a42] text-xs font-bold text-[#c7ccf0]"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn small text-xs">
                  {saving ? "Saving..." : editingId ? "Update Staff" : "Add Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <MediaPickerModal
        open={mediaOpen}
        defaultFolder="staff"
        selectedUrl={form.avatar_url}
        onSelect={(url) => setForm({ ...form, avatar_url: url })}
        onClose={() => setMediaOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove Staff Member?"
        description={`Remove "${deleteTarget?.name}" from the public staff roster?`}
        confirmLabel="Remove Member"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminShell>
  );
}
