import { COIN_CONFIG, STORE_ITEMS } from "./data";
import type { CoinConfigData, StoreCatalogItem, StoreItem } from "./types";

function calcCoinPriceLocal(coins: number, coinCfg?: CoinConfigData) {
  if (!coinCfg) return COIN_CONFIG.calculatePrice(coins);
  const safeCoins = Math.max(coinCfg.minCustomCoins, Math.min(coins, coinCfg.maxCustomCoins));
  const sortedTiers = [...coinCfg.discountTiers].sort((a, b) => b.minCoins - a.minCoins);
  let unitRate = coinCfg.baseRatePerCoin;
  for (const tier of sortedTiers) {
    if (safeCoins >= tier.minCoins) {
      unitRate = tier.unitRate;
      break;
    }
  }
  const baseTotal = safeCoins * coinCfg.baseRatePerCoin;
  const price = Math.max(0.5, Math.round(safeCoins * unitRate * 100) / 100);
  const originalPrice = Math.round(baseTotal * 100) / 100;
  const discountPercent =
    originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  return { price, originalPrice, discountPercent };
}

export const CART_STORAGE_KEY = "evo-cart";
export const ORDER_STORAGE_KEY = "evo-order";
export const IGN_STORAGE_KEY = "evo-ign";
export const CART_UPDATED_EVENT = "evo-cart-updated";

export interface CartLine {
  id: string;
  user: string;
  qty: number;
}

export interface OrderLine {
  item: StoreItem;
  qty: number;
  sub: number;
}

export interface PreparedOrderItem {
  id: string;
  name: string;
  qty: number;
  unit: number;
  sub: number;
}

export interface PreparedOrder {
  sig: string;
  ref: string;
  ign: string;
  created: string;
  items: PreparedOrderItem[];
  total: number;
  sent: number;
}

const REF_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Validates a Minecraft IGN using the original EvolutionSMP store rules. */
export function validateMinecraftIgn(raw: string): string {
  const n = raw.trim();
  if (!n) return "Enter your Minecraft username.";
  if (n.length < 3 || n.length > 16) return "Usernames are 3 to 16 characters.";
  if (!/^[A-Za-z0-9_]{3,16}$/.test(n)) return "Use only letters, numbers and underscores.";
  return "";
}

/** Resolves an item ID strictly against authoritative catalog or coin pricing config. */
export function resolveStoreItem(
  id: string,
  catalog: StoreCatalogItem[] = STORE_ITEMS,
  coinCfg?: CoinConfigData
): StoreCatalogItem | null {
  const catalogMatch = catalog.find((p) => p.id === id && !p.isCustomCoin);
  if (catalogMatch) return catalogMatch;

  const minCoins = coinCfg?.minCustomCoins ?? COIN_CONFIG.minCustomCoins;
  const maxCoins = coinCfg?.maxCustomCoins ?? COIN_CONFIG.maxCustomCoins;

  const customCoinMatch = /^coins-custom-(\d+)$/.exec(id);
  if (customCoinMatch) {
    const coins = Number(customCoinMatch[1]);
    if (Number.isInteger(coins) && coins >= minCoins && coins <= maxCoins) {
      const pricing = calcCoinPriceLocal(coins, coinCfg);
      return {
        id: `coins-custom-${coins}`,
        name: `Custom Coins (${coins.toLocaleString()} Coins)`,
        category: "COINS",
        price: pricing.price,
        originalPrice: pricing.originalPrice,
        accentColor: "#ff9a1f",
        badge: pricing.discountPercent > 0 ? `Save ${pricing.discountPercent}%` : "Custom Amount",
        coinAmount: coins,
        isCustomCoin: true,
        tebexPackageId: coinCfg?.tebexPackageId || "",
        description: `${coins.toLocaleString()} In-game Survival Coins.`,
        perks: [
          `${coins.toLocaleString()} Survival Coins delivered after staff verification`,
          `${pricing.discountPercent}% Volume Discount applied`,
          "Spend on player warps, chest shops, auctions & land claims",
        ],
        icon: "Coins",
        checkoutUrl: "",
      };
    }
  }

  return null;
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Cleans stored cart entries, drops invalid items, and merges duplicates. */
export function sanitizeCart(
  raw: unknown,
  catalog: StoreCatalogItem[] = STORE_ITEMS,
  coinCfg?: CoinConfigData
): { items: CartLine[]; dropped: number } {
  if (!Array.isArray(raw)) return { items: [], dropped: 0 };

  const seen = new Map<string, CartLine>();
  const cleaned: CartLine[] = [];
  let dropped = 0;

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      dropped++;
      continue;
    }
    const candidate = entry as Record<string, unknown>;
    const id = typeof candidate.id === "string" ? candidate.id : "";
    const user = typeof candidate.user === "string" ? candidate.user.trim() : "";
    const rawQty = candidate.qty == null ? 1 : Number(candidate.qty);
    const resolved = resolveStoreItem(id, catalog, coinCfg);
    const userValid = user === "" || validateMinecraftIgn(user) === "";

    if (
      !resolved ||
      !Number.isFinite(resolved.price) ||
      resolved.price <= 0 ||
      !Number.isInteger(rawQty) ||
      rawQty < 1 ||
      rawQty > 99 ||
      !userValid
    ) {
      dropped++;
      continue;
    }

    const existing = seen.get(id);
    if (existing) {
      existing.qty = Math.min(99, existing.qty + rawQty);
      if (!existing.user && user) existing.user = user;
    } else {
      const line: CartLine = { id, user, qty: rawQty };
      seen.set(id, line);
      cleaned.push(line);
    }
  }

  return { items: cleaned, dropped };
}

