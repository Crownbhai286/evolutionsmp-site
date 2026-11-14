"use client";

import React, { useEffect, useState } from "react";
import {
  Image as ImageIcon,
  Loader2,
  Search,
  Upload,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import { MEDIA_FOLDERS } from "@/lib/validations";

export interface MediaRecord {
  id: string;
  file_name: string;
  storage_path: string;
  public_url: string;
  mime_type: string;
  size_bytes: number;
  folder: string;
  created_at: string;
}

interface MediaPickerModalProps {
  open: boolean;
  defaultFolder?: string;
  selectedUrl?: string | null;
  onSelect: (publicUrl: string, record?: MediaRecord) => void;
  onClose: () => void;
}

export default function MediaPickerModal({
  open,
  defaultFolder = "general",
  selectedUrl,
  onSelect,
  onClose,
}: MediaPickerModalProps) {
  const [items, setItems] = useState<MediaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [folder, setFolder] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const fetchMedia = async (targetFolder = folder) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/media?folder=${encodeURIComponent(targetFolder)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to load media library.");
        return;
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setError("Network error loading media library.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchMedia("all");
      setFolder("all");
    }
  }, [open]);

  if (!open) return null;

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", folder === "all" ? defaultFolder : folder);

      const res = await fetch("/api/admin/media", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to upload image.");
        return;
      }
      if (data.item) {
        setItems((prev) => [data.item, ...prev]);
        onSelect(data.item.public_url, data.item);
        onClose();
      }
    } catch {
      setError("Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  const filtered = items.filter((item) =>
    item.file_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl bg-[#0f1433] border border-[rgba(130,150,255,0.28)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <ImageIcon className="h-5 w-5 text-[#ff9a1f]" />
            <h3 className="font-head text-xl text-white tracking-wide uppercase">
              Select or Upload Media
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#141a42] text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-[#0b1029] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {["all", ...MEDIA_FOLDERS].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setFolder(f);
                  fetchMedia(f);
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  folder === f
                    ? "bg-[#ff9a1f] text-[#0a0d22]"
                    : "bg-[#141a42] text-[#a3abd6] hover:text-white border border-white/[0.08]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-[#a3abd6] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search file..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-[#141a42] border border-white/[0.1] text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#ff9a1f]"
              />
            </div>

            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#ff9a1f] to-[#ff6b00] text-[#0a0d22] text-xs font-extrabold hover:brightness-110 transition-all shrink-0">
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              <span>{uploading ? "Uploading..." : "Upload Image"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={uploading}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-[#a3abd6] gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-[#ff9a1f]" />
              <span className="text-xs">Loading Supabase Storage library...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-[#a3abd6]">
              No uploaded images in this folder yet. Upload a JPG, PNG, WebP, or GIF image (max 5MB).
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {filtered.map((item) => {
                const isSelected = selectedUrl === item.public_url;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelect(item.public_url, item);
                      onClose();
                    }}
                    className={`group relative rounded-xl overflow-hidden bg-[#141a42] border text-left transition-all ${
                      isSelected
                        ? "border-[#ff9a1f] ring-2 ring-[#ff9a1f]/40"
                        : "border-white/[0.1] hover:border-[#ff9a1f]/60"
                    }`}
                  >
                    <div className="aspect-square bg-[#0a0d22] relative overflow-hidden">
                      <img
                        src={item.public_url}
                        alt={item.file_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {isSelected && (
                        <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-[#ff9a1f] text-[#0a0d22] flex items-center justify-center shadow">
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-bold text-white truncate">{item.file_name}</p>
                      <p className="text-[10px] text-[#8f98c7] uppercase font-mono mt-0.5">
                        {item.folder} &bull; {Math.max(1, Math.round(item.size_bytes / 1024))} KB
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
