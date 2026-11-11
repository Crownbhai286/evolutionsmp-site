"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Toast {
  id: string;
  title: string;
  message?: string;
  type?: "success" | "info" | "warning";
}

interface ToastContextType {
  showToast: (title: string, message?: string, type?: "success" | "info" | "warning") => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((title: string, message?: string, type: "success" | "info" | "warning" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-[#0e131f]/95 p-4 shadow-2xl backdrop-blur-xl shadow-emerald-500/10 text-white"
            >
              <div className="mt-0.5 text-emerald-400">
                {toast.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                {toast.type === "info" && <Info className="h-5 w-5 text-cyan-400" />}
                {toast.type === "warning" && <AlertTriangle className="h-5 w-5 text-amber-400" />}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-slate-100">{toast.title}</h4>
                {toast.message && <p className="mt-0.5 text-xs text-slate-400">{toast.message}</p>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
