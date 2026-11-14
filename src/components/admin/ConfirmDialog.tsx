"use client";

import React from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm Delete",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={() => !loading && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-2xl bg-[#0f1433] border border-[rgba(130,150,255,0.28)] shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          disabled={loading}
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#141a42] text-slate-400 hover:text-white disabled:opacity-50"
          aria-label="Close confirmation dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border ${
              variant === "danger"
                ? "bg-red-500/15 border-red-500/35 text-red-400"
                : "bg-amber-500/15 border-amber-500/35 text-amber-400"
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div className="pr-4">
            <h3 className="font-head text-xl text-white tracking-wide">{title}</h3>
            <p className="text-sm text-[#a3abd6] mt-1.5 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-[#141a42] border border-white/[0.1] text-xs font-bold text-[#c7ccf0] hover:text-white hover:bg-[#1b2254] transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold text-white flex items-center gap-2 transition-all disabled:opacity-60 ${
              variant === "danger"
                ? "bg-gradient-to-r from-[#ff3d5a] to-[#e11d48] hover:brightness-110 shadow-lg shadow-red-500/20"
                : "bg-gradient-to-r from-[#ff9a1f] to-[#ff6b00] hover:brightness-110 shadow-lg shadow-amber-500/20"
            }`}
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
