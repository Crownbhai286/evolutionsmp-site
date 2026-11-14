"use client";

import React, { useEffect, useState } from "react";
import { Save, Image as ImageIcon, Loader2, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import MediaPickerModal from "@/components/admin/MediaPickerModal";
import { useToast } from "@/components/NotificationToast";

interface HomepageSectionRow {
  section_key: "hero" | "modes" | "gallery" | "join" | "leaderboards" | "discord" | "footer";
  kicker: string;
  title: string;
  subtitle: string;
  is_enabled: boolean;
  sort_order: number;
  content: Record<string, unknown>;
}

export default function AdminHomepagePage() {
  const { showToast } = useToast();
  const [sections, setSections] = useState<HomepageSectionRow[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("hero");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<{
    mode: "hero_bg" | "modes_banner" | "gallery_item";
    index?: number;
  } | null>(null);

  const loadSections = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/homepage");
      const json = await res.json();
      if (res.ok && Array.isArray(json.sections)) {
        setSections(json.sections);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSections();
  }, []);

  const activeSection = sections.find((s) => s.section_key === selectedKey);

  const updateActive = (patch: Partial<HomepageSectionRow>) => {
    setSections((prev) =>
      prev.map((s) => (s.section_key === selectedKey ? { ...s, ...patch } : s))
    );
  };

  const updateContent = (contentPatch: Record<string, unknown>) => {
    if (!activeSection) return;
    updateActive({
      content: { ...activeSection.content, ...contentPatch },
    });
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSection || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/homepage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activeSection),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast("Error", json.error || "Failed to update section.", "warning");
        return;
      }
      showToast("Section Saved", `${activeSection.section_key} section updated live.`, "success");
    } finally {
      setSaving(false);
    }
  };

  const galleryItems = Array.isArray(activeSection?.content?.items)
    ? (activeSection.content.items as Array<{
        id: string;
        img: string;
        caption: string;
        desc?: string;
      }>)
    : [];

  return (
    <AdminShell
      title="Homepage Sections Builder"
      subtitle="Customize Hero, Survival Showcase, Gallery images, How to Join steps, Discord & Footer cards."
    >
      {loading ? (
        <div className="py-20 flex items-center justify-center gap-2 text-[#a3abd6]">
          <Loader2 className="h-6 w-6 animate-spin text-[#ff9a1f]" />
          <span className="text-xs">Loading sections...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Section Switcher */}
          <div className="rounded-2xl p-4 bg-[#0f1535] border border-white/[0.08] space-y-1.5 h-fit">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#8f98c7] px-2 mb-2">
              Sections
            </h2>
            {sections
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((sec) => (
                <button
                  key={sec.section_key}
                  type="button"
                  onClick={() => setSelectedKey(sec.section_key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold uppercase ${
                    selectedKey === sec.section_key
                      ? "bg-[#ff9a1f]/20 text-white border border-[#ff9a1f]/40"
                      : "text-[#a3abd6] hover:bg-white/[0.04]"
                  }`}
                >
                  <span>{sec.section_key}</span>
                  {sec.is_enabled ? (
                    <Eye className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-slate-500" />
                  )}
                </button>
              ))}
          </div>

          {/* Editor Panel */}
          {activeSection && (
            <form
              onSubmit={handleSaveSection}
              className="lg:col-span-3 rounded-2xl p-6 bg-[#0f1535] border border-white/[0.08] space-y-5"
            >
              <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-white/[0.08]">
                <div>
                  <h2 className="font-head text-xl text-white uppercase">
                    Editing: {activeSection.section_key} Section
                  </h2>
                  <p className="text-xs text-[#8f98c7]">
                    Order #{activeSection.sort_order} on homepage
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeSection.is_enabled}
                      onChange={(e) => updateActive({ is_enabled: e.target.checked })}
                    />
                    <span>Section Visible</span>
                  </label>

                  <button type="submit" disabled={saving} className="btn small text-xs">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    <span>Save Section</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Kicker Badge</label>
                  <input
                    value={activeSection.kicker}
                    onChange={(e) => updateActive({ kicker: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Section Title</label>
                  <input
                    value={activeSection.title}
                    onChange={(e) => updateActive({ title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Sort Order</label>
                  <input
                    type="number"
                    min={0}
                    value={activeSection.sort_order}
                    onChange={(e) =>
                      updateActive({ sort_order: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm font-mono text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#a3abd6] block mb-1">Subtitle / Description</label>
                <textarea
                  rows={2}
                  value={activeSection.subtitle}
                  onChange={(e) => updateActive({ subtitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                />
              </div>

              {/* Section-Specific Fields */}
              {activeSection.section_key === "hero" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-white/[0.08]">
                  <div>
                    <label className="text-xs font-bold text-[#a3abd6] block mb-1">Hero Line 1</label>
                    <input
                      value={String(activeSection.content?.line1 || "")}
                      onChange={(e) => updateContent({ line1: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#a3abd6] block mb-1">
                      Hero Line 2 (Gradient)
                    </label>
                    <input
                      value={String(activeSection.content?.line2 || "")}
                      onChange={(e) => updateContent({ line2: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                    />
                  </div>
                </div>
              )}

              {activeSection.section_key === "modes" && (
                <div className="space-y-3.5 pt-2 border-t border-white/[0.08]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-bold text-[#a3abd6] block mb-1">Showcase Card Title</label>
                      <input
                        value={String(activeSection.content?.showcaseTitle || "")}
                        onChange={(e) => updateContent({ showcaseTitle: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#a3abd6] block mb-1">Banner Image</label>
                      <div className="flex gap-2">
                        <input
                          value={String(activeSection.content?.bannerUrl || "")}
                          onChange={(e) => updateContent({ bannerUrl: e.target.value })}
                          className="flex-1 px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-xs font-mono text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setMediaTarget({ mode: "modes_banner" })}
                          className="px-3 py-2 rounded-xl bg-[#141a42] text-xs font-bold text-white"
                        >
                          <ImageIcon className="h-4 w-4 text-[#ff9a1f]" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#a3abd6] block mb-1">Showcase Description</label>
                    <textarea
                      rows={3}
                      value={String(activeSection.content?.showcaseDescription || "")}
                      onChange={(e) => updateContent({ showcaseDescription: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                    />
                  </div>
                </div>
              )}

              {activeSection.section_key === "gallery" && (
                <div className="space-y-3 pt-2 border-t border-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase text-[#a3abd6]">
                      Gallery Screenshots ({galleryItems.length})
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateContent({
                          items: [
                            ...galleryItems,
                            {
                              id: `img-${Date.now()}`,
                              img: "/images/survival-spawn-hub-v2.jpg",
                              caption: "New Survival Screenshot",
                            },
                          ],
                        })
                      }
                      className="text-xs font-bold text-[#ff9a1f] inline-flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Screenshot</span>
                    </button>
                  </div>

                  {galleryItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3 rounded-xl bg-[#080b1c] border border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 gap-3 items-center"
                    >
                      <div className="flex gap-2 items-center">
                        <input
                          value={item.img}
                          onChange={(e) => {
                            const next = [...galleryItems];
                            next[idx] = { ...item, img: e.target.value };
                            updateContent({ items: next });
                          }}
                          placeholder="Image URL"
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#0f1535] border border-white/[0.1] text-xs font-mono text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setMediaTarget({ mode: "gallery_item", index: idx })}
                          className="p-1.5 rounded-lg bg-[#141a42] text-[#ff9a1f]"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={item.caption}
                          onChange={(e) => {
                            const next = [...galleryItems];
                            next[idx] = { ...item, caption: e.target.value };
                            updateContent({ items: next });
                          }}
                          placeholder="Caption"
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#0f1535] border border-white/[0.1] text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateContent({
                              items: galleryItems.filter((_, i) => i !== idx),
                            })
                          }
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeSection.section_key === "join" && (
                <div className="space-y-3.5 pt-2 border-t border-white/[0.08]">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="text-xs font-bold text-[#a3abd6] block mb-1">Step 1 Title</label>
                      <input
                        value={String(activeSection.content?.step1Title || "")}
                        onChange={(e) => updateContent({ step1Title: e.target.value })}
                        placeholder="Launch Minecraft"
                        className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#a3abd6] block mb-1">Step 2 Title</label>
                      <input
                        value={String(activeSection.content?.step2Title || "")}
                        onChange={(e) => updateContent({ step2Title: e.target.value })}
                        placeholder="Add the Server"
                        className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#a3abd6] block mb-1">Step 3 Title</label>
                      <input
                        value={String(activeSection.content?.step3Title || "")}
                        onChange={(e) => updateContent({ step3Title: e.target.value })}
                        placeholder="Begin Your Survival"
                        className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-bold text-[#a3abd6] block mb-1">Step 1 Description</label>
                      <textarea
                        rows={2}
                        value={String(activeSection.content?.step1Desc || "")}
                        onChange={(e) => updateContent({ step1Desc: e.target.value })}
                        placeholder="Java or Bedrock, version 1.20 to 1.21+..."
                        className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#a3abd6] block mb-1">Step 3 Description</label>
                      <textarea
                        rows={2}
                        value={String(activeSection.content?.step3Desc || "")}
                        onChange={(e) => updateContent({ step3Desc: e.target.value })}
                        placeholder="Join the Survival world..."
                        className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {(activeSection.section_key === "discord" ||
                activeSection.section_key === "footer") && (
                <div className="pt-2 border-t border-white/[0.08]">
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">
                    CTA Button Label
                  </label>
                  <input
                    value={String(activeSection.content?.ctaLabel || "")}
                    onChange={(e) => updateContent({ ctaLabel: e.target.value })}
                    className="w-full max-w-xs px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
              )}
            </form>
          )}
        </div>
      )}

      <MediaPickerModal
        open={Boolean(mediaTarget)}
        defaultFolder="gallery"
        onSelect={(url) => {
          if (!mediaTarget) return;
          if (mediaTarget.mode === "modes_banner") {
            updateContent({ bannerUrl: url });
          } else if (
            mediaTarget.mode === "gallery_item" &&
            typeof mediaTarget.index === "number"
          ) {
            const next = [...galleryItems];
            if (next[mediaTarget.index]) {
              next[mediaTarget.index] = { ...next[mediaTarget.index], img: url };
              updateContent({ items: next });
            }
          }
        }}
        onClose={() => setMediaTarget(null)}
      />
    </AdminShell>
  );
}
