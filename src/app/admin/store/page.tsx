"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Edit3,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Coins,
  CreditCard,
  Loader2,
  X,
  Save,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import MediaPickerModal from "@/components/admin/MediaPickerModal";
import RankIcon from "@/components/RankIcon";
import { useToast } from "@/components/NotificationToast";

interface StoreProductRow {
  id: string;
  slug: string;
  category_slug: "RANKS" | "KEYS" | "COINS" | "BUNDLES";
  name: string;
  description: string;
  price: number;
  original_price: number | null;
  accent_color: string;
  badge: string | null;
  image_url: string | null;
  icon_name: string;
  perks: string[];
  popular: boolean;
  featured: boolean;
  is_enabled: boolean;
  sort_order: number;
  coin_amount: number | null;
  is_custom_coin: boolean;
  bonus_percent: number | null;
  delivery_command: string;
  tebex_package_id: string;
  checkout_url: string;
}

interface StoreCategoryRow {
  id: string;
  slug: "RANKS" | "KEYS" | "COINS" | "BUNDLES";
  name: string;
  description: string;
  sort_order: number;
  is_enabled: boolean;
}

interface CoinConfigRow {
  min_custom_coins: number;
  max_custom_coins: number;
  base_rate_per_coin: number;
  discount_tiers: Array<{ minCoins: number; unitRate: number }>;
  delivery_command_template: string;
  tebex_package_id: string;
}

const EMPTY_PRODUCT: Omit<StoreProductRow, "id"> = {
  slug: "",
  category_slug: "RANKS",
  name: "",
  description: "",
  price: 9.99,
  original_price: null,
  accent_color: "#ff9a1f",
  badge: "",
  image_url: "",
  icon_name: "Crown",
  perks: [""],
  popular: false,
  featured: false,
  is_enabled: true,
  sort_order: 10,
  coin_amount: null,
  is_custom_coin: false,
  bonus_percent: null,
  delivery_command: "",
  tebex_package_id: "",
  checkout_url: "",
};

