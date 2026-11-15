"use client";

import React, { useState, useEffect } from "react";
import {
  Zap,
  ShieldCheck,
  MessageCircle,
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  Lock,
  X,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Check,
  Tag,
  AlertCircle,
  Coins,
  Sparkles,
  Calculator,
  Loader2,
  CheckCircle2,
  HelpCircle,
  Copy,
  ArrowLeft,
  QrCode,
} from "lucide-react";
import { SERVER_CONFIG as DEFAULT_SERVER_CONFIG } from "@/lib/data";
import {
  CoinConfigData,
  StoreCatalogItem,
  StoreCategoryItem,
  StoreItem,
  WebsiteSettingsData,
} from "@/lib/types";
import {
  CartLine,
  PreparedOrder,
  buildOrderSignature,
  computeOrderLines,
  formatOrderText,
  formatUsd,
  prepareOrder,
  readCartFromStorage,
  readIgnFromStorage,
  readOrderFromStorage,
  sanitizeCart,
  validateMinecraftIgn,
  writeCartToStorage,
  writeIgnToStorage,
  writeOrderToStorage,
} from "@/lib/checkout";
import { useToast } from "@/components/NotificationToast";
import RankIcon from "@/components/RankIcon";

interface StoreClientProps {
  products: StoreCatalogItem[];
  categories: StoreCategoryItem[];
  coinConfig: CoinConfigData;
  settings: WebsiteSettingsData;
  tebexConfigured: boolean;
  famgatewayConfigured?: boolean;
  usdToInrRate?: number;
}

