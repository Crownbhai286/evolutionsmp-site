"use client";

import React, { useEffect, useState } from "react";
import { UserPlus, Shield, CheckCircle2, Ban, Loader2, X } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { useToast } from "@/components/NotificationToast";

interface AdminUserRow {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  role: "owner" | "admin";
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    display_name: "",
    role: "admin" as "owner" | "admin",
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (res.ok) setUsers(json.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast("Failed", json.error || "Only Owner accounts can create admins.", "warning");
        return;
      }
      setModalOpen(false);
      setForm({ email: "", password: "", display_name: "", role: "admin" });
      showToast("Admin Created", `${json.item.email} added to admin_users.`, "success");
      loadUsers();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: AdminUserRow) => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, is_active: !user.is_active }),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast("Permission / Error", json.error || "Only Owners can modify accounts.", "warning");
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, is_active: !user.is_active } : u))
    );
    showToast("Updated", `${user.email} status updated.`, "info");
  };

  const changeRole = async (user: AdminUserRow, nextRole: "owner" | "admin") => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, role: nextRole }),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast("Permission / Error", json.error || "Only Owners can change roles.", "warning");
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u)));
    showToast("Role Updated", `${user.display_name} is now ${nextRole}.`, "success");
  };

  return (
    <AdminShell
      title="Admin Users & Roles"
      subtitle="Invite-only staff accounts. Public signup is disabled; only Owners can add or update admins."
      actions={
        <button type="button" onClick={() => setModalOpen(true)} className="btn small text-xs">
          <UserPlus className="h-3.5 w-3.5" />
          <span>Add Admin Account</span>
        </button>
      }
    >
      {loading ? (
        <div className="py-20 flex items-center justify-center gap-2 text-[#a3abd6]">
          <Loader2 className="h-6 w-6 animate-spin text-[#ff9a1f]" />
          <span className="text-xs">Loading admin accounts...</span>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#0f1535] border border-white/[0.08] overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090d22] border-b border-white/[0.08] text-[#8f98c7] uppercase font-bold">
              <tr>
                <th className="px-4 py-3">Administrator</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Login</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-white">{u.display_name}</p>
                    <p className="text-[11px] font-mono text-[#7d87b8]">{u.email}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value as "owner" | "admin")}
                      className="px-2.5 py-1 rounded-lg bg-[#080b1c] border border-white/[0.12] text-xs font-bold uppercase text-[#ff9a1f]"
                    >
                      <option value="owner">owner</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        u.is_active
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-red-500/15 text-red-300"
                      }`}
                    >
                      {u.is_active ? <CheckCircle2 className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                      <span>{u.is_active ? "Active" : "Suspended"}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[11px] text-[#8f98c7]">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Never"}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => toggleActive(u)}
                      className="px-3 py-1.5 rounded-lg bg-[#141a42] text-xs font-bold text-white hover:bg-[#1b2254]"
                    >
                      {u.is_active ? "Disable" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
              <h3 className="font-head text-lg text-white uppercase flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#ff9a1f]" />
                <span>Create Admin Account</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#141a42] text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#a3abd6] block mb-1">Display Name</label>
                <input
                  required
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#a3abd6] block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#a3abd6] block mb-1">
                  Password (min 8 chars)
                </label>
                <input
                  type="password"
                  minLength={8}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#a3abd6] block mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value as "owner" | "admin" })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                >
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
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
                  {saving ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
