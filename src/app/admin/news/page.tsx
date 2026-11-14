"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Image as ImageIcon,
  Loader2,
  X,
  CheckCircle2,
  FileEdit,
} from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import MediaPickerModal from "@/components/admin/MediaPickerModal";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { useToast } from "@/components/NotificationToast";

interface NewsRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string[];
  content_html: string | null;
  category: "UPDATE" | "EVENT" | "ANNOUNCEMENT" | "MAINTENANCE";
  cover_image: string;
  author_name: string;
  author_role: string;
  author_skin: string;
  tags: string[];
  read_time: string;
  status: "draft" | "published";
  display_date: string | null;
  published_at: string | null;
}

const EMPTY_NEWS: Omit<NewsRow, "id" | "published_at"> = {
  slug: "",
  title: "",
  excerpt: "",
  content: [],
  content_html: "<p></p>",
  category: "ANNOUNCEMENT",
  cover_image: "/images/store-banner.jpg",
  author_name: "EvolutionSMP",
  author_role: "Network Lead",
  author_skin: "Notch",
  tags: ["Update"],
  read_time: "3 min read",
  status: "published",
  display_date: "",
};

function toSlug(val: string) {
  return val
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export default function AdminNewsPage() {
  const { showToast } = useToast();
  const [posts, setPosts] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<NewsRow, "id" | "published_at">>(EMPTY_NEWS);
  const [tagsInput, setTagsInput] = useState("Update");
  const [saving, setSaving] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NewsRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/news");
      const json = await res.json();
      if (res.ok) setPosts(json.items || []);
    } catch {
      showToast("Error", "Failed to load news articles.", "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_NEWS);
    setTagsInput("Update");
    setModalOpen(true);
  };

  const openEdit = (post: NewsRow) => {
    setEditingId(post.id);
    const html =
      post.content_html ||
      (Array.isArray(post.content)
        ? post.content.map((p) => `<p>${p}</p>`).join("")
        : "");
    setForm({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt || "",
      content: post.content || [],
      content_html: html,
      category: post.category,
      cover_image: post.cover_image || "/images/store-banner.jpg",
      author_name: post.author_name || "EvolutionSMP",
      author_role: post.author_role || "Staff",
      author_skin: post.author_skin || "Notch",
      tags: post.tags || [],
      read_time: post.read_time || "3 min read",
      status: post.status,
      display_date: post.display_date || "",
    });
    setTagsInput((post.tags || []).join(", "));
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const plainTextParagraphs = (form.content_html || "")
      .replace(/<\/(p|h2|h3|li|div)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const payload = {
      ...form,
      slug: form.slug.trim() || toSlug(form.title),
      tags,
      content: plainTextParagraphs.length > 0 ? plainTextParagraphs : [form.excerpt || form.title],
      display_date: form.display_date?.trim() || null,
    };

    setSaving(true);
    try {
      const res = await fetch(
        editingId ? `/api/admin/news/${editingId}` : "/api/admin/news",
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
        editingId ? "Article Updated" : "Article Created",
        `${payload.title} saved (${payload.status}).`,
        "success"
      );
      setModalOpen(false);
      loadPosts();
    } catch {
      showToast("Error", "Network error saving article.", "warning");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (post: NewsRow) => {
    const nextStatus = post.status === "published" ? "draft" : "published";
    try {
      const res = await fetch(`/api/admin/news/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        showToast("Error", "Unable to change publish state.", "warning");
        return;
      }
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, status: nextStatus } : p))
      );
      showToast("Updated", `Article set to ${nextStatus}.`, "info");
    } catch {
      showToast("Error", "Network error.", "warning");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/news/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        showToast("Delete Failed", "Could not delete article.", "warning");
        return;
      }
      setPosts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast("Deleted", "News post permanently deleted.", "success");
    } catch {
      showToast("Error", "Network error.", "warning");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = posts.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return (
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.author_name.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <AdminShell
      title="News & Announcements"
      subtitle="Create, format, schedule, draft, and publish patch notes and community news."
      actions={
        <button type="button" onClick={openCreate} className="btn small text-xs">
          <Plus className="h-3.5 w-3.5" />
          <span>New Article</span>
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {(["all", "published", "draft"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase ${
                  statusFilter === s
                    ? "bg-[#ff9a1f] text-[#0a0d22]"
                    : "bg-[#0f1535] text-[#a3abd6] border border-white/[0.08]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="h-4 w-4 text-[#7d87b8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles..."
              className="w-full sm:w-64 pl-9 pr-3 py-2 rounded-xl bg-[#0f1535] border border-white/[0.1] text-xs text-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex items-center justify-center gap-2 text-[#a3abd6]">
            <Loader2 className="h-6 w-6 animate-spin text-[#ff9a1f]" />
            <span className="text-xs">Loading articles...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((post) => (
              <div
                key={post.id}
                className="rounded-2xl bg-[#0f1535] border border-white/[0.08] overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="h-36 bg-[#080b1c] relative overflow-hidden">
                    <img
                      src={post.cover_image || "/images/store-banner.jpg"}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-[#ff9a1f] text-[#0a0d22] text-[10px] font-extrabold uppercase">
                        {post.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleStatus(post)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          post.status === "published"
                            ? "bg-emerald-500 text-[#080b1c]"
                            : "bg-slate-800 text-slate-200 border border-white/20"
                        }`}
                      >
                        {post.status === "published" ? (
                          <CheckCircle2 className="h-2.5 w-2.5" />
                        ) : (
                          <FileEdit className="h-2.5 w-2.5" />
                        )}
                        <span>{post.status}</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-head text-lg text-white leading-snug line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-xs text-[#8f98c7] line-clamp-2 mt-1.5">{post.excerpt}</p>
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <span className="text-[11px] font-mono text-[#7d87b8]">
                    {post.author_name} &bull; {post.read_time}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(post)}
                      className="p-1.5 rounded-lg bg-[#141a42] text-[#ff9a1f] hover:bg-[#1b2254]"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(post)}
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Article Editor Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          onClick={() => !saving && setModalOpen(false)}
        >
          <div
            className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-[#0f1433] border border-white/[0.15] p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="font-head text-xl text-white uppercase">
                {editingId ? "Edit News Article" : "Publish News Article"}
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
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Article Title</label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        title: e.target.value,
                        slug: editingId ? form.slug : toSlug(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Slug</label>
                  <input
                    required
                    pattern="^[a-z0-9-]+$"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: toSlug(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value as NewsRow["category"] })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  >
                    <option value="UPDATE">UPDATE</option>
                    <option value="EVENT">EVENT</option>
                    <option value="ANNOUNCEMENT">ANNOUNCEMENT</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as "draft" | "published" })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  >
                    <option value="published">Published (Live)</option>
                    <option value="draft">Draft (Hidden)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Author Name</label>
                  <input
                    required
                    value={form.author_name}
                    onChange={(e) => setForm({ ...form, author_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Author MC Skin</label>
                  <input
                    required
                    value={form.author_skin}
                    onChange={(e) => setForm({ ...form, author_skin: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#a3abd6] block mb-1">Cover Image</label>
                <div className="flex gap-2">
                  <input
                    value={form.cover_image}
                    onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
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
                <label className="text-xs font-bold text-[#a3abd6] block mb-1">Summary / Excerpt</label>
                <textarea
                  rows={2}
                  value={form.excerpt}
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#a3abd6] block mb-1">Article Body</label>
                <RichTextEditor
                  value={form.content_html || ""}
                  onChange={(html) => setForm({ ...form, content_html: html })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Read Time</label>
                  <input
                    value={form.read_time}
                    onChange={(e) => setForm({ ...form, read_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-xs text-white"
                  />
                </div>
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
                  {saving ? "Saving..." : editingId ? "Update Article" : "Save Article"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <MediaPickerModal
        open={mediaOpen}
        defaultFolder="news"
        selectedUrl={form.cover_image}
        onSelect={(url) => setForm({ ...form, cover_image: url })}
        onClose={() => setMediaOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete News Article?"
        description={`Permanently delete "${deleteTarget?.title}"?`}
        confirmLabel="Delete Article"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminShell>
  );
}