function toSlug(val: string) {
  return val
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export default function AdminStorePage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<"products" | "categories" | "coins">("products");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<StoreProductRow[]>([]);
  const [categories, setCategories] = useState<StoreCategoryRow[]>([]);
  const [savingCategorySlug, setSavingCategorySlug] = useState<string | null>(null);
  const [coinConfig, setCoinConfig] = useState<CoinConfigRow | null>(null);
  const [tebexStatus, setTebexStatus] = useState<{
    configured: boolean;
    hasPublicToken: boolean;
    hasSecretKey: boolean;
    hasWebhookSecret?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal & Form states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<StoreProductRow, "id">>(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);
  const [savingCoins, setSavingCoins] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StoreProductRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [prodRes, coinRes, tebexRes] = await Promise.all([
        fetch("/api/admin/store/products"),
        fetch("/api/admin/store/coin-config"),
        fetch("/api/admin/tebex/status"),
      ]);
      const [prodJson, coinJson, tebexJson] = await Promise.all([
        prodRes.json(),
        coinRes.json(),
        tebexRes.json(),
      ]);
      if (prodRes.ok) {
        setProducts(prodJson.products || prodJson.items || []);
        setCategories(prodJson.categories || []);
      }
      if (coinRes.ok && coinJson.coinConfig) setCoinConfig(coinJson.coinConfig);
      if (tebexRes.ok && tebexJson.tebex) setTebexStatus(tebexJson.tebex);
    } catch {
      showToast("Error", "Failed to load store management data.", "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_PRODUCT, perks: ["Instant rank perks in-game"] });
    setModalOpen(true);
  };

  const openEdit = (row: StoreProductRow) => {
    setEditingId(row.id);
    setForm({
      slug: row.slug,
      category_slug: row.category_slug,
      name: row.name,
      description: row.description || "",
      price: Number(row.price),
      original_price: row.original_price ? Number(row.original_price) : null,
      accent_color: row.accent_color || "#ff9a1f",
      badge: row.badge || "",
      image_url: row.image_url || "",
      icon_name: row.icon_name || "PackageCheck",
      perks: Array.isArray(row.perks) && row.perks.length > 0 ? row.perks : [""],
      popular: Boolean(row.popular),
      featured: Boolean(row.featured),
      is_enabled: Boolean(row.is_enabled),
      sort_order: Number(row.sort_order) || 0,
      coin_amount: row.coin_amount ?? null,
      is_custom_coin: Boolean(row.is_custom_coin),
      bonus_percent: row.bonus_percent ?? null,
      delivery_command: row.delivery_command || "",
      tebex_package_id: row.tebex_package_id || "",
      checkout_url: row.checkout_url || "",
    });
    setModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const payload = {
      ...form,
      slug: form.slug.trim() || toSlug(form.name),
      badge: form.badge?.trim() ? form.badge.trim() : null,
      image_url: form.image_url?.trim() ? form.image_url.trim() : null,
      perks: form.perks.map((p) => p.trim()).filter(Boolean),
    };

    setSaving(true);
    try {
      const res = await fetch(
        editingId
          ? `/api/admin/store/products/${editingId}`
          : "/api/admin/store/products",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        showToast("Save Failed", json.error || "Check product fields.", "warning");
        return;
      }
      showToast(
        editingId ? "Product Updated" : "Product Created",
        `${payload.name} saved to Store catalog.`,
        "success"
      );
      setModalOpen(false);
      loadAll();
    } catch {
      showToast("Error", "Network error saving product.", "warning");
    } finally {
      setSaving(false);
    }
  };

  const toggleProductEnabled = async (row: StoreProductRow) => {
    try {
      const res = await fetch(`/api/admin/store/products/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: !row.is_enabled }),
      });
      if (!res.ok) {
        showToast("Error", "Failed to toggle status.", "warning");
        return;
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === row.id ? { ...p, is_enabled: !row.is_enabled } : p))
      );
      showToast(
        !row.is_enabled ? "Product Enabled" : "Product Hidden",
        `${row.name} visibility updated.`,
        "info"
      );
    } catch {
      showToast("Error", "Network error toggling product.", "warning");
    }
  };

  const duplicateProduct = async (row: StoreProductRow) => {
    try {
      const res = await fetch(`/api/admin/store/products/${row.id}/duplicate`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        showToast("Error", json.error || "Failed to duplicate.", "warning");
        return;
      }
      showToast("Duplicated", `${row.name} cloned as disabled draft.`, "success");
      loadAll();
    } catch {
      showToast("Error", "Network error duplicating product.", "warning");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/store/products/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        showToast("Delete Failed", "Could not delete product.", "warning");
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast("Product Deleted", "Removed from database.", "success");
    } catch {
      showToast("Error", "Network error deleting product.", "warning");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveCategory = async (cat: StoreCategoryRow) => {
    if (savingCategorySlug) return;
    setSavingCategorySlug(cat.slug);
    try {
      const res = await fetch("/api/admin/store/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: cat.slug,
          name: cat.name.trim() || cat.slug,
          description: cat.description,
          sort_order: Number(cat.sort_order) || 0,
          is_enabled: Boolean(cat.is_enabled),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast("Save Failed", json.error || "Failed to update category.", "warning");
        return;
      }
      showToast("Category Updated", `${cat.name} saved live.`, "success");
      loadAll();
    } catch {
      showToast("Error", "Network error saving category.", "warning");
    } finally {
      setSavingCategorySlug(null);
    }
  };

  const handleSaveCoinConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coinConfig || savingCoins) return;
    setSavingCoins(true);
    try {
      const res = await fetch("/api/admin/store/coin-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coinConfig),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast("Validation Error", json.error || "Check coin pricing values.", "warning");
        return;
      }
      showToast("Coin Calculator Updated", "Dynamic rates & tiers saved.", "success");
    } catch {
      showToast("Error", "Failed to save coin config.", "warning");
    } finally {
      setSavingCoins(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (categoryFilter !== "ALL" && p.category_slug !== categoryFilter) return false;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q)
    );
  });

  return (
    <AdminShell
      title="Store & Tebex Management"
      subtitle="Manage ranks, keys, coin packages, bundles, custom coin calculator rates, and Tebex mappings."
      tebexConfigured={Boolean(tebexStatus?.configured)}
      actions={
        tab === "products" && (
          <button type="button" onClick={openCreate} className="btn small text-xs">
            <Plus className="h-3.5 w-3.5" />
            <span>New Product</span>
          </button>
        )
      }
    >
      <div className="space-y-6">
        {/* Tebex Status Banner */}
        <div className="rounded-2xl p-4 sm:p-5 bg-[#0f1535] border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                tebexStatus?.configured
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-amber-500/15 text-amber-400"
              }`}
            >
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-extrabold text-white uppercase tracking-wide">
                  Tebex Headless API Readiness
                </h2>
                {tebexStatus?.configured ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">
                    <CheckCircle2 className="h-3 w-3" /> Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-bold">
                    <AlertTriangle className="h-3 w-3" /> Credentials Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8f98c7] mt-1 leading-relaxed">
                {tebexStatus?.configured
                  ? "Server-side Tebex Headless checkout is active. Map Tebex Package IDs on products below to enable direct online payments."
                  : "Store checkout accepts direct UPI payments via FamGateway (GPay, PhonePe, Paytm, QR). Tebex integration is optional."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setTab("products")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold ${
                tab === "products"
                  ? "bg-[#ff9a1f] text-[#0a0d22]"
                  : "bg-[#141a42] text-[#a3abd6] hover:text-white"
              }`}
            >
              Products ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("categories")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold ${
                tab === "categories"
                  ? "bg-[#ff9a1f] text-[#0a0d22]"
                  : "bg-[#141a42] text-[#a3abd6] hover:text-white"
              }`}
            >
              Categories ({categories.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("coins")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 ${
                tab === "coins"
                  ? "bg-[#ff9a1f] text-[#0a0d22]"
                  : "bg-[#141a42] text-[#a3abd6] hover:text-white"
              }`}
            >
              <Coins className="h-3.5 w-3.5" />
              <span>Coin Calculator</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex items-center justify-center gap-2 text-[#a3abd6]">
            <Loader2 className="h-6 w-6 animate-spin text-[#ff9a1f]" />
            <span className="text-xs">Loading store catalog...</span>
          </div>
        ) : tab === "products" ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {["ALL", "RANKS", "KEYS", "COINS", "BUNDLES"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase ${
                      categoryFilter === cat
                        ? "bg-[#ff9a1f] text-[#0a0d22]"
                        : "bg-[#0f1535] text-[#a3abd6] border border-white/[0.08]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="h-4 w-4 text-[#7d87b8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products or slug..."
                  className="w-full sm:w-64 pl-9 pr-3 py-2 rounded-xl bg-[#0f1535] border border-white/[0.1] text-xs text-white"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-[#0f1535] border border-white/[0.08] overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#090d22] border-b border-white/[0.08] text-[#8f98c7] uppercase font-bold">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Tebex ID</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-[#080b1c] border border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <RankIcon name={p.name} category={p.category_slug} size="sm" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-white">{p.name}</p>
                            <p className="text-[11px] font-mono text-[#7d87b8]">{p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-white/[0.06] font-mono font-bold text-[#c7ccf0]">
                          {p.category_slug}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-white">
                        ${Number(p.price).toFixed(2)}
                        {p.original_price && (
                          <span className="ml-1.5 text-[11px] text-[#7d87b8] line-through">
                            ${Number(p.original_price).toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px]">
                        {p.tebex_package_id ? (
                          <span className="text-sky-300">{p.tebex_package_id}</span>
                        ) : (
                          <span className="text-[#6f78a8]">Not mapped</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => toggleProductEnabled(p)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            p.is_enabled
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-slate-700/40 text-slate-400"
                          }`}
                        >
                          {p.is_enabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          <span>{p.is_enabled ? "Active" : "Disabled"}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded-lg bg-[#141a42] text-white hover:bg-[#1b2254]"
                            title="Edit product"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-[#ff9a1f]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicateProduct(p)}
                            className="p-1.5 rounded-lg bg-[#141a42] text-white hover:bg-[#1b2254]"
                            title="Duplicate product"
                          >
                            <Copy className="h-3.5 w-3.5 text-[#3aa0ff]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(p)}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            title="Delete product"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredProducts.length === 0 && (
                <div className="p-10 text-center text-xs text-[#8f98c7]">
                  No products match your filter.
                </div>
              )}
            </div>
          </div>
        ) : tab === "categories" ? (
          <div className="rounded-2xl p-6 bg-[#0f1535] border border-white/[0.08] space-y-4">
            <div>
              <h2 className="font-head text-xl text-white uppercase">Store Categories</h2>
              <p className="text-xs text-[#8f98c7]">
                Configure sidebar display labels, descriptions, visibility, and sort order for store categories.
              </p>
            </div>
            <div className="space-y-3">
              {categories.map((cat) => (
                <div
                  key={cat.id || cat.slug}
                  className="p-4 rounded-xl bg-[#080b1c] border border-white/[0.08] grid grid-cols-1 md:grid-cols-[110px_1fr_1fr_90px_110px_auto] gap-3 items-center"
                >
                  <span className="font-mono text-xs font-bold text-[#ff9a1f] px-2.5 py-1.5 rounded-lg bg-[#141a42] text-center">
                    {cat.slug}
                  </span>
                  <input
                    value={cat.name}
                    onChange={(e) =>
                      setCategories((prev) =>
                        prev.map((c) => (c.slug === cat.slug ? { ...c, name: e.target.value } : c))
                      )
                    }
                    placeholder="Display Name"
                    className="px-3 py-2 rounded-xl bg-[#0f1535] border border-white/[0.12] text-xs text-white"
                  />
                  <input
                    value={cat.description}
                    onChange={(e) =>
                      setCategories((prev) =>
                        prev.map((c) =>
                          c.slug === cat.slug ? { ...c, description: e.target.value } : c
                        )
                      )
                    }
                    placeholder="Short category description"
                    className="px-3 py-2 rounded-xl bg-[#0f1535] border border-white/[0.12] text-xs text-white"
                  />
                  <input
                    type="number"
                    min={0}
                    value={cat.sort_order}
                    onChange={(e) =>
                      setCategories((prev) =>
                        prev.map((c) =>
                          c.slug === cat.slug ? { ...c, sort_order: Number(e.target.value) || 0 } : c
                        )
                      )
                    }
                    className="px-3 py-2 rounded-xl bg-[#0f1535] border border-white/[0.12] text-xs font-mono text-white"
                  />
                  <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cat.is_enabled}
                      onChange={(e) =>
                        setCategories((prev) =>
                          prev.map((c) =>
                            c.slug === cat.slug ? { ...c, is_enabled: e.target.checked } : c
                          )
                        )
                      }
                    />
                    <span>Enabled</span>
                  </label>
                  <button
                    type="button"
                    disabled={savingCategorySlug === cat.slug}
                    onClick={() => handleSaveCategory(cat)}
                    className="btn small text-xs"
                  >
                    {savingCategorySlug === cat.slug ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    <span>Save</span>
                  </button>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-xs text-[#8f98c7] py-4">
                  No categories found in database yet. Run `supabase/seed.sql` to initialize store categories.
                </p>
              )}
            </div>
          </div>
        ) : (
          coinConfig && (
            <form
              onSubmit={handleSaveCoinConfig}
              className="rounded-2xl p-6 bg-[#0f1535] border border-white/[0.08] space-y-5"
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="font-head text-xl text-white uppercase">
                    Dynamic Coin Calculator Settings
                  </h2>
                  <p className="text-xs text-[#8f98c7]">
                    Synced with `/api/store/calculate-coins` and public Store Coin Calculator.
                  </p>
                </div>
                <button type="submit" disabled={savingCoins} className="btn small text-xs">
                  {savingCoins ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>Save Coin Pricing</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Min Coins</label>
                  <input
                    type="number"
                    min={1}
                    value={coinConfig.min_custom_coins}
                    onChange={(e) =>
                      setCoinConfig({ ...coinConfig, min_custom_coins: Number(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Max Coins</label>
                  <input
                    type="number"
                    min={10}
                    value={coinConfig.max_custom_coins}
                    onChange={(e) =>
                      setCoinConfig({ ...coinConfig, max_custom_coins: Number(e.target.value) || 100 })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Base USD Rate / Coin</label>
                  <input
                    type="number"
                    step="0.0001"
                    min={0.0001}
                    value={coinConfig.base_rate_per_coin}
                    onChange={(e) =>
                      setCoinConfig({ ...coinConfig, base_rate_per_coin: Number(e.target.value) || 0.005 })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">
                    Delivery Command Template
                  </label>
                  <input
                    value={coinConfig.delivery_command_template}
                    onChange={(e) =>
                      setCoinConfig({ ...coinConfig, delivery_command_template: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">
                    Tebex Variable Coin Package ID
                  </label>
                  <input
                    value={coinConfig.tebex_package_id}
                    onChange={(e) =>
                      setCoinConfig({ ...coinConfig, tebex_package_id: e.target.value })
                    }
                    placeholder="Optional Tebex Package ID"
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm font-mono text-white"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase text-[#a3abd6]">
                    Volume Discount Tiers
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setCoinConfig({
                        ...coinConfig,
                        discount_tiers: [
                          ...coinConfig.discount_tiers,
                          { minCoins: 1000, unitRate: 0.0029 },
                        ],
                      })
                    }
                    className="text-xs font-bold text-[#ff9a1f] hover:underline"
                  >
                    + Add Tier
                  </button>
                </div>

                {coinConfig.discount_tiers.map((tier, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      value={tier.minCoins}
                      onChange={(e) => {
                        const next = [...coinConfig.discount_tiers];
                        next[idx] = { ...tier, minCoins: Number(e.target.value) || 1 };
                        setCoinConfig({ ...coinConfig, discount_tiers: next });
                      }}
                      placeholder="Min Coins"
                      className="w-40 px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-xs font-mono text-white"
                    />
                    <input
                      type="number"
                      step="0.00001"
                      min={0.00001}
                      value={tier.unitRate}
                      onChange={(e) => {
                        const next = [...coinConfig.discount_tiers];
                        next[idx] = { ...tier, unitRate: Number(e.target.value) || 0.001 };
                        setCoinConfig({ ...coinConfig, discount_tiers: next });
                      }}
                      placeholder="USD Rate per Coin"
                      className="w-44 px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-xs font-mono text-white"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setCoinConfig({
                          ...coinConfig,
                          discount_tiers: coinConfig.discount_tiers.filter((_, i) => i !== idx),
                        })
                      }
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </form>
          )
        )}
      </div>

      {/* Create / Edit Product Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          onClick={() => !saving && setModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0f1433] border border-white/[0.15] p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="font-head text-xl text-white uppercase">
                {editingId ? "Edit Product" : "Create Product"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#141a42] text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Product Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        name: e.target.value,
                        slug: editingId ? form.slug : toSlug(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Slug ID</label>
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
                    value={form.category_slug}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        category_slug: e.target.value as StoreProductRow["category_slug"],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  >
                    <option value="RANKS">RANKS</option>
                    <option value="KEYS">KEYS</option>
                    <option value="COINS">COINS</option>
                    <option value="BUNDLES">BUNDLES</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">
                    Original / Strikethrough Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.original_price ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        original_price: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Badge Text</label>
                  <input
                    value={form.badge || ""}
                    onChange={(e) => setForm({ ...form, badge: e.target.value })}
                    placeholder="Most Popular, Best Value..."
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Tebex Package ID</label>
                  <input
                    value={form.tebex_package_id}
                    onChange={(e) => setForm({ ...form, tebex_package_id: e.target.value })}
                    placeholder="Optional Tebex Package ID"
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#a3abd6] block mb-1">Sort Order</label>
                  <input
                    type="number"
                    min={0}
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm font-mono text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#a3abd6] block mb-1">Product Image URL</label>
                <div className="flex gap-2">
                  <input
                    value={form.image_url || ""}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    placeholder="Leave empty to use animated RankIcon"
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
                <label className="text-xs font-bold text-[#a3abd6] block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#080b1c] border border-white/[0.12] text-sm text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#a3abd6]">Perks / Features</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, perks: [...form.perks, ""] })}
                    className="text-xs font-bold text-[#ff9a1f] hover:underline"
                  >
                    + Add Perk
                  </button>
                </div>
                <div className="space-y-2">
                  {form.perks.map((perk, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        value={perk}
                        onChange={(e) => {
                          const next = [...form.perks];
                          next[idx] = e.target.value;
                          setForm({ ...form, perks: next });
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-[#080b1c] border border-white/[0.12] text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            perks: form.perks.filter((_, i) => i !== idx),
                          })
                        }
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-5 pt-1">
                <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_enabled}
                    onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })}
                  />
                  <span>Enabled in Store</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.popular}
                    onChange={(e) => setForm({ ...form, popular: e.target.checked })}
                  />
                  <span>Highlight as Popular</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  />
                  <span>Featured</span>
                </label>
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
                  {saving ? "Saving..." : editingId ? "Update Product" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <MediaPickerModal
        open={mediaOpen}
        defaultFolder="products"
        selectedUrl={form.image_url}
        onSelect={(url) => setForm({ ...form, image_url: url })}
        onClose={() => setMediaOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Store Product?"
        description={`Are you sure you want to permanently delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete Product"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminShell>
  );
}
