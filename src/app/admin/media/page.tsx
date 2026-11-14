"use client";

import React, { useEffect, useState } from "react";
import {
  Upload,
  Search,
  Copy,
  Trash2,
  RefreshCw,
  Eye,
  X,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import type { MediaRecord } from "@/components/admin/MediaPickerModal";
import { MEDIA_FOLDERS } from "@/lib/validations";
import { copyToClipboard } from "@/lib/utils";
import { useToast } from "@/components/NotificationToast";

export default function AdminMediaPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<MediaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [folder, setFolder] = useState<string>("all");
  const [uploadFolder, setUploadFolder] = useState<string>("general");
  const [search, setSearch] = useState("");
  const [previewItem, setPreviewItem] = useState<MediaRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMedia = async (targetFolder = folder) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/media?folder=${encodeURIComponent(targetFolder)}`);
      const json = await res.json();
      if (!res.ok) {
        showToast("Error", json.error || "Failed to load media library.", "warning");
        return;
      }
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch {
      showToast("Error", "Network error loading media.", "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia("all");
  }, []);

  const uploadFile = async (file: File, replaceId?: string) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", uploadFolder);
      if (replaceId) formData.append("replaceId", replaceId);

      const res = await fetch("/api/admin/media", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        showToast("Upload Failed", json.error || "Check file type (JPG/PNG/WebP/GIF) and 5MB limit.", "warning");
        return;
      }
      showToast(replaceId ? "Image Replaced" : "Uploaded", `${file.name} saved to Supabase Storage.`, "success");
      setPreviewItem(null);
      fetchMedia(folder);
    } catch {
      showToast("Upload Error", "Network error uploading file.", "warning");
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/media/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        showToast("Delete Failed", json.error || "Could not remove file.", "warning");
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast("Deleted", "Media file removed from storage.", "success");
    } catch {
      showToast("Delete Error", "Network error deleting media.", "warning");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = items.filter((i) =>
    i.file_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminShell
      title="Media Library"
      subtitle="Upload, organize, replace, and reuse images in Supabase Storage."
    >
      <div className="space-y-6">
        {/* Upload Bar */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) uploadFile(file);
          }}
          className="rounded-2xl p-6 bg-[#0f1535] border border-dashed border-[#ff9a1f]/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-[#ff9a1f]/15 text-[#ff9a1f] flex items-center justify-center shrink-0">
              <ImageIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-head text-lg text-white uppercase">Upload Image Asset</h2>
              <p className="text-xs text-[#8f98c7]">
                Drag &amp; drop or choose a JPG, PNG, WebP, or GIF image (max 5MB).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <select
              value={uploadFolder}
              onChange={(e) => setUploadFolder(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-xs font-bold text-white uppercase"
            >
              {MEDIA_FOLDERS.map((f) => (
                <option key={f} value={f}>
                  Folder: {f}
                </option>
              ))}
            </select>

            <label className="btn small text-xs cursor-pointer">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              <span>{uploading ? "Uploading..." : "Choose & Upload"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={uploading}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadFile(file);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {["all", ...MEDIA_FOLDERS].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setFolder(f);
                  fetchMedia(f);
                }}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  folder === f
                    ? "bg-[#ff9a1f] text-[#0a0d22]"
                    : "bg-[#0f1535] text-[#a3abd6] hover:text-white border border-white/[0.08]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="h-4 w-4 text-[#8f98c7] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter filename..."
              className="w-full sm:w-64 pl-9 pr-3 py-2 rounded-xl bg-[#0f1535] border border-white/[0.1] text-xs text-white placeholder-slate-500"
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="py-16 flex items-center justify-center text-[#a3abd6] gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-[#ff9a1f]" />
            <span className="text-xs">Loading media...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl p-12 bg-[#0f1535] border border-white/[0.08] text-center text-sm text-[#8f98c7]">
            No images found in this view.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-[#0f1535] border border-white/[0.08] overflow-hidden flex flex-col justify-between"
              >
                <div className="aspect-video bg-[#080b1c] relative group overflow-hidden">
                  <img
                    src={item.public_url}
                    alt={item.file_name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPreviewItem(item)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs font-bold text-white"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Preview / Replace</span>
                  </button>
                </div>

                <div className="p-3.5 space-y-2.5">
                  <div>
                    <p className="text-xs font-bold text-white truncate">{item.file_name}</p>
                    <p className="text-[11px] font-mono text-[#7d87b8]">
                      {item.folder} &bull; {Math.max(1, Math.round(item.size_bytes / 1024))} KB
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                    <button
                      type="button"
                      onClick={async () => {
                        await copyToClipboard(item.public_url);
                        showToast("URL Copied", "Public storage URL copied to clipboard.", "success");
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[#141a42] text-[11px] font-bold text-white hover:bg-[#1b2254]"
                    >
                      <Copy className="h-3 w-3 text-[#3aa0ff]" />
                      <span>Copy URL</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      title="Delete file"
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

      {/* Preview & Replace Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-[#0f1433] border border-white/[0.15] p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-head text-lg text-white truncate">{previewItem.file_name}</h3>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="p-1.5 rounded-lg bg-[#141a42] text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl bg-[#080b1c] border border-white/[0.08] overflow-hidden max-h-[55vh] flex items-center justify-center">
              <img
                src={previewItem.public_url}
                alt={previewItem.file_name}
                className="max-h-[55vh] object-contain"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <input
                readOnly
                value={previewItem.public_url}
                className="flex-1 px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.1] text-xs font-mono text-[#a3abd6]"
              />
              <label className="btn small text-xs cursor-pointer">
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Replace Image</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadFile(file, previewItem.id);
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Media File?"
        description={`This will permanently remove "${deleteTarget?.file_name}" from Supabase Storage. Any page still referencing its URL will lose the image.`}
        confirmLabel="Delete Permanently"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminShell>
  );
}