export default function StoreClient({
  products,
  categories: dbCategories,
  coinConfig,
  settings,
  tebexConfigured,
  famgatewayConfigured = true,
  usdToInrRate = 88,
}: StoreClientProps) {
  const STORE_ITEMS = products;
  const SERVER_CONFIG = {
    ...DEFAULT_SERVER_CONFIG,
    discordInvite: settings.discordInviteUrl || DEFAULT_SERVER_CONFIG.discordInvite,
    discordTicketPanelUrl:
      settings.discordTicketUrl || DEFAULT_SERVER_CONFIG.discordTicketPanelUrl,
  };

  const calcCoinPrice = (coins: number) => {
    const safeCoins = Math.max(
      coinConfig.minCustomCoins,
      Math.min(coins, coinConfig.maxCustomCoins)
    );
    const sortedTiers = [...coinConfig.discountTiers].sort((a, b) => b.minCoins - a.minCoins);
    let unitRate = coinConfig.baseRatePerCoin;
    for (const tier of sortedTiers) {
      if (safeCoins >= tier.minCoins) {
        unitRate = tier.unitRate;
        break;
      }
    }
    const baseTotal = safeCoins * coinConfig.baseRatePerCoin;
    const price = Math.max(0.5, Math.round(safeCoins * unitRate * 100) / 100);
    const originalPrice = Math.round(baseTotal * 100) / 100;
    const discountPercent =
      originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
    return { price, originalPrice, discountPercent };
  };

  const COIN_CONFIG = {
    minCustomCoins: coinConfig.minCustomCoins,
    maxCustomCoins: coinConfig.maxCustomCoins,
    baseRatePerCoin: coinConfig.baseRatePerCoin,
    calculatePrice: calcCoinPrice,
  };

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeModalItem, setActiveModalItem] = useState<StoreCatalogItem | null>(null);
  const [modalQty, setModalQty] = useState(1);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [droppedWarningCount, setDroppedWarningCount] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutView, setCheckoutView] = useState<"closed" | "checkout" | "handoff">("closed");
  const [mcUsername, setMcUsername] = useState("");
  const [detailIgnError, setDetailIgnError] = useState("");
  const [checkoutIgnError, setCheckoutIgnError] = useState("");
  const [paymentPendingAccepted, setPaymentPendingAccepted] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [ckBusy, setCkBusy] = useState(false);
  const [tebexBusy, setTebexBusy] = useState(false);
  const [famBusy, setFamBusy] = useState(false);
  const [savedOrder, setSavedOrder] = useState<PreparedOrder | null>(null);
  const [handoffOrder, setHandoffOrder] = useState<PreparedOrder | null>(null);
  const [copyFeedback, setCopyFeedback] = useState("");

  // Custom Coins Calculator State
  const [customCoinAmount, setCustomCoinAmount] = useState<number>(350);
  const [customPricing, setCustomPricing] = useState(() => calcCoinPrice(350));
  const [isVerifyingCoins, setIsVerifyingCoins] = useState(false);
  const [coinInputError, setCoinInputError] = useState<string | null>(null);

  const { showToast } = useToast();

  const categories = [
    { id: "all", name: "All Products", count: STORE_ITEMS.length },
    ...dbCategories.map((cat) => ({
      id: cat.slug,
      name: cat.name,
      count: STORE_ITEMS.filter((i) => i.category === cat.slug).length,
    })),
  ];

  const filteredItems =
    selectedCategory === "all"
      ? STORE_ITEMS
      : STORE_ITEMS.filter((item) => item.category === selectedCategory);

  // Update dynamic coin price when custom amount changes
  const handleCustomCoinChange = (value: number) => {
    const rawVal = isNaN(value) ? COIN_CONFIG.minCustomCoins : value;
    setCustomCoinAmount(rawVal);

    if (rawVal < COIN_CONFIG.minCustomCoins) {
      setCoinInputError(`Minimum purchase is ${COIN_CONFIG.minCustomCoins.toLocaleString()} Coins`);
    } else if (rawVal > COIN_CONFIG.maxCustomCoins) {
      setCoinInputError(`Maximum purchase is ${COIN_CONFIG.maxCustomCoins.toLocaleString()} Coins`);
    } else {
      setCoinInputError(null);
    }

    setCustomPricing(COIN_CONFIG.calculatePrice(rawVal));
  };

  const adjustCustomCoins = (delta: number) => {
    const newVal = Math.max(
      COIN_CONFIG.minCustomCoins,
      Math.min(customCoinAmount + delta, COIN_CONFIG.maxCustomCoins)
    );
    handleCustomCoinChange(newVal);
  };

  // Add custom coins with server-side validation
  const handleAddCustomCoins = async () => {
    if (customCoinAmount < COIN_CONFIG.minCustomCoins || customCoinAmount > COIN_CONFIG.maxCustomCoins) {
      showToast(
        "Invalid Amount",
        `Please enter between ${COIN_CONFIG.minCustomCoins} and ${COIN_CONFIG.maxCustomCoins.toLocaleString()} coins.`,
        "warning"
      );
      return;
    }

    setIsVerifyingCoins(true);
    try {
      // Backend validation: Never trust frontend price calculations
      const res = await fetch("/api/store/calculate-coins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coins: customCoinAmount,
          username: mcUsername.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast("Validation Error", data.error || "Failed to verify coin price.", "warning");
        return;
      }

      const customCoinItem: StoreItem = {
        id: `coins-custom-${data.coins}`,
        name: `Custom Coins (${data.coins.toLocaleString()} Coins)`,
        category: "COINS",
        price: data.price,
        originalPrice: data.originalPrice,
        accentColor: "#ff9a1f",
        badge: data.discountPercent > 0 ? `Save ${data.discountPercent}%` : "Custom Amount",
        coinAmount: data.coins,
        isCustomCoin: true,
        description: `${data.coins.toLocaleString()} In-game Survival Coins.`,
        perks: [
          `${data.coins.toLocaleString()} Survival Coins delivered after staff verification`,
          `${data.discountPercent}% Volume Discount applied ($${(data.originalPrice - data.price).toFixed(2)} savings)`,
          "Spend on player warps, chest shops, auctions & land claims",
          "100% loss protected & non-expiring",
        ],
        icon: "Coins",
        checkoutUrl: "",
      };

      addToCart(customCoinItem, 1);
    } catch {
      // Offline fallback with safe local rates
      const localP = COIN_CONFIG.calculatePrice(customCoinAmount);
      const fallbackItem: StoreItem = {
        id: `coins-custom-${customCoinAmount}`,
        name: `Custom Coins (${customCoinAmount.toLocaleString()} Coins)`,
        category: "COINS",
        price: localP.price,
        originalPrice: localP.originalPrice,
        accentColor: "#ff9a1f",
        badge: "Custom Amount",
        coinAmount: customCoinAmount,
        isCustomCoin: true,
        description: `${customCoinAmount.toLocaleString()} In-game Survival Coins.`,
        perks: [
          `${customCoinAmount.toLocaleString()} Survival Coins delivered after staff verification`,
          "Spend on player warps, chest shops, auctions & land claims",
        ],
        icon: "Coins",
        checkoutUrl: "",
      };
      addToCart(fallbackItem, 1);
    } finally {
      setIsVerifyingCoins(false);
    }
  };

  useEffect(() => {
    const { items, dropped } = readCartFromStorage(STORE_ITEMS, coinConfig);
    if (dropped > 0) {
      writeCartToStorage(items);
    }
    setCart(items);
    setDroppedWarningCount(dropped);

    const storedIgn = readIgnFromStorage();
    if (storedIgn) setMcUsername(storedIgn);

    const storedOrder = readOrderFromStorage();
    if (storedOrder) setSavedOrder(storedOrder);

    const urlParams = new URLSearchParams(window.location.search);
    const orderIdParam = urlParams.get("order_id");
    const upiReturn = urlParams.get("upi");
    if (orderIdParam) {
      fetch(`/api/store/order-status?order_id=${encodeURIComponent(orderIdParam)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.paymentStatus === "paid") {
            writeCartToStorage([]);
            setCart([]);
            showToast(
              "UPI Payment Confirmed!",
              `Order ${data.orderId} verified. Perks queued for delivery to ${data.username}!`,
              "success"
            );
          } else if (upiReturn === "complete") {
            showToast(
              "Payment Awaiting Confirmation",
              `Order ${orderIdParam} is being verified by the banking network. Perks are delivered once verified.`,
              "info"
            );
          }
        })
        .catch(() => {});
      window.history.replaceState({}, "", window.location.pathname);
    }

    const tebexReturn = urlParams.get("tebex");
    if (tebexReturn === "complete") {
      writeCartToStorage([]);
      setCart([]);
      showToast(
        "Payment Completed",
        "Your Tebex checkout completed! In-game rewards deliver automatically.",
        "success"
      );
      window.history.replaceState({}, "", window.location.pathname);
    } else if (tebexReturn === "cancelled") {
      showToast(
        "Checkout Cancelled",
        "Your Tebex checkout was cancelled. Your cart items are still saved.",
        "info"
      );
      window.history.replaceState({}, "", window.location.pathname);
    }

    const openFromHash = () => {
      if (window.location.hash === "#cart") {
        setCheckoutView("closed");
        setCartOpen(true);
      }
    };
    const openFromNavbar = () => {
      setCheckoutView("closed");
      setCartOpen(true);
    };

    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    window.addEventListener("evo-open-cart", openFromNavbar);
    return () => {
      window.removeEventListener("hashchange", openFromHash);
      window.removeEventListener("evo-open-cart", openFromNavbar);
    };
  }, []);

  const persistCart = (nextRaw: CartLine[]): CartLine[] => {
    const { items } = sanitizeCart(nextRaw, STORE_ITEMS, coinConfig);
    writeCartToStorage(items);
    setCart(items);
    return items;
  };

  const openItemModal = (item: StoreCatalogItem) => {
    setActiveModalItem(item);
    setModalQty(1);
    setDetailIgnError("");
  };

  const {
    lines: orderLines,
    total: orderTotal,
    totalCount: totalCartCount,
    totalCoins: totalCoinsInCart,
  } = computeOrderLines(cart, STORE_ITEMS, coinConfig);

  const openCheckoutModal = (overrideCart?: CartLine[], overrideIgn?: string) => {
    const sourceCart = overrideCart ?? cart;
    const { items, dropped } = sanitizeCart(sourceCart, STORE_ITEMS, coinConfig);
    if (dropped > 0) {
      writeCartToStorage(items);
      setCart(items);
      setDroppedWarningCount((prev) => prev + dropped);
    }
    const { lines } = computeOrderLines(items, STORE_ITEMS, coinConfig);
    if (lines.length === 0) {
      setCheckoutView("closed");
      setCartOpen(true);
      return;
    }

    const prefillIgn =
      (overrideIgn ?? mcUsername).trim() ||
      readIgnFromStorage() ||
      items.find((c) => c.user)?.user ||
      "";
    if (prefillIgn) setMcUsername(prefillIgn);
    setCheckoutIgnError("");
    setCheckoutError("");
    setPaymentPendingAccepted(false);
    setCkBusy(false);
    setSavedOrder(readOrderFromStorage());
    setCartOpen(false);
    setCheckoutView("checkout");
  };

  const addToCart = (
    item: StoreItem,
    quantity: number = 1,
    explicitIgn?: string,
    openCheckoutAfter: boolean = false
  ) => {
    const safeQty = Math.max(1, Math.min(99, Math.floor(Number(quantity)) || 1));
    const candidateIgn = (explicitIgn ?? mcUsername).trim();
    const validIgn = validateMinecraftIgn(candidateIgn) === "" ? candidateIgn : "";

    if (validIgn && !readIgnFromStorage()) {
      writeIgnToStorage(validIgn);
      setMcUsername(validIgn);
    }

    const next = [...cart];
    const idx = next.findIndex((c) => c.id === item.id);
    if (idx >= 0) {
      next[idx] = {
        ...next[idx],
        qty: Math.min(99, next[idx].qty + safeQty),
        user: validIgn || next[idx].user,
      };
    } else {
      next.push({ id: item.id, user: validIgn, qty: safeQty });
    }
    const cleaned = persistCart(next);

    if (activeModalItem) setActiveModalItem(null);

    if (openCheckoutAfter) {
      openCheckoutModal(cleaned, validIgn);
      return;
    }

    showToast(
      "Added to Cart!",
      `${safeQty}x ${item.name} was added to your order.`,
      "success"
    );
    setCheckoutView("closed");
    setCartOpen(true);
  };

  const removeFromCart = (id: string) => {
    persistCart(cart.filter((c) => c.id !== id));
  };

  const setCartItemQty = (id: string, nextQty: number) => {
    const clamped = Math.max(1, Math.min(99, Math.floor(Number(nextQty)) || 1));
    persistCart(cart.map((c) => (c.id === id ? { ...c, qty: clamped } : c)));
  };

  const updateCartQty = (id: string, delta: number) => {
    const existing = cart.find((c) => c.id === id);
    if (!existing) return;
    setCartItemQty(id, existing.qty + delta);
  };

  const openExternalLink = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleCheckoutConfirm = async () => {
    if (ckBusy) return;

    const cleanIgn = mcUsername.trim();
    const ignErr = validateMinecraftIgn(cleanIgn);
    setCheckoutIgnError(ignErr);
    setCheckoutError("");
    if (ignErr) return;

    if (!paymentPendingAccepted) {
      setCheckoutError("Please confirm that payment is pending until staff verify it.");
      return;
    }

    const discordPanelUrl = SERVER_CONFIG.discordTicketPanelUrl;
    if (!discordPanelUrl) {
      setCheckoutError(
        "The Discord support link is not set up yet, so checkout cannot continue. Please contact staff."
      );
      return;
    }

    setCkBusy(true);
    try {
      writeIgnToStorage(cleanIgn);
      const updatedCart = persistCart(cart.map((c) => ({ ...c, user: cleanIgn })));
      const { lines: freshLines } = computeOrderLines(updatedCart, STORE_ITEMS, coinConfig);

      if (freshLines.length === 0) {
        setCkBusy(false);
        setCheckoutView("closed");
        setCartOpen(true);
        return;
      }

      const prevOrder = savedOrder ?? readOrderFromStorage();
      const prepared = prepareOrder(cleanIgn, freshLines, prevOrder);
      const orderText = formatOrderText(prepared);

      // Open Discord Ticket King panel synchronously before awaiting clipboard write
      openExternalLink(discordPanelUrl);

      let copied = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(orderText);
          copied = true;
        }
      } catch {
        copied = false;
      }

      const finalOrder: PreparedOrder = {
        ...prepared,
        sent: prepared.sent || Date.now(),
      };
      writeOrderToStorage(finalOrder);
      setSavedOrder(finalOrder);
      setHandoffOrder(finalOrder);
      setCopyFeedback(
        copied
          ? "Order details copied automatically. Paste them into your ticket."
          : "Could not copy automatically. Use the button above or select the text and copy it."
      );
      setCheckoutView("handoff");
    } catch {
      setCheckoutError("Something went wrong while preparing your order. Nothing was sent. Please try again.");
    } finally {
      setCkBusy(false);
    }
  };

  const handleTebexCheckout = async () => {
    if (tebexBusy) return;
    const cleanIgn = mcUsername.trim();
    const ignErr = validateMinecraftIgn(cleanIgn);
    setCheckoutIgnError(ignErr);
    setCheckoutError("");
    if (ignErr) return;

    setTebexBusy(true);
    try {
      writeIgnToStorage(cleanIgn);
      const res = await fetch("/api/store/tebex-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanIgn,
          items: cart.map((c) => ({ slug: c.id, quantity: c.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        setCheckoutError(data.error || "Failed to create Tebex checkout session.");
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setCheckoutError("Unable to reach Tebex checkout. Please try again or use Discord checkout.");
    } finally {
      setTebexBusy(false);
    }
  };

  const handleFamGatewayCheckout = async () => {
    if (famBusy || ckBusy || tebexBusy) return;
    const cleanIgn = mcUsername.trim();
    const ignErr = validateMinecraftIgn(cleanIgn);
    setCheckoutIgnError(ignErr);
    setCheckoutError("");
    if (ignErr) return;

    setFamBusy(true);
    try {
      writeIgnToStorage(cleanIgn);
      const res = await fetch("/api/store/famgateway-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanIgn,
          items: cart.map((c) => ({ slug: c.id, quantity: c.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        setCheckoutError(data.error || "Failed to create UPI checkout session.");
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setCheckoutError("Unable to reach FamGateway UPI checkout. Please try again.");
    } finally {
      setFamBusy(false);
    }
  };

  const handleCopyOrderDetails = async () => {
    if (!handoffOrder) return;
    const txt = formatOrderText(handoffOrder);
    try {
      await navigator.clipboard.writeText(txt);
      setCopyFeedback("Copied. Paste it into your ticket.");
    } catch {
      const textarea = document.getElementById(
        "order-details-textarea"
      ) as HTMLTextAreaElement | null;
      textarea?.select();
      setCopyFeedback("Copy failed. Select the text above and copy it manually.");
    }
  };

  const handleClearCartAfterTicket = () => {
    persistCart([]);
    setDroppedWarningCount(0);
    setHandoffOrder(null);
    setCheckoutView("closed");
    showToast("Cart cleared", "Your cart has been cleared.", "success");
  };

  const previewOrderSig = buildOrderSignature(
    mcUsername.trim() || readIgnFromStorage() || cart.find((c) => c.user)?.user || "",
    orderLines
  );
  const isDuplicatePreparedOrder = Boolean(
    savedOrder && savedOrder.sent > 0 && savedOrder.sig === previewOrderSig
  );

  return (
    <div className="pt-28 pb-24 px-5 max-w-[1200px] mx-auto min-h-screen">
      {/* Playbex Exact Full-Width Background Hero Banner (.shop-banner) */}
      <header className="mb-10">
        <div
          className="relative overflow-hidden isolate rounded-[24px] border border-[rgba(58,160,255,0.28)] shadow-2xl p-7 sm:p-9 lg:p-11 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(10,13,34,0.96) 0%, rgba(10,13,34,0.88) 45%, rgba(10,13,34,0.62) 100%), url("/images/store-banner.jpg")`,
            backgroundPosition: "center 55%",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Ambient Blue Radial Glow behind text */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(600px_220px_at_0%_0%,rgba(58,160,255,0.12),transparent_70%)] pointer-events-none" />

          {/* Left-Side Content */}
          <div className="max-w-xl">
            <span className="kicker mb-2 inline-block !border-[rgba(58,160,255,0.32)]">OFFICIAL STORE</span>
            <h1 className="font-head text-[clamp(38px,4.5vw,56px)] text-white tracking-wide uppercase my-2 leading-none">
              Store
            </h1>
            <p className="text-[#c3c9ee] text-sm sm:text-[15.5px] leading-relaxed">
              Every purchase is credited to your in-game account automatically within 60
              seconds. Your support directly funds server maintenance, custom plugins, and zero-lag infrastructure.
            </p>
          </div>

          {/* Right-Side 3 Vertically Stacked Glass Benefit Cards (.sb-perks) */}
          <ul className="w-full lg:w-auto min-w-[280px] sm:min-w-[320px] grid gap-2.5 list-none m-0 p-0 shrink-0">
            {/* Card 1: Instant Delivery */}
            <li className="flex items-center gap-3.5 px-4 py-3 rounded-[14px] bg-[#0a0d22]/65 border border-[rgba(58,160,255,0.22)] backdrop-blur-md shadow-lg shadow-black/20 hover:border-[rgba(58,160,255,0.5)] hover:bg-[#0a0d22]/80 transition-all">
              <span className="w-9 h-9 shrink-0 rounded-[10px] grid place-items-center bg-[#ff9a1f]/15 text-[#ff9a1f] border border-[rgba(58,160,255,0.25)]">
                <Zap className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <b className="text-white text-[14.5px] block font-bold leading-tight">Instant Delivery</b>
                <small className="text-[#a3abd6] text-[12.5px] block leading-tight mt-0.5">
                  Delivered in-game immediately upon payment
                </small>
              </div>
            </li>

            {/* Card 2: Secure Discord Checkout */}
            <li className="flex items-center gap-3.5 px-4 py-3 rounded-[14px] bg-[#0a0d22]/65 border border-[rgba(58,160,255,0.22)] backdrop-blur-md shadow-lg shadow-black/20 hover:border-[rgba(58,160,255,0.5)] hover:bg-[#0a0d22]/80 transition-all">
              <span className="w-9 h-9 shrink-0 rounded-[10px] grid place-items-center bg-[#ff9a1f]/15 text-[#ff9a1f] border border-[rgba(58,160,255,0.25)]">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <b className="text-white text-[14.5px] block font-bold leading-tight">Secure Discord Checkout</b>
                <small className="text-[#a3abd6] text-[12.5px] block leading-tight mt-0.5">
                  Secure payments with assistance from our staff team.
                </small>
              </div>
            </li>

            {/* Card 3: Dedicated Support */}
            <li>
              <a
                href={SERVER_CONFIG.discordTicketPanelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 px-4 py-3 rounded-[14px] bg-[#0a0d22]/65 border border-[rgba(58,160,255,0.22)] backdrop-blur-md shadow-lg shadow-black/20 hover:border-[#ff9a1f]/60 hover:bg-[#0a0d22]/85 transition-all group"
              >
                <span className="w-9 h-9 shrink-0 rounded-[10px] grid place-items-center bg-[#ff9a1f]/15 text-[#ff9a1f] border border-[rgba(58,160,255,0.25)] group-hover:scale-105 transition-transform">
                  <MessageCircle className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <b className="text-white text-[14.5px] font-bold leading-tight flex items-center gap-1.5">
                    <span>Dedicated Support</span>
                    <ExternalLink className="h-3.5 w-3.5 text-[#ff9a1f] opacity-80 group-hover:translate-x-0.5 transition-transform" />
                  </b>
                  <small className="text-[#a3abd6] text-[12.5px] block leading-tight mt-0.5">
                    24/7 assistance through Discord tickets
                  </small>
                </div>
              </a>
            </li>
          </ul>
        </div>
      </header>

      {/* Main Shop Layout: Sidebar Tree + Product Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-7 items-start">
        {/* Left Category Tree */}
        <aside className="sticky top-24 rounded-[18px] p-3.5 bg-gradient-to-b from-[#1b2254] to-[#141a42] border border-[rgba(130,150,255,0.2)] shadow-xl space-y-1.5">
          <div className="px-3 py-2 text-xs font-head uppercase tracking-wider text-[#ff9a1f] border-b border-white/[0.08] mb-2 flex items-center justify-between">
            <span>Categories</span>
            <span className="text-[10px] text-[#a3abd6] font-mono">store.evolutionsmp.fun</span>
          </div>

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const isCoinCategory = cat.id === "COINS";
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  isSelected
                    ? "bg-[#232c6a] text-white border border-[#ff9a1f]/60 shadow-sm shadow-[#ff9a1f]/10"
                    : "text-[#a3abd6] hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isCoinCategory && <Coins className="h-3.5 w-3.5 text-[#ff9a1f]" />}
                  <span>{cat.name}</span>
                </div>
                <span className="font-mono text-[11px] opacity-70 px-1.5 py-0.5 rounded bg-black/30">
                  {cat.count}
                </span>
              </button>
            );
          })}

          <div className="pt-4 mt-2 border-t border-white/[0.08] space-y-2.5">
            <button
              onClick={() => setCartOpen(true)}
              className="w-full btn glass small flex items-center justify-center gap-2"
            >
              <ShoppingCart className="h-4 w-4 text-[#ff9a1f]" />
              <span>View Cart ({totalCartCount})</span>
            </button>

            <a
              href={SERVER_CONFIG.discordTicketPanelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full btn small flex items-center justify-center gap-2 group"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Create Support Ticket</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-80 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
          </div>
        </aside>

        {/* Right Product Grid */}
        <section className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredItems.map((item) => {
              // Custom Coins Special Feature Card
              if (item.isCustomCoin) {
                return (
                  <div
                    key={item.id}
                    className="col-span-1 sm:col-span-2 xl:col-span-3 rounded-[24px] p-6 sm:p-8 bg-gradient-to-b from-[#261e44] via-[#161c46] to-[#0f1433] border-2 border-[#ff9a1f]/70 shadow-2xl shadow-[#ff9a1f]/15 relative overflow-hidden isolate"
                  >
                    {/* Ambient Glow */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gradient-to-br from-[#ff9a1f]/30 via-[#ff3d5a]/20 to-transparent blur-3xl pointer-events-none -z-10" />

                    {/* Top Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-[#ff9a1f] text-[#0a0d22] shadow-md">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Featured • Custom Coin Calculator</span>
                      </div>

                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#0a0d22]/80 border border-white/[0.1] text-[#a3abd6]">
                        <span>Limits: 50 – 50,000 Coins</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-center">
                      {/* Left Column: Visual Icon & Info */}
                      <div className="lg:col-span-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
                        <div className="h-28 w-28 rounded-2xl bg-[#0a0d22]/80 border border-[rgba(130,150,255,0.25)] flex items-center justify-center shrink-0 shadow-xl relative overflow-visible">
                          <RankIcon name="custom-coins" size="md" />
                        </div>

                        <div>
                          <h3 className="font-head text-3xl text-white tracking-wide uppercase mb-2">
                            Custom Coins
                          </h3>
                          <p className="text-sm text-[#a3abd6] leading-relaxed mb-4">
                            Enter any coin amount you desire. Instant automatic volume discounts up to 40% OFF with seamless Tebex delivery.
                          </p>

                          <div className="flex flex-wrap gap-2 text-xs font-semibold text-[#d1d7f0]">
                            <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#2fd47a]" />
                              <span>Instant /eco give</span>
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#2fd47a]" />
                              <span>Spend on Shops &amp; Claims</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Interactive Amount Calculator Box */}
                      <div className="lg:col-span-6 rounded-2xl p-5 bg-[#0a0d22]/85 border border-[rgba(130,150,255,0.2)] shadow-inner space-y-4">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-[#a3abd6] uppercase tracking-wider flex items-center gap-1.5">
                            <Calculator className="h-4 w-4 text-[#ff9a1f]" />
                            <span>Select Coin Amount:</span>
                          </span>
                          <span className="text-[#ff9a1f] font-mono">
                            Rate: ${(customPricing.price / customCoinAmount).toFixed(4)}/coin
                          </span>
                        </div>

                        {/* Amount Stepper & Number Input */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => adjustCustomCoins(-100)}
                            className="px-2.5 py-2 rounded-xl bg-[#141a42] hover:bg-[#1f275e] text-xs font-bold text-white border border-white/[0.08] transition-all"
                            title="-100 Coins"
                          >
                            -100
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustCustomCoins(-50)}
                            className="px-2.5 py-2 rounded-xl bg-[#141a42] hover:bg-[#1f275e] text-xs font-bold text-white border border-white/[0.08] transition-all"
                            title="-50 Coins"
                          >
                            -50
                          </button>

                          <div className="relative flex-1">
                            <input
                              type="number"
                              min={COIN_CONFIG.minCustomCoins}
                              max={COIN_CONFIG.maxCustomCoins}
                              step={50}
                              value={customCoinAmount}
                              onChange={(e) => handleCustomCoinChange(parseInt(e.target.value, 10))}
                              className="w-full text-center py-2 px-3 rounded-xl bg-[#141a42] border border-[#ff9a1f]/50 text-white font-mono text-base font-bold focus:outline-none focus:border-[#ff9a1f] shadow-inner"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#a3abd6] font-head uppercase pointer-events-none">
                              Coins
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => adjustCustomCoins(50)}
                            className="px-2.5 py-2 rounded-xl bg-[#141a42] hover:bg-[#1f275e] text-xs font-bold text-white border border-white/[0.08] transition-all"
                            title="+50 Coins"
                          >
                            +50
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustCustomCoins(100)}
                            className="px-2.5 py-2 rounded-xl bg-[#141a42] hover:bg-[#1f275e] text-xs font-bold text-white border border-white/[0.08] transition-all"
                            title="+100 Coins"
                          >
                            +100
                          </button>
                        </div>

                        {/* Quick Selection Pills */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] text-[#a3abd6] font-bold mr-1">Presets:</span>
                          {[100, 250, 350, 500, 1000, 2500, 5000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleCustomCoinChange(preset)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                                customCoinAmount === preset
                                  ? "bg-[#ff9a1f] text-[#0a0d22] shadow-sm shadow-[#ff9a1f]/30"
                                  : "bg-[#141a42] text-[#a3abd6] hover:text-white hover:bg-white/[0.08]"
                              }`}
                            >
                              {preset.toLocaleString()}
                            </button>
                          ))}
                        </div>

                        {/* Error Message if outside limits */}
                        {coinInputError && (
                          <p className="text-xs text-amber-400 font-bold flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>{coinInputError}</span>
                          </p>
                        )}

                        {/* Calculated Price Readout & CTA */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-white/[0.08]">
                          <div className="text-left w-full sm:w-auto">
                            <div className="flex items-baseline gap-2">
                              <span className="font-head text-3xl text-white g">
                                ${customPricing.price.toFixed(2)}
                              </span>
                              {customPricing.discountPercent > 0 && (
                                <span className="text-xs text-[#6f78a8] line-through font-mono">
                                  ${customPricing.originalPrice.toFixed(2)}
                                </span>
                              )}
                              {customPricing.discountPercent > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-green-500/20 text-green-400 border border-green-500/30">
                                  Save {customPricing.discountPercent}%
                                </span>
                              )}
                            </div>
                            <small className="text-[#a3abd6] text-[11px] block mt-0.5">
                              Server-validated rate &bull; Verified Tebex Delivery
                            </small>
                          </div>

                          <button
                            type="button"
                            onClick={handleAddCustomCoins}
                            disabled={isVerifyingCoins || !!coinInputError}
                            className="btn primary w-full sm:w-auto text-sm font-extrabold flex items-center justify-center gap-2"
                          >
                            {isVerifyingCoins ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Verifying...</span>
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="h-4 w-4" />
                                <span>Add to Cart</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // Standard Product Cards (Predefined Coins, Ranks, Keys, Bundles)
              const isRecommended = item.popular || item.badge === "Recommended" || item.id === "coins-500";
              const isCoinItem = item.category === "COINS";

              return (
                <div
                  key={item.id}
                  className={`group relative rounded-[18px] p-5 bg-gradient-to-b from-[#1b2254] to-[#141a42] border transition-all duration-300 flex flex-col justify-between hover:-translate-y-1 hover:shadow-2xl h-full ${
                    isRecommended
                      ? "border-[#ff9a1f]/75 shadow-lg shadow-[#ff9a1f]/15 hover:border-[#ff9a1f] hover:shadow-[#ff9a1f]/30 ring-1 ring-[#ff9a1f]/30"
                      : "border-[rgba(130,150,255,0.2)] hover:border-[#ff9a1f]/60 hover:shadow-[#ff9a1f]/10"
                  }`}
                >
                  {/* Badge if present */}
                  {item.badge && (
                    <span
                      className={`absolute top-4 left-4 z-10 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-[#0a0d22] shadow-md flex items-center gap-1 ${
                        isRecommended
                          ? "bg-gradient-to-r from-[#ffb02e] to-[#ff9a1f] ring-1 ring-white/30"
                          : "bg-[#ff9a1f]"
                      }`}
                    >
                      {isRecommended && <Sparkles className="h-3 w-3" />}
                      <span>{item.badge}</span>
                    </span>
                  )}

                  {/* Picture Container */}
                  <div
                    className="relative h-44 w-full rounded-xl flex items-center justify-center bg-[radial-gradient(circle,rgba(255,154,31,0.08),transparent_70%)] cursor-pointer overflow-visible"
                    onClick={() => openItemModal(item)}
                  >
                    <div
                      className={`h-24 w-24 rounded-2xl bg-[#0a0d22]/70 border flex items-center justify-center relative overflow-hidden shadow-inner transition-colors ${
                        isRecommended ? "border-[#ff9a1f]/50 group-hover:border-[#ff9a1f]" : "border-[rgba(130,150,255,0.2)] group-hover:border-[#ff9a1f]/60"
                      }`}
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <RankIcon name={item.name} category={item.category} size="md" />
                      )}
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="mt-3">
                    {/* Coin Quantity Indicator */}
                    {item.coinAmount && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#ff9a1f]/10 border border-[#ff9a1f]/30 text-[#ff9a1f] text-xs font-mono font-bold mb-2">
                        <Coins className="h-3.5 w-3.5 shrink-0" />
                        <span>{item.coinAmount.toLocaleString()} Coins</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-head text-xl text-white tracking-wide uppercase">
                        {item.name}
                      </h3>
                    </div>

                    <p className="text-xs text-[#a3abd6] leading-relaxed line-clamp-2 mb-4">
                      {item.description}
                    </p>

                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="font-head text-2xl text-white g">
                        ${item.price.toFixed(2)}
                      </span>
                      {item.originalPrice && (
                        <span className="text-xs text-[#6f78a8] line-through font-mono">
                          ${item.originalPrice.toFixed(2)}
                        </span>
                      )}
                      {item.bonusPercent && (
                        <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                          Save {item.bonusPercent}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => openItemModal(item)}
                      className="px-3 py-2.5 rounded-xl bg-[#232c6a] hover:bg-[#2b367d] text-xs font-bold text-white transition-all text-center"
                    >
                      Details
                    </button>

                    <button
                      type="button"
                      onClick={() => addToCart(item, 1)}
                      className={`btn small text-xs font-bold flex items-center justify-center gap-1.5 ${
                        isRecommended ? "primary shadow-md shadow-[#ff9a1f]/20" : ""
                      }`}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      <span>Buy &bull; ${item.price.toFixed(2)}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Store Support CTA */}
          <div className="mt-6 rounded-[20px] p-5 sm:p-6 bg-gradient-to-r from-[#1b2254]/90 to-[#141a42]/90 border border-[rgba(130,150,255,0.22)] shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-[#ff9a1f]/45 transition-all">
            <div className="space-y-1">
              <h3 className="font-head text-lg sm:text-xl text-white uppercase tracking-wide">
                Issues with a purchase or delivery?
              </h3>
              <p className="text-xs text-[#a3abd6] leading-relaxed">
                Our staff team assists with ranks, coins, billing, and deliveries through Discord Ticket King.
              </p>
            </div>

            <a
              href={SERVER_CONFIG.discordTicketPanelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn small w-full sm:w-auto shrink-0 group"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Create Support Ticket</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-85 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
          </div>
        </section>
      </div>

      {/* Need Help With Checkout? Section */}
      <section
        aria-labelledby="checkout-help-heading"
        className="mt-10 rounded-[24px] p-6 sm:p-8 bg-gradient-to-b from-[#1b2254] to-[#141a42] border border-[rgba(130,150,255,0.24)] shadow-2xl relative overflow-hidden isolate"
      >
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-gradient-to-br from-[#3aa0ff]/15 via-[#ff9a1f]/10 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <span className="kicker mb-2 inline-flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Checkout Guide</span>
            </span>
            <h2
              id="checkout-help-heading"
              className="font-head text-2xl sm:text-3xl text-white uppercase tracking-wide"
            >
              Need Help With Checkout?
            </h2>
            <p className="text-xs sm:text-sm text-[#a3abd6] mt-1">
              Follow these simple steps to complete your purchase and receive your items in-game.
            </p>
          </div>

          <a
            href={SERVER_CONFIG.discordTicketPanelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn small w-full md:w-auto shrink-0 group"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Get Purchase Help</span>
            <ExternalLink className="h-3.5 w-3.5 opacity-85 transition-transform duration-200 group-hover:translate-x-0.5" />
          </a>
        </div>

        {/* Step-by-Step Purchasing Process */}
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-6 list-none p-0">
          {[
            "Select your desired rank, coins, keys, or bundle.",
            "Add the product to your cart.",
            "Enter your Minecraft username.",
            "Proceed to checkout.",
            "Select an available payment method.",
            "Complete the payment.",
            "Wait for successful purchase confirmation and in-game delivery.",
          ].map((stepText, idx) => (
            <li
              key={idx}
              className="flex items-start gap-3 p-3.5 rounded-[14px] bg-[#0a0d22]/65 border border-white/[0.08] hover:border-[rgba(58,160,255,0.35)] transition-colors"
            >
              <span className="h-6 w-6 shrink-0 rounded-lg bg-[#ff9a1f]/15 border border-[#ff9a1f]/40 text-[#ff9a1f] font-mono text-xs font-extrabold grid place-items-center">
                {idx + 1}
              </span>
              <span className="text-xs sm:text-[13px] text-[#d1d7f0] leading-relaxed">
                {stepText}
              </span>
            </li>
          ))}
        </ol>

        {/* Payment Succeeded / Missing Item Notice */}
        <div className="rounded-[16px] p-4 sm:p-5 bg-[#0a0d22]/80 border border-[#ff9a1f]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-[#ff9a1f] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <b className="text-white text-sm font-bold block">
                Payment succeeded, but your item was not delivered?
              </b>
              <p className="text-xs text-[#a3abd6] leading-relaxed">
                Please allow a short moment for automatic delivery to process. If your payment went through
                and you still have not received your items in-game, contact our staff through our Discord
                Ticket King support panel so we can assist you right away.
              </p>
            </div>
          </div>

          <a
            href={SERVER_CONFIG.discordTicketPanelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn glass small w-full sm:w-auto shrink-0 group hover:border-[#ff9a1f]/60"
          >
            <span>Get Purchase Help</span>
            <ExternalLink className="h-3.5 w-3.5 text-[#ff9a1f] transition-transform duration-200 group-hover:translate-x-0.5" />
          </a>
        </div>
      </section>

      {/* Product Details Modal */}
      {activeModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setActiveModalItem(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-[24px] bg-[#0f1433] border border-[rgba(130,150,255,0.3)] shadow-2xl p-6 sm:p-8 overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveModalItem(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-[#141a42] text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-start gap-4 mb-6 pb-6 border-b border-white/[0.08]">
              <div className="h-16 w-16 rounded-2xl bg-[#0a0d22]/80 border border-[rgba(130,150,255,0.25)] flex items-center justify-center shrink-0 shadow-lg relative overflow-hidden">
                {activeModalItem.imageUrl ? (
                  <img
                    src={activeModalItem.imageUrl}
                    alt={activeModalItem.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <RankIcon name={activeModalItem.name} category={activeModalItem.category} size="sm" />
                )}
              </div>
              <div>
                <span className="kicker mb-2">
                  {activeModalItem.category === "COINS" ? "Coin Shop Package" : "Store Package"}
                </span>
                <h2 className="font-head text-3xl text-white tracking-wide uppercase">
                  {activeModalItem.name}
                </h2>
                <div className="font-head text-2xl g mt-1">
                  ${activeModalItem.price.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="space-y-4 text-sm text-[#a3abd6] leading-relaxed mb-6">
              <p>{activeModalItem.description}</p>

              <div className="rounded-xl p-4 bg-[#141a42] border border-white/[0.08] space-y-2">
                <span className="text-xs font-head uppercase text-white tracking-wider block mb-2">
                  Features Included:
                </span>
                {activeModalItem.perks.map((perk, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-slate-200">
                    <Check className="h-4 w-4 text-[#2fd47a] shrink-0 mt-0.5" />
                    <span>{perk}</span>
                  </div>
                ))}
              </div>

              <div>
                <label
                  htmlFor="detail-mc-username"
                  className="text-xs font-bold text-white block mb-1.5"
                >
                  Minecraft username
                </label>
                <input
                  id="detail-mc-username"
                  type="text"
                  autoComplete="off"
                  maxLength={16}
                  value={mcUsername}
                  onChange={(e) => {
                    setMcUsername(e.target.value);
                    if (detailIgnError) setDetailIgnError("");
                  }}
                  placeholder="Steve_123"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141a42] border border-white/[0.08] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ff9a1f]"
                />
                {detailIgnError && (
                  <p role="alert" className="text-xs text-red-400 font-semibold mt-1.5">
                    {detailIgnError}
                  </p>
                )}
              </div>

              <div className="rounded-xl p-3 bg-white/[0.03] border border-white/[0.08] text-xs text-[#a3abd6]">
                Staff deliver your items to this username manually after verifying your payment in a Discord ticket.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/[0.08]">
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#a3abd6] font-bold">Quantity:</span>
                <div className="flex items-center rounded-xl bg-[#141a42] border border-white/[0.08] p-1">
                  <button
                    type="button"
                    onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                    className="p-1.5 rounded-lg hover:bg-white/[0.1] text-white"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-3 font-mono font-bold text-white text-sm">
                    {modalQty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalQty(Math.min(99, modalQty + 1))}
                    className="p-1.5 rounded-lg hover:bg-white/[0.1] text-white"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = mcUsername.trim();
                    if (trimmed) {
                      const err = validateMinecraftIgn(trimmed);
                      if (err) {
                        setDetailIgnError(err);
                        return;
                      }
                    }
                    setDetailIgnError("");
                    addToCart(activeModalItem, modalQty, trimmed, false);
                  }}
                  className="btn glass w-full sm:w-auto"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>Add to Cart ({formatUsd(activeModalItem.price * modalQty)})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = mcUsername.trim();
                    const err = validateMinecraftIgn(trimmed);
                    if (err) {
                      setDetailIgnError(err);
                      return;
                    }
                    setDetailIgnError("");
                    addToCart(activeModalItem, modalQty, trimmed, true);
                  }}
                  className="btn w-full sm:w-auto"
                >
                  <Zap className="h-4 w-4" />
                  <span>Buy Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-out Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setCartOpen(false)}
          />

          <aside className="fixed top-0 right-0 bottom-0 w-full max-w-[460px] bg-[#0f1433] border-l border-white/[0.14] p-6 flex flex-col justify-between overflow-y-auto shadow-2xl z-50">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-[#ff9a1f]" />
                  <h3 className="font-head text-2xl text-white tracking-wide">Your Cart</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCartOpen(false)}
                  aria-label="Close cart"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {droppedWarningCount > 0 && (
                <div
                  role="alert"
                  className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200"
                >
                  {droppedWarningCount} item{droppedWarningCount > 1 ? "s were" : " was"} no longer available or invalid and{" "}
                  {droppedWarningCount > 1 ? "were" : "was"} removed from your cart.
                </div>
              )}

              {orderLines.length > 0 && (
                <p className="text-xs text-[#a3abd6] mt-4">
                  {totalCartCount} item{totalCartCount > 1 ? "s" : ""}
                </p>
              )}

              {/* Items List */}
              <div className="divide-y divide-white/[0.08] my-3">
                {orderLines.length === 0 ? (
                  <div className="py-12 px-4 text-center rounded-2xl bg-[#141a42]/60 border border-dashed border-white/[0.1] my-4">
                    <b className="text-white text-base block mb-1">Your cart is empty</b>
                    <p className="text-xs text-[#a3abd6] mb-5">
                      Pick a rank, key or coin package from the store to get started.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCartOpen(false);
                        setSelectedCategory("all");
                      }}
                      className="btn w-full"
                    >
                      Browse the store
                    </button>
                  </div>
                ) : (
                  orderLines.map(({ item, qty, sub }) => {
                    const lineUser = cart.find((c) => c.id === item.id)?.user;
                    return (
                      <div key={item.id} className="py-4 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-11 w-11 rounded-xl bg-[#0a0d22]/80 border border-white/[0.08] flex items-center justify-center shrink-0 overflow-hidden">
                              {(item as StoreCatalogItem).imageUrl ? (
                                <img
                                  src={(item as StoreCatalogItem).imageUrl!}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <RankIcon name={item.name} category={item.category} size="sm" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <b className="text-white text-sm block font-bold leading-tight truncate">
                                {item.name}
                              </b>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                <span className="text-xs text-[#a3abd6] font-mono">
                                  {formatUsd(item.price)} each
                                </span>
                                {lineUser && (
                                  <span className="text-[11px] text-[#3aa0ff] font-mono">
                                    for {lineUser}
                                  </span>
                                )}
                                {item.coinAmount && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-[#ff9a1f] bg-[#ff9a1f]/10 border border-[#ff9a1f]/20">
                                    {item.coinAmount.toLocaleString()} Coins
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <span className="font-mono font-bold text-white text-sm shrink-0">
                            {formatUsd(sub)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3 pl-14">
                          <div
                            role="group"
                            aria-label={`Quantity for ${item.name}`}
                            className="inline-flex items-center rounded-lg bg-[#141a42] border border-white/[0.08]"
                          >
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.id, -1)}
                              aria-label={`Decrease quantity of ${item.name}`}
                              className="p-1.5 text-slate-300 hover:text-white"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={99}
                              inputMode="numeric"
                              aria-label={`Quantity of ${item.name}`}
                              value={qty}
                              onChange={(e) => setCartItemQty(item.id, Number(e.target.value))}
                              className="w-11 bg-transparent text-center font-mono text-xs font-bold text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.id, 1)}
                              aria-label={`Increase quantity of ${item.name}`}
                              className="p-1.5 text-slate-300 hover:text-white"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            aria-label={`Remove ${item.name} from cart`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {totalCoinsInCart > 0 && (
                <div className="p-3 rounded-xl bg-[#ff9a1f]/10 border border-[#ff9a1f]/25 text-xs text-[#d1d7f0] mb-4 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#ff9a1f]">
                    <Coins className="h-4 w-4" />
                    <span>In-Game Coins Total: {totalCoinsInCart.toLocaleString()} Coins</span>
                  </div>
                  <p className="text-[11px] text-[#a3abd6] leading-relaxed">
                    Coins stay pending until staff verify payment manually in your Discord ticket.
                  </p>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            {orderLines.length > 0 && (
              <div className="pt-4 border-t border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between text-base">
                  <span className="text-[#a3abd6] font-bold">Total</span>
                  <span aria-live="polite" className="font-head text-2xl g">
                    {formatUsd(orderTotal)}
                  </span>
                </div>

                <p className="text-xs text-[#a3abd6] leading-relaxed">
                  Nothing is charged on this website. Payment is arranged with staff in a Discord ticket.
                </p>

                <button
                  type="button"
                  onClick={() => openCheckoutModal()}
                  className="btn w-full py-3.5 text-base font-extrabold flex items-center justify-center gap-2"
                >
                  <Lock className="h-4 w-4" />
                  <span>Checkout Now</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCartOpen(false)}
                  className="btn glass w-full py-2.5 text-sm font-bold"
                >
                  Continue shopping
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Checkout & Order Request Ready Modal */}
      {checkoutView !== "closed" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setCheckoutView("closed")}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={checkoutView === "checkout" ? "Checkout" : "Order request ready"}
            className="relative w-full max-w-xl rounded-[24px] bg-[#0f1433] border border-[rgba(130,150,255,0.3)] shadow-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setCheckoutView("closed")}
              aria-label="Close modal"
              className="absolute top-5 right-5 p-2 rounded-xl bg-[#141a42] text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {checkoutView === "checkout" && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-head text-3xl text-white tracking-wide">Checkout</h3>
                  <p className="text-sm text-[#a3abd6] mt-1 leading-relaxed">
                    Review your order. It goes to staff as a request in a private Discord ticket. Nothing is charged on this website.
                  </p>
                </div>

                {droppedWarningCount > 0 && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200"
                  >
                    {droppedWarningCount} unavailable item{droppedWarningCount > 1 ? "s were" : " was"} removed from your cart.
                  </div>
                )}

                {isDuplicatePreparedOrder && savedOrder && (
                  <div className="p-3.5 rounded-xl bg-[#3aa0ff]/10 border border-[#3aa0ff]/30 text-xs text-[#d1d7f0] leading-relaxed">
                    Order <b className="text-white font-mono">{savedOrder.ref}</b> was already prepared for this exact cart. Continuing reuses the same reference, so staff see one order, not a duplicate.
                  </div>
                )}

                <div>
                  <label
                    htmlFor="checkout-mc-ign"
                    className="text-xs font-bold text-white block mb-1.5"
                  >
                    Minecraft IGN
                  </label>
                  <input
                    id="checkout-mc-ign"
                    type="text"
                    autoComplete="off"
                    maxLength={16}
                    value={mcUsername}
                    onChange={(e) => {
                      setMcUsername(e.target.value);
                      if (checkoutIgnError) setCheckoutIgnError("");
                    }}
                    placeholder="Steve_123"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141a42] border border-white/[0.1] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ff9a1f]"
                  />
                  {checkoutIgnError && (
                    <p role="alert" className="text-xs text-red-400 font-semibold mt-1.5">
                      {checkoutIgnError}
                    </p>
                  )}
                  <small className="block text-[11px] text-[#a3abd6] mt-1.5">
                    Your items are delivered to this username, so check the spelling.
                  </small>
                </div>

                {/* Selected Products & Subtotals */}
                <div className="rounded-xl bg-[#141a42] border border-white/[0.08] divide-y divide-white/[0.08]">
                  {orderLines.map(({ item, qty, sub }) => (
                    <div
                      key={item.id}
                      className="px-4 py-3 flex items-center justify-between gap-3 text-sm"
                    >
                      <div>
                        <div className="text-white font-semibold">
                          {item.name}
                          {qty > 1 ? ` × ${qty}` : ""}
                        </div>
                        <small className="text-xs text-[#a3abd6] font-mono">
                          {formatUsd(item.price)} each
                        </small>
                      </div>
                      <div className="font-mono font-bold text-white">{formatUsd(sub)}</div>
                    </div>
                  ))}
                </div>

                {/* Order Total */}
                <div className="flex items-center justify-between py-2 border-y border-white/[0.08]">
                  <span className="text-sm font-bold text-[#a3abd6]">Total</span>
                  <div className="text-right">
                    <span className="font-head text-2xl g">{formatUsd(orderTotal)}</span>
                    {famgatewayConfigured && (
                      <span className="block text-xs font-bold text-[#10b981]">
                        ≈ ₹{Math.max(1, Math.round(orderTotal * (usdToInrRate || 88))).toLocaleString("en-IN")} INR (UPI)
                      </span>
                    )}
                  </div>
                </div>

                {/* Payment Pending Confirmation Checkbox */}
                <label className="flex items-start gap-2.5 text-xs text-[#d1d7f0] cursor-pointer leading-relaxed">
                  <input
                    id="payment-pending-checkbox"
                    type="checkbox"
                    checked={paymentPendingAccepted}
                    onChange={(e) => {
                      setPaymentPendingAccepted(e.target.checked);
                      if (checkoutError) setCheckoutError("");
                    }}
                    className="mt-0.5 rounded bg-[#141a42] border-white/20 text-[#ff9a1f] focus:ring-0"
                  />
                  <span>
                    I understand Discord tickets are verified manually, while UPI / Tebex payments deliver automatically in-game.
                  </span>
                </label>

                {checkoutError && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{checkoutError}</span>
                  </div>
                )}

                <div className="space-y-2.5 pt-1">
                  {famgatewayConfigured && (
                    <button
                      type="button"
                      disabled={famBusy || ckBusy || tebexBusy}
                      onClick={handleFamGatewayCheckout}
                      className="btn w-full py-3.5 text-base font-extrabold flex items-center justify-center gap-2 bg-gradient-to-r from-[#10b981] via-[#059669] to-[#047857] hover:brightness-110 text-white shadow-lg shadow-emerald-500/25 border-none disabled:opacity-60"
                    >
                      {famBusy ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Generating Instant UPI QR...</span>
                        </>
                      ) : (
                        <>
                          <QrCode className="h-5 w-5" />
                          <span>
                            Pay via UPI (GPay, PhonePe, Paytm) &bull; ₹
                            {Math.max(1, Math.round(orderTotal * (usdToInrRate || 88))).toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full ml-1">
                            Instant
                          </span>
                        </>
                      )}
                    </button>
                  )}

                  {tebexConfigured && (
                    <button
                      type="button"
                      disabled={tebexBusy || ckBusy}
                      onClick={handleTebexCheckout}
                      className="btn w-full py-3.5 text-base font-extrabold flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {tebexBusy ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Connecting to Tebex Checkout...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          <span>Pay Securely via Tebex</span>
                          <ExternalLink className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={ckBusy || tebexBusy || !SERVER_CONFIG.discordTicketPanelUrl}
                    onClick={handleCheckoutConfirm}
                    className={`${
                      tebexConfigured ? "btn glass" : "btn"
                    } w-full py-3.5 text-base font-extrabold flex items-center justify-center gap-2 disabled:opacity-60`}
                  >
                    {ckBusy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Preparing your order...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue to Discord</span>
                        <ExternalLink className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutView("closed");
                      setCartOpen(true);
                    }}
                    className="btn glass w-full py-2.5 text-sm font-bold flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to cart</span>
                  </button>
                </div>
              </div>
            )}

            {checkoutView === "handoff" && handoffOrder && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-full bg-[#2fd47a]/15 border border-[#2fd47a]/40 text-[#2fd47a] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <h3 className="font-head text-2xl sm:text-3xl text-white tracking-wide">
                    Order request ready
                  </h3>
                </div>

                <p className="text-sm text-[#a3abd6]">
                  Reference{" "}
                  <b className="text-white font-mono text-base font-bold ml-1">
                    {handoffOrder.ref}
                  </b>
                </p>

                <div className="rounded-xl p-3.5 bg-[#ff9a1f]/10 border border-[#ff9a1f]/30 text-xs text-[#d1d7f0] leading-relaxed">
                  <b className="text-white">No ticket has been created yet.</b> This website cannot create Discord tickets by itself and cannot see whether you opened one. Opening the Discord link does not create a ticket or send your cart: you click the Paid Support button there and paste your order details.
                </div>

                <ol className="list-decimal pl-5 text-xs sm:text-sm text-[#a3abd6] space-y-1.5 leading-relaxed">
                  <li>Copy your order details.</li>
                  <li>
                    Open our Discord and choose <b className="text-white">Paid Support</b> in the ticket panel.
                  </li>
                  <li>Paste the order details into the ticket and send them.</li>
                  <li>
                    Staff reply with payment instructions. Your items are delivered only after staff verify payment.
                  </li>
                </ol>

                {/* Order Snapshot Items */}
                <div className="rounded-xl bg-[#141a42] border border-white/[0.08] divide-y divide-white/[0.08]">
                  {handoffOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm"
                    >
                      <div>
                        <div className="text-white font-semibold">
                          {item.name}
                          {item.qty > 1 ? ` × ${item.qty}` : ""}
                        </div>
                        <small className="text-xs text-[#a3abd6] font-mono">
                          {formatUsd(item.unit)} each
                        </small>
                      </div>
                      <div className="font-mono font-bold text-white">{formatUsd(item.sub)}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between py-2 border-y border-white/[0.08]">
                  <span className="text-sm font-bold text-[#a3abd6]">Total</span>
                  <span className="font-head text-2xl g">{formatUsd(handoffOrder.total)}</span>
                </div>

                <textarea
                  id="order-details-textarea"
                  readOnly
                  rows={8}
                  aria-label="Order details to paste into your ticket"
                  value={formatOrderText(handoffOrder)}
                  className="w-full rounded-xl bg-[#0a0d22] text-white border border-white/[0.12] p-3 font-mono text-xs leading-relaxed resize-y focus:outline-none focus:border-[#3aa0ff]"
                />

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleCopyOrderDetails}
                    className="btn py-2.5 px-4 text-sm font-bold flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy Order Details</span>
                  </button>

                  <a
                    href={SERVER_CONFIG.discordTicketPanelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn glass py-2.5 px-4 text-sm font-bold flex items-center gap-2"
                  >
                    <span>Open Paid Support Ticket</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>

                  {SERVER_CONFIG.discordInvite && (
                    <a
                      href={SERVER_CONFIG.discordInvite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn glass py-2.5 px-4 text-xs font-bold"
                    >
                      Not in the server? Join first
                    </a>
                  )}
                </div>

                {copyFeedback && (
                  <p role="status" className="text-xs text-[#2fd47a] font-medium">
                    {copyFeedback}
                  </p>
                )}

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleClearCartAfterTicket}
                    className="btn glass w-full py-2.5 text-sm font-bold"
                  >
                    I&apos;ve submitted my ticket — Clear Cart
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