export function computeOrderLines(
  cart: CartLine[],
  catalog: StoreCatalogItem[] = STORE_ITEMS,
  coinCfg?: CoinConfigData
): {
  lines: OrderLine[];
  total: number;
  totalCount: number;
  totalCoins: number;
} {
  const lines: OrderLine[] = [];
  let total = 0;
  let totalCount = 0;
  let totalCoins = 0;

  for (const entry of cart) {
    const item = resolveStoreItem(entry.id, catalog, coinCfg);
    if (!item || !Number.isInteger(entry.qty) || entry.qty < 1 || entry.qty > 99) continue;
    const sub = Math.round(item.price * entry.qty * 100) / 100;
    lines.push({ item, qty: entry.qty, sub });
    total += sub;
    totalCount += entry.qty;
    totalCoins += (item.coinAmount || 0) * entry.qty;
  }

  return {
    lines,
    total: Math.round(total * 100) / 100,
    totalCount,
    totalCoins,
  };
}

export function generateOrderRef(avoid?: string): string {
  for (let attempt = 0; attempt < 5; attempt++) {
    const bytes = new Uint8Array(8);
    if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    const ref =
      "EVO-" +
      Array.from(bytes.slice(0, 6))
        .map((n) => REF_CHARS[n % REF_CHARS.length])
        .join("");
    if (ref !== avoid) return ref;
  }
  return "EVO-" + Date.now().toString(36).toUpperCase().slice(-6);
}

export function buildOrderSignature(ign: string, lines: OrderLine[]): string {
  return JSON.stringify([
    ign.trim(),
    lines.map((l) => [l.item.id, l.qty, l.item.price]),
  ]);
}

/** Reuses the existing order reference when the exact same IGN and cart are reopened. */
export function prepareOrder(
  ign: string,
  lines: OrderLine[],
  prev: PreparedOrder | null
): PreparedOrder {
  const cleanIgn = ign.trim();
  const sig = buildOrderSignature(cleanIgn, lines);
  const isSame = Boolean(prev && prev.sig === sig && prev.ref);
  const total = Math.round(lines.reduce((sum, l) => sum + l.sub, 0) * 100) / 100;

  return {
    sig,
    ref: isSame && prev ? prev.ref : generateOrderRef(prev?.ref),
    ign: cleanIgn,
    created: isSame && prev?.created ? prev.created : new Date().toISOString(),
    items: lines.map((l) => ({
      id: l.item.id,
      name: l.item.name,
      qty: l.qty,
      unit: l.item.price,
      sub: l.sub,
    })),
    total,
    sent: isSame && prev?.sent ? prev.sent : 0,
  };
}

export function formatOrderText(order: PreparedOrder): string {
  return [
    "EvolutionSMP order request",
    `Reference: ${order.ref}`,
    `IGN: ${order.ign}`,
    "Items:",
    ...order.items.map(
      (l) => `- ${l.name} x${l.qty} @ ${formatUsd(l.unit)} = ${formatUsd(l.sub)}`
    ),
    `Total: ${formatUsd(order.total)}`,
    "Status: payment pending (manual verification by staff)",
    `Created: ${order.created}`,
  ].join("\n");
}

export function readCartFromStorage(
  catalog: StoreCatalogItem[] = STORE_ITEMS,
  coinCfg?: CoinConfigData
): { items: CartLine[]; dropped: number } {
  if (typeof window === "undefined") return { items: [], dropped: 0 };
  try {
    const raw = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || "[]");
    return sanitizeCart(raw, catalog, coinCfg);
  } catch {
    return { items: [], dropped: 0 };
  }
}

export function writeCartToStorage(items: CartLine[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
  } catch {
    // Ignore storage quota errors
  }
}

export function readOrderFromStorage(): PreparedOrder | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ORDER_STORAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object" || typeof parsed.ref !== "string") {
      return null;
    }
    return parsed as PreparedOrder;
  } catch {
    return null;
  }
}

export function writeOrderToStorage(order: PreparedOrder): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch {
    // Ignore storage quota errors
  }
}

export function readIgnFromStorage(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(IGN_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function writeIgnToStorage(ign: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(IGN_STORAGE_KEY, ign);
  } catch {
    // Ignore storage quota errors
  }
}
