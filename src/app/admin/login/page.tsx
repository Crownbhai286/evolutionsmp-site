"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Mail,
  KeyRound,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  Database,
} from "lucide-react";
import {
  createSupabaseBrowserClient,
  isSupabasePublicConfigured,
} from "@/lib/supabase/client";
import { useToast } from "@/components/NotificationToast";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const supabaseReady = isSupabasePublicConfigured();
  const urlError = searchParams?.get("error");
  const setupParam = searchParams?.get("setup");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() => {
    if (urlError === "unauthorized") {
      return "Your account is signed in but is not authorized in admin_users (or is disabled). Contact an Owner administrator.";
    }
    if (urlError === "supabase_unconfigured" || setupParam === "missing") {
      return "Supabase environment variables are not configured yet. See setup instructions below.";
    }
    return "";
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError("");

    if (!supabaseReady) {
      setError("Supabase environment variables are not configured yet.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Unable to initialize Supabase browser client.");
      return;
    }

    setBusy(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInErr) {
        setError(signInErr.message || "Invalid email or password.");
        return;
      }

      const verifyRes = await fetch("/api/admin/auth/login-event", {
        method: "POST",
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        await supabase.auth.signOut();
        setError(
          verifyData.error ||
            "Your account does not have active admin dashboard privileges."
        );
        return;
      }

      showToast(
        "Welcome back",
        `Signed in as ${verifyData.admin?.displayName || email.trim()}`,
        "success"
      );

      const rawNext = searchParams?.get("redirect") || "/admin";
      const safeNext =
        /^\/admin(\/|$|\?)/.test(rawNext) && !rawNext.includes("\\")
          ? rawNext
          : "/admin";
      router.replace(safeNext);
      router.refresh();
    } catch {
      setError("Unable to complete authentication request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 relative overflow-hidden bg-[#080b1c]">
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[560px] h-[560px] rounded-full bg-gradient-to-br from-[#ff9a1f]/15 via-[#ff3d5a]/10 to-transparent blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#a3abd6] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to EvolutionSMP</span>
          </Link>

          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#8f98c7]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#ff9a1f]" />
            <span>Invite-Only Staff Portal</span>
          </span>
        </div>

        <div className="rounded-3xl bg-[#0e1433]/95 border border-[rgba(130,150,255,0.24)] shadow-2xl p-7 sm:p-8 backdrop-blur-xl">
          <div className="flex items-center gap-3.5 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-[#080b1c] border border-[#3aa0ff]/40 p-1.5 flex items-center justify-center shrink-0">
              <Image
                src="/logo.png"
                alt="EvolutionSMP Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="kicker mb-1">Admin Auth</span>
              <h1 className="font-head text-2xl sm:text-3xl text-white uppercase tracking-wide">
                Control Panel Login
              </h1>
            </div>
          </div>

          {!supabaseReady && (
            <div className="mb-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <Database className="h-4 w-4 shrink-0" />
                <span>Supabase Configuration Required</span>
              </div>
              <p className="leading-relaxed text-amber-100/90">
                Add <code className="font-mono text-white">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
                <code className="font-mono text-white">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and{" "}
                <code className="font-mono text-white">SUPABASE_SERVICE_ROLE_KEY</code> to{" "}
                <code className="font-mono text-white">.env.local</code>, apply{" "}
                <code className="font-mono text-white">supabase/migrations/001_initial_schema.sql</code>,
                then run <code className="font-mono text-white">npm run db:seed</code> to create your
                first owner admin account.
              </p>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="text-xs font-bold uppercase tracking-wider text-[#a3abd6] block mb-1.5"
              >
                Admin Email
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-[#7d87b8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@evolutionsmp.fun"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ff9a1f]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="text-xs font-bold uppercase tracking-wider text-[#a3abd6] block mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <KeyRound className="h-4 w-4 text-[#7d87b8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ff9a1f]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy || !supabaseReady}
              className="btn w-full py-3.5 text-sm font-extrabold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Sign In to Dashboard</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-5 pt-4 border-t border-white/[0.08] text-[11px] text-center text-[#7d87b8]">
            Public registration is disabled. Only Owner-authorized accounts in{" "}
            <code className="font-mono text-[#a3abd6]">admin_users</code> may access this panel.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080b1c] flex items-center justify-center text-xs text-[#a3abd6]">
          Loading authentication portal...
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
