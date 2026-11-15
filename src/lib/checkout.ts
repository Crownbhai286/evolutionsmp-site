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
  unitPriceInr?: number;
  subInr?: number;
}

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
          `${coins.toLocaleString()} Survival Coins delivered upon verified payment`,
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

export function formatInr(amount: number): string {
  const rounded = Math.round(Number(amount) || 0);
  return `₹${rounded.toLocaleString("en-IN")}`;
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
  coinCfg?: CoinConfigData,
  rate: number = 88.0
): {
  lines: (OrderLine & { unitPriceInr: number; subInr: number })[];
  total: number;
  totalInr: number;
  totalCount: number;
  totalCoins: number;
} {
  const lines: (OrderLine & { unitPriceInr: number; subInr: number })[] = [];
  let total = 0;
  let totalInr = 0;
  let totalCount = 0;
  let totalCoins = 0;

  for (const entry of cart) {
    const item = resolveStoreItem(entry.id, catalog, coinCfg);
    if (!item || !Number.isInteger(entry.qty) || entry.qty < 1 || entry.qty > 99) continue;
    const sub = Math.round(item.price * entry.qty * 100) / 100;
    const unitPriceInr = Math.max(1, Math.round(item.price * rate));
    const subInr = unitPriceInr * entry.qty;
    lines.push({ item, qty: entry.qty, sub, unitPriceInr, subInr });
    total += sub;
    totalInr += subInr;
    totalCount += entry.qty;
    totalCoins += (item.coinAmount || 0) * entry.qty;
  }

  return {
    lines,
    total: Math.round(total * 100) / 100,
    totalInr,
    totalCount,
    totalCoins,
  };
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
