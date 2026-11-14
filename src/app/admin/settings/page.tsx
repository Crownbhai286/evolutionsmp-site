"use client";

import React, { useEffect, useState } from "react";
import { Save, RotateCcw, Image as ImageIcon, Loader2, AlertCircle } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import MediaPickerModal from "@/components/admin/MediaPickerModal";
import { useToast } from "@/components/NotificationToast";

interface SettingsFormState {
  server_name: string;
  website_name: string;
  website_tagline: string;
  java_ip: string;
  bedrock_ip: string;
  bedrock_port: number;
  minecraft_version: string;
  season_name: string;
  server_description: string;
  domain: string;
  store_domain: string;
  discord_invite_url: string;
  discord_ticket_url: string;
  discord_guild_id: string;
  youtube_url: string;
  tiktok_url: string;
  twitter_url: string;
  announcement_enabled: boolean;
  announcement_text: string;
  announcement_url: string;
  hero_title: string;
  hero_subtitle: string;
  hero_bg_image: string;
  footer_description: string;
  footer_copyright: string;
}

export default function AdminSettingsPage() {
  const { showToast } = useToast();
  const [form, setForm] = useState<SettingsFormState | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mediaOpen, setMediaOpen] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to load website settings.");
        return;
      }
      const s = json.settings;
      const next: SettingsFormState = {
        server_name: s.server_name || "EvolutionSMP",
        website_name: s.website_name || "EvolutionSMP",
        website_tagline: s.website_tagline || "",
        java_ip: s.java_ip || "",
        bedrock_ip: s.bedrock_ip || "",
        bedrock_port: Number(s.bedrock_port) || 19132,
        minecraft_version: s.minecraft_version || "",
        season_name: s.season_name || "",
        server_description: s.server_description || "",
        domain: s.domain || "",
        store_domain: s.store_domain || "",
        discord_invite_url: s.discord_invite_url || "",
        discord_ticket_url: s.discord_ticket_url || "",
        discord_guild_id: s.discord_guild_id || "",
        youtube_url: s.youtube_url || "",
        tiktok_url: s.tiktok_url || "",
        twitter_url: s.twitter_url || "",
        announcement_enabled: Boolean(s.announcement_enabled),
        announcement_text: s.announcement_text || "",
        announcement_url: s.announcement_url || "",
        hero_title: s.hero_title || "",
        hero_subtitle: s.hero_subtitle || "",
        hero_bg_image: s.hero_bg_image || "",
        footer_description: s.footer_description || "",
        footer_copyright: s.footer_copyright || "",
      };
      setForm(next);
      setInitialSnapshot(JSON.stringify(next));
    } catch {
      setError("Network error loading settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const hasUnsaved = form !== null && JSON.stringify(form) !== initialSnapshot;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || saving) return;

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to save settings.");
        showToast("Save Failed", json.error || "Validation failed.", "warning");
        return;
      }
      setInitialSnapshot(JSON.stringify(form));
      showToast("Settings Updated", "Live website configuration updated.", "success");
    } catch {
      setError("Network error saving settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!initialSnapshot) return;
    setForm(JSON.parse(initialSnapshot));
    showToast("Reverted", "Unsaved changes discarded.", "info");
  };

  return (
    <AdminShell
      title="Website Settings"
      subtitle="Configure Minecraft IPs, Discord links, hero copy, announcement bar, and footer branding."
      actions={
        form && (
          <div className="flex items-center gap-2">
            {hasUnsaved && (
              <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 text-[11px] font-bold border border-amber-500/30">
                Unsaved changes
              </span>
            )}
            <button
              type="button"
              disabled={!hasUnsaved || saving}
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141a42] border border-white/[0.1] text-xs font-bold text-[#c7ccf0] hover:text-white disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              disabled={!hasUnsaved || saving}
              onClick={handleSave}
              className="btn small text-xs disabled:opacity-45"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>Save Settings</span>
            </button>
          </div>
        )
      }
    >
      {loading ? (
        <div className="py-24 flex items-center justify-center text-[#a3abd6] gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-[#ff9a1f]" />
          <span className="text-xs">Loading settings...</span>
        </div>
      ) : error && !form ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        form && (
          <form onSubmit={handleSave} className="space-y-6">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Server Identity & IPs */}
            <section className="rounded-2xl p-6 bg-[#0f1535] border border-white/[0.08] space-y-4">
              <h2 className="font-head text-lg text-white uppercase tracking-wide">
                Server Identity &amp; Connection IPs
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Server Name</label>
                  <input
                    required
                    value={form.server_name}
                    onChange={(e) => setForm({ ...form, server_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Website Name</label>
                  <input
                    required
                    value={form.website_name}
                    onChange={(e) => setForm({ ...form, website_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Tagline</label>
                  <input
                    value={form.website_tagline}
                    onChange={(e) => setForm({ ...form, website_tagline: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Java IP</label>
                  <input
                    required
                    value={form.java_ip}
                    onChange={(e) => setForm({ ...form, java_ip: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Bedrock IP</label>
                  <input
                    required
                    value={form.bedrock_ip}
                    onChange={(e) => setForm({ ...form, bedrock_ip: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Bedrock Port</label>
                  <input
                    type="number"
                    min={1}
                    max={65535}
                    required
                    value={form.bedrock_port}
                    onChange={(e) => setForm({ ...form, bedrock_port: Number(e.target.value) || 19132 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Minecraft Version</label>
                  <input
                    value={form.minecraft_version}
                    onChange={(e) => setForm({ ...form, minecraft_version: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Season Label</label>
                  <input
                    value={form.season_name}
                    onChange={(e) => setForm({ ...form, season_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Primary Domain</label>
                  <input
                    value={form.domain}
                    onChange={(e) => setForm({ ...form, domain: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm font-mono text-white"
                  />
                </div>
              </div>
            </section>

            {/* Discord & Socials */}
            <section className="rounded-2xl p-6 bg-[#0f1535] border border-white/[0.08] space-y-4">
              <h2 className="font-head text-lg text-white uppercase tracking-wide">
                Discord Support &amp; Social Links
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Discord Invite URL</label>
                  <input
                    required
                    value={form.discord_invite_url}
                    onChange={(e) => setForm({ ...form, discord_invite_url: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">
                    Discord Ticket King Panel URL
                  </label>
                  <input
                    required
                    value={form.discord_ticket_url}
                    onChange={(e) => setForm({ ...form, discord_ticket_url: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">YouTube URL</label>
                  <input
                    value={form.youtube_url}
                    onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">TikTok URL</label>
                  <input
                    value={form.tiktok_url}
                    onChange={(e) => setForm({ ...form, tiktok_url: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
              </div>
            </section>

            {/* Announcement Bar */}
            <section className="rounded-2xl p-6 bg-[#0f1535] border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-head text-lg text-white uppercase tracking-wide">
                  Global Announcement Bar
                </h2>
                <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.announcement_enabled}
                    onChange={(e) => setForm({ ...form, announcement_enabled: e.target.checked })}
                  />
                  <span>Enable Banner</span>
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Announcement Text</label>
                  <input
                    value={form.announcement_text}
                    onChange={(e) => setForm({ ...form, announcement_text: e.target.value })}
                    placeholder="Season 4 Summer Sale is live — 25% off ranks!"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Action Link</label>
                  <input
                    value={form.announcement_url}
                    onChange={(e) => setForm({ ...form, announcement_url: e.target.value })}
                    placeholder="/store"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
              </div>
            </section>

            {/* Hero & Footer Branding */}
            <section className="rounded-2xl p-6 bg-[#0f1535] border border-white/[0.08] space-y-4">
              <h2 className="font-head text-lg text-white uppercase tracking-wide">
                Hero &amp; Footer Copy
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Hero Background Image</label>
                  <div className="flex gap-2">
                    <input
                      value={form.hero_bg_image}
                      onChange={(e) => setForm({ ...form, hero_bg_image: e.target.value })}
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm font-mono text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setMediaOpen(true)}
                      className="px-3.5 py-2.5 rounded-xl bg-[#141a42] border border-white/[0.12] text-xs font-bold text-white hover:border-[#ff9a1f] inline-flex items-center gap-1.5 shrink-0"
                    >
                      <ImageIcon className="h-4 w-4 text-[#ff9a1f]" />
                      <span>Choose Image</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Footer Copyright Text</label>
                  <input
                    value={form.footer_copyright}
                    onChange={(e) => setForm({ ...form, footer_copyright: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Hero Subtitle</label>
                  <textarea
                    rows={3}
                    value={form.hero_subtitle}
                    onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Footer Description</label>
                  <textarea
                    rows={3}
                    value={form.footer_description}
                    onChange={(e) => setForm({ ...form, footer_description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
              </div>
            </section>
          </form>
        )
      )}

      <MediaPickerModal
        open={mediaOpen}
        defaultFolder="banners"
        selectedUrl={form?.hero_bg_image}
        onSelect={(url) => form && setForm({ ...form, hero_bg_image: url })}
        onClose={() => setMediaOpen(false)}
      />
    </AdminShell>
  );
}
