"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Loader2,
  X,
} from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/NotificationToast";

interface RuleCategoryRow {
  id: string;
  slug: string;
  name: string;
  icon_name: string;
  sort_order: number;
  is_enabled: boolean;
}

interface RuleRow {
  id: string;
  category_id: string;
  slug: string;
  rule_number: string;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "ZERO TOLERANCE";
  punishment: string;
  examples: string[];
  sort_order: number;
  is_enabled: boolean;
}

function toSlug(val: string) {
  return val
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export default function AdminRulesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<RuleCategoryRow[]>([]);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [draggedRuleId, setDraggedRuleId] = useState<string | null>(null);

  // Category modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catOrder, setCatOrder] = useState(1);

  // Rule modal
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleForm, setRuleForm] = useState<Omit<RuleRow, "id">>({
    category_id: "",
    slug: "",
    rule_number: "1.1",
    title: "",
    description: "",
    severity: "MEDIUM",
    punishment: "24h Mute / Warning",
    examples: [],
    sort_order: 1,
    is_enabled: true,
  });
  const [examplesText, setExamplesText] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{
    kind: "category" | "rule";
    id: string;
    label: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catRes, ruleRes] = await Promise.all([
        fetch("/api/admin/rules/categories"),
        fetch("/api/admin/rules"),
      ]);
      const [catJson, ruleJson] = await Promise.all([catRes.json(), ruleRes.json()]);
      const cats = (catJson.items || []) as RuleCategoryRow[];
      setCategories(cats);
      setRules((ruleJson.items || []) as RuleRow[]);
      if (!selectedCatId && cats.length > 0) setSelectedCatId(cats[0].id);
    } catch {
      showToast("Error", "Failed to load rules.", "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const visibleRules = rules
    .filter((r) => !selectedCatId || r.category_id === selectedCatId)
    .sort((a, b) => a.sort_order - b.sort_order);

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(
        editingCatId
          ? `/api/admin/rules/categories/${editingCatId}`
          : "/api/admin/rules/categories",
        {
          method: editingCatId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: catName.trim(),
            slug: toSlug(catName),
            sort_order: catOrder,
            is_enabled: true,
          }),
        }
      );
      if (!res.ok) {
        const j = await res.json();
        showToast("Error", j.error || "Failed to save category.", "warning");
        return;
      }
      setCatModalOpen(false);
      showToast("Category Saved", "Rule category updated.", "success");
      loadData();
    } finally {
      setSaving(false);
    }
  };

  const openAddRule = () => {
    setEditingRuleId(null);
    setRuleForm({
      category_id: selectedCatId || categories[0]?.id || "",
      slug: "",
      rule_number: `${visibleRules.length + 1}`,
      title: "",
      description: "",
      severity: "MEDIUM",
      punishment: "Warning -> Temporary Ban",
      examples: [],
      sort_order: visibleRules.length + 1,
      is_enabled: true,
    });
    setExamplesText("");
    setRuleModalOpen(true);
  };

  const openEditRule = (r: RuleRow) => {
    setEditingRuleId(r.id);
    setRuleForm({
      category_id: r.category_id,
      slug: r.slug,
      rule_number: r.rule_number,
      title: r.title,
      description: r.description,
      severity: r.severity,
      punishment: r.punishment,
      examples: r.examples || [],
      sort_order: r.sort_order,
      is_enabled: r.is_enabled,
    });
    setExamplesText((r.examples || []).join("\n"));
    setRuleModalOpen(true);
  };

  const saveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const examples = examplesText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const payload = {
      ...ruleForm,
      slug: ruleForm.slug.trim() || toSlug(`${ruleForm.rule_number}-${ruleForm.title}`),
      examples,
    };

    try {
      const res = await fetch(
        editingRuleId ? `/api/admin/rules/${editingRuleId}` : "/api/admin/rules",
        {
          method: editingRuleId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        showToast("Error", json.error || "Failed to save rule.", "warning");
        return;
      }
      setRuleModalOpen(false);
      showToast("Rule Saved", `§ ${payload.rule_number} ${payload.title} saved.`, "success");
      loadData();
    } finally {
      setSaving(false);
    }
  };

  const persistOrder = async (reordered: RuleRow[]) => {
    const updates = reordered.map((r, idx) => ({ id: r.id, sort_order: idx + 1 }));
    setRules((prev) =>
      prev.map((r) => {
        const match = updates.find((u) => u.id === r.id);
        return match ? { ...r, sort_order: match.sort_order } : r;
      })
    );
    const res = await fetch("/api/admin/rules/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
    if (res.ok) showToast("Order Saved", "Rule order persisted.", "info");
  };

  const moveRule = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= visibleRules.length) return;
    const copy = [...visibleRules];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    persistOrder(copy);
  };

  const handleDropOnRule = (targetId: string) => {
    if (!draggedRuleId || draggedRuleId === targetId) return;
    const fromIdx = visibleRules.findIndex((r) => r.id === draggedRuleId);
    const toIdx = visibleRules.findIndex((r) => r.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const copy = [...visibleRules];
    const [item] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, item);
    setDraggedRuleId(null);
    persistOrder(copy);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const endpoint =
        deleteTarget.kind === "category"
          ? `/api/admin/rules/categories/${deleteTarget.id}`
          : `/api/admin/rules/${deleteTarget.id}`;
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        showToast("Delete Failed", "Unable to delete.", "warning");
        return;
      }
      setDeleteTarget(null);
      showToast("Deleted", `${deleteTarget.label} removed.`, "success");
      loadData();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminShell
      title="Server Rules Manager"
      subtitle="Manage rule categories, severity levels, punishments, and drag-and-drop ordering."
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingCatId(null);
              setCatName("");
              setCatOrder(categories.length + 1);
              setCatModalOpen(true);
            }}
            className="px-3 py-2 rounded-xl bg-[#141a42] border border-white/[0.12] text-xs font-bold text-white"
          >
            + Category
          </button>
          <button type="button" onClick={openAddRule} className="btn small text-xs">
            <Plus className="h-3.5 w-3.5" />
            <span>New Rule</span>
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="py-20 flex items-center justify-center gap-2 text-[#a3abd6]">
          <Loader2 className="h-6 w-6 animate-spin text-[#ff9a1f]" />
          <span className="text-xs">Loading server rules...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Categories Sidebar */}
          <div className="rounded-2xl p-4 bg-[#0f1535] border border-white/[0.08] space-y-2 h-fit">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#8f98c7] px-2 mb-2">
              Rule Categories
            </h2>
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                  selectedCatId === cat.id
                    ? "bg-[#ff9a1f]/20 text-white border border-[#ff9a1f]/40"
                    : "text-[#a3abd6] hover:bg-white/[0.04]"
                }`}
                onClick={() => setSelectedCatId(cat.id)}
              >
                <span className="truncate">{cat.name}</span>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCatId(cat.id);
                      setCatName(cat.name);
                      setCatOrder(cat.sort_order);
                      setCatModalOpen(true);
                    }}
                    className="p-1 text-[#8f98c7] hover:text-white"
                  >
                    <Edit3 className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteTarget({ kind: "category", id: cat.id, label: cat.name })
                    }
                    className="p-1 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Rules List (Drag-and-drop & Arrows) */}
          <div className="lg:col-span-3 space-y-3">
            {visibleRules.map((rule, idx) => (
              <div
                key={rule.id}
                draggable
                onDragStart={() => setDraggedRuleId(rule.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropOnRule(rule.id)}
                className="rounded-2xl p-4 bg-[#0f1535] border border-white/[0.08] flex items-start justify-between gap-4 hover:border-white/[0.16]"
              >
                <div className="flex items-start gap-3">
                  <GripVertical className="h-4 w-4 text-[#6f78a8] mt-1 cursor-grab shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-[#ff9a1f] bg-[#080b1c] px-2 py-0.5 rounded">
                        § {rule.rule_number}
                      </span>
                      <h3 className="font-bold text-white text-sm">{rule.title}</h3>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-500/15 text-red-300">
                        {rule.severity}
                      </span>
                    </div>
                    <p className="text-xs text-[#a3abd6] mt-1.5 leading-relaxed">
                      {rule.description}
                    </p>
                    <p className="text-[11px] font-mono text-[#ffc23d] mt-2">
                      Punishment: {rule.punishment}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveRule(idx, -1)}
                    className="p-1.5 rounded-lg bg-[#141a42] text-slate-300 disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === visibleRules.length - 1}
                    onClick={() => moveRule(idx, 1)}
                    className="p-1.5 rounded-lg bg-[#141a42] text-slate-300 disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditRule(rule)}
                    className="p-1.5 rounded-lg bg-[#141a42] text-[#ff9a1f]"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteTarget({
                        kind: "rule",
                        id: rule.id,
                        label: `§ ${rule.rule_number} ${rule.title}`,
                      })
                    }
                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {visibleRules.length === 0 && (
              <div className="rounded-2xl p-10 bg-[#0f1535] border border-white/[0.08] text-center text-xs text-[#8f98c7]">
                No rules in this category yet. Click &ldquo;New Rule&rdquo; to add one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category Modal */}
      {catModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setCatModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#0f1433] border border-white/[0.15] p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-head text-lg text-white uppercase">
                {editingCatId ? "Edit Category" : "New Rule Category"}
              </h3>
              <button
                type="button"
                onClick={() => setCatModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#141a42] text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={saveCategory} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#a3abd6] block mb-1">Name</label>
                <input
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#a3abd6] block mb-1">Sort Order</label>
                <input
                  type="number"
                  value={catOrder}
                  onChange={(e) => setCatOrder(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#141a42] text-xs font-bold text-[#c7ccf0]"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn small text-xs">
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rule Modal */}
      {ruleModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85"
          onClick={() => setRuleModalOpen(false)}
        >
          <div
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0f1433] border border-white/[0.15] p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-head text-lg text-white uppercase">
                {editingRuleId ? "Edit Server Rule" : "Add Server Rule"}
              </h3>
              <button
                type="button"
                onClick={() => setRuleModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#141a42] text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={saveRule} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Category</label>
                  <select
                    value={ruleForm.category_id}
                    onChange={(e) => setRuleForm({ ...ruleForm, category_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Rule Number</label>
                  <input
                    required
                    value={ruleForm.rule_number}
                    onChange={(e) => setRuleForm({ ...ruleForm, rule_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Title</label>
                  <input
                    required
                    value={ruleForm.title}
                    onChange={(e) => setRuleForm({ ...ruleForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Severity</label>
                  <select
                    value={ruleForm.severity}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        severity: e.target.value as RuleRow["severity"],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="ZERO TOLERANCE">ZERO TOLERANCE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#a3abd6] block mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#a3abd6] block mb-1">Punishment</label>
                <input
                  required
                  value={ruleForm.punishment}
                  onChange={(e) => setRuleForm({ ...ruleForm, punishment: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#a3abd6] block mb-1">
                  Examples (one per line)
                </label>
                <textarea
                  rows={2}
                  value={examplesText}
                  onChange={(e) => setExamplesText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRuleModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#141a42] text-xs font-bold text-[#c7ccf0]"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn small text-xs">
                  {saving ? "Saving..." : "Save Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Confirm Deletion"
        description={`Delete "${deleteTarget?.label}"? This action cannot be undone.`}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminShell>
  );
}
