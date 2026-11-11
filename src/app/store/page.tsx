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
} from "lucide-react";
import { STORE_ITEMS, SERVER_CONFIG, COIN_CONFIG } from "@/lib/data";
import { StoreItem } from "@/lib/types";
import { useToast } from "@/components/NotificationToast";
import RankIcon from "@/components/RankIcon";

interface CartItem {
  item: StoreItem;
  qty: number;
}

export default function StorePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeModalItem, setActiveModalItem] = useState<StoreItem | null>(null);
  const [modalQty, setModalQty] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([
    { item: STORE_ITEMS[2], qty: 1 }, // Default demo item
  ]);
  const [cartOpen, setCartOpen] = useState(false);
  const [mcUsername, setMcUsername] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);

  // Custom Coins Calculator State
  const [customCoinAmount, setCustomCoinAmount] = useState<number>(350);
  const [customPricing, setCustomPricing] = useState(() => COIN_CONFIG.calculatePrice(350));
  const [isVerifyingCoins, setIsVerifyingCoins] = useState(false);
  const [coinInputError, setCoinInputError] = useState<string | null>(null);

  const { showToast } = useToast();

  // Category navigation - COIN SHOP placed strictly ABOVE Special Bundles
  const categories = [
    { id: "all", name: "All Products", count: STORE_ITEMS.length },
    { id: "RANKS", name: "Survival Rank", count: STORE_ITEMS.filter((i) => i.category === "RANKS").length },
    { id: "KEYS", name: "Keys & Crates", count: STORE_ITEMS.filter((i) => i.category === "KEYS").length },
    { id: "COINS", name: "Coin Shop", count: STORE_ITEMS.filter((i) => i.category === "COINS").length },
    { id: "BUNDLES", name: "Special Bundles", count: STORE_ITEMS.filter((i) => i.category === "BUNDLES").length },
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
        description: `${data.coins.toLocaleString()} In-game Survival Coins credited automatically via /eco give.`,
        perks: [
          `${data.coins.toLocaleString()} Survival Coins delivered in-game within 60s`,
          `${data.discountPercent}% Volume Discount applied ($${(data.originalPrice - data.price).toFixed(2)} savings)`,
          "Spend on player warps, chest shops, auctions & land claims",
          "100% loss protected & non-expiring",
        ],
        icon: "Coins",
        checkoutUrl: `https://${SERVER_CONFIG.storeDomain}/checkout?package=coins&amount=${data.coins}`,
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
          `${customCoinAmount.toLocaleString()} Survival Coins delivered in-game within 60s`,
          "Spend on player warps, chest shops, auctions & land claims",
        ],
        icon: "Coins",
        checkoutUrl: `https://${SERVER_CONFIG.storeDomain}/checkout?package=coins&amount=${customCoinAmount}`,
      };
      addToCart(fallbackItem, 1);
    } finally {
      setIsVerifyingCoins(false);
    }
  };

  const addToCart = (item: StoreItem, quantity: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, qty: c.qty + quantity } : c
        );
      }
      return [...prev, { item, qty: quantity }];
    });
    showToast(
      `Added to Cart!`,
      `${quantity}x ${item.name} was added to your order.`,
      "success"
    );
    setCartOpen(true);
    if (activeModalItem) setActiveModalItem(null);
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((c) => c.item.id !== id));
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.item.id === id) {
            const newQty = c.qty + delta;
            return newQty > 0 ? { ...c, qty: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const applyCoupon = () => {
    if (couponCode.trim().toUpperCase() === "EVOLUTION20") {
      setDiscountPercent(20);
      setCouponMessage("Coupon applied: 20% discount");
    } else {
      setDiscountPercent(0);
      setCouponMessage("Invalid or expired coupon");
    }
  };

  const subtotal = cart.reduce((sum, c) => sum + c.item.price * c.qty, 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const finalTotal = Math.max(0, subtotal - discountAmount);
  const totalCartCount = cart.reduce((sum, c) => sum + c.qty, 0);
  const totalCoinsInCart = cart.reduce(
    (sum, c) => sum + (c.item.coinAmount || 0) * c.qty,
    0
  );

  const handleCheckout = () => {
    if (!mcUsername.trim()) {
      setCartError("Please enter your Minecraft username.");
      return;
    }
    if (!termsAccepted) {
      setCartError("You must accept the terms of digital purchase.");
      return;
    }
    setCartError(null);
    showToast("Redirecting to Tebex...", "Opening secure Tebex payment gateway.", "info");

    const checkoutUrl = `https://${SERVER_CONFIG.storeDomain}/checkout?username=${encodeURIComponent(
      mcUsername.trim()
    )}&coins=${totalCoinsInCart}`;
    window.open(checkoutUrl, "_blank", "noopener,noreferrer");
  };

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

            {/* Card 2: Secure Checkout */}
            <li className="flex items-center gap-3.5 px-4 py-3 rounded-[14px] bg-[#0a0d22]/65 border border-[rgba(58,160,255,0.22)] backdrop-blur-md shadow-lg shadow-black/20 hover:border-[rgba(58,160,255,0.5)] hover:bg-[#0a0d22]/80 transition-all">
              <span className="w-9 h-9 shrink-0 rounded-[10px] grid place-items-center bg-[#ff9a1f]/15 text-[#ff9a1f] border border-[rgba(58,160,255,0.25)]">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <b className="text-white text-[14.5px] block font-bold leading-tight">Secure Checkout</b>
                <small className="text-[#a3abd6] text-[12.5px] block leading-tight mt-0.5">
                  256-bit SSL encrypted payments via Tebex
                </small>
              </div>
            </li>

            {/* Card 3: Dedicated Support */}
            <li className="flex items-center gap-3.5 px-4 py-3 rounded-[14px] bg-[#0a0d22]/65 border border-[rgba(58,160,255,0.22)] backdrop-blur-md shadow-lg shadow-black/20 hover:border-[rgba(58,160,255,0.5)] hover:bg-[#0a0d22]/80 transition-all">
              <span className="w-9 h-9 shrink-0 rounded-[10px] grid place-items-center bg-[#ff9a1f]/15 text-[#ff9a1f] border border-[rgba(58,160,255,0.25)]">
                <MessageCircle className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <b className="text-white text-[14.5px] block font-bold leading-tight">Dedicated Support</b>
                <small className="text-[#a3abd6] text-[12.5px] block leading-tight mt-0.5">
                  24/7 assistance through Discord tickets
                </small>
              </div>
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

          <div className="pt-4 mt-2 border-t border-white/[0.08]">
            <button
              onClick={() => setCartOpen(true)}
              className="w-full btn glass small flex items-center justify-center gap-2"
            >
              <ShoppingCart className="h-4 w-4 text-[#ff9a1f]" />
              <span>View Cart ({totalCartCount})</span>
            </button>
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
                    onClick={() => setActiveModalItem(item)}
                  >
                    <div
                      className={`h-24 w-24 rounded-2xl bg-[#0a0d22]/70 border flex items-center justify-center relative overflow-visible shadow-inner transition-colors ${
                        isRecommended ? "border-[#ff9a1f]/50 group-hover:border-[#ff9a1f]" : "border-[rgba(130,150,255,0.2)] group-hover:border-[#ff9a1f]/60"
                      }`}
                    >
                      <RankIcon name={item.name} category={item.category} size="md" />
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
                      onClick={() => setActiveModalItem(item)}
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

          {/* Help notice */}
          <p className="text-center text-xs text-[#a3abd6] pt-6">
            Issues with a purchase?{" "}
            <a
              href={SERVER_CONFIG.discordInvite}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3aa0ff] hover:underline font-bold"
            >
              Open a support ticket on Discord
            </a>
          </p>
        </section>
      </div>

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
              <div className="h-16 w-16 rounded-2xl bg-[#0a0d22]/80 border border-[rgba(130,150,255,0.25)] flex items-center justify-center shrink-0 shadow-lg relative overflow-visible">
                <RankIcon name={activeModalItem.name} category={activeModalItem.category} size="sm" />
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
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/[0.08]">
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#a3abd6] font-bold">Quantity:</span>
                <div className="flex items-center rounded-xl bg-[#141a42] border border-white/[0.08] p-1">
                  <button
                    onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                    className="p-1.5 rounded-lg hover:bg-white/[0.1] text-white"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-3 font-mono font-bold text-white text-sm">
                    {modalQty}
                  </span>
                  <button
                    onClick={() => setModalQty(modalQty + 1)}
                    className="p-1.5 rounded-lg hover:bg-white/[0.1] text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => addToCart(activeModalItem, modalQty)}
                className="btn w-full sm:w-auto"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Add to Cart (${(activeModalItem.price * modalQty).toFixed(2)})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Playbex Slide-out Cart Drawer (.drawer) */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setCartOpen(false)}
          />

          <aside className="fixed top-0 right-0 bottom-0 w-full max-w-[440px] bg-[#0f1433] border-l border-white/[0.14] p-6 flex flex-col justify-between overflow-y-auto shadow-2xl z-50">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-[#ff9a1f]" />
                  <h3 className="font-head text-2xl text-white tracking-wide">Shopping Cart</h3>
                </div>
                <button
                  onClick={() => setCartOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="divide-y divide-white/[0.08] my-4">
                {cart.length === 0 ? (
                  <div className="py-12 text-center text-[#a3abd6] text-sm">
                    Your cart is currently empty.
                  </div>
                ) : (
                  cart.map(({ item, qty }) => (
                    <div key={item.id} className="py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-[#0a0d22]/80 border border-white/[0.08] flex items-center justify-center shrink-0 overflow-visible">
                          <RankIcon name={item.name} category={item.category} size="sm" />
                        </div>
                        <div>
                          <b className="text-white text-sm block font-bold leading-tight">{item.name}</b>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-[#a3abd6] font-mono">
                              ${item.price.toFixed(2)} each
                            </span>
                            {item.coinAmount && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold text-[#ff9a1f] bg-[#ff9a1f]/10 border border-[#ff9a1f]/20">
                                {item.coinAmount.toLocaleString()} Coins
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center rounded-lg bg-[#141a42] border border-white/[0.08]">
                          <button
                            onClick={() => updateCartQty(item.id, -1)}
                            className="p-1 text-slate-400 hover:text-white"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2 font-mono text-xs font-bold text-white">
                            {qty}
                          </span>
                          <button
                            onClick={() => updateCartQty(item.id, 1)}
                            className="p-1 text-slate-400 hover:text-white"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <span className="font-mono font-bold text-white text-sm w-16 text-right">
                          ${(item.price * qty).toFixed(2)}
                        </span>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 text-red-400 hover:text-red-300"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Coin Delivery Notice if coins are in cart */}
              {totalCoinsInCart > 0 && (
                <div className="p-3 rounded-xl bg-[#ff9a1f]/10 border border-[#ff9a1f]/25 text-xs text-[#d1d7f0] mb-4 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#ff9a1f]">
                    <Coins className="h-4 w-4" />
                    <span>In-Game Coins Total: {totalCoinsInCart.toLocaleString()} Coins</span>
                  </div>
                  <p className="text-[11px] text-[#a3abd6] leading-relaxed">
                    Coins will be credited automatically to your account upon checkout via <code>/eco give</code> within 60 seconds.
                  </p>
                </div>
              )}
            </div>

            {/* Drawer Footer Checkout Area */}
            <div className="pt-4 border-t border-white/[0.08] space-y-4">
              {/* Coupon Row */}
              <div>
                <label className="text-xs font-bold text-[#a3abd6] block mb-1">
                  Have a Promo Code?
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="e.g. EVOLUTION20"
                    className="flex-1 px-3 py-2 rounded-xl bg-[#141a42] border border-white/[0.08] text-xs text-white uppercase focus:outline-none focus:border-[#ff9a1f]"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    className="px-3.5 py-2 rounded-xl bg-[#232c6a] hover:bg-[#2b367d] text-xs font-bold text-white transition-all"
                  >
                    Apply
                  </button>
                </div>
                {couponMessage && (
                  <p
                    className={`text-[11px] mt-1 ${
                      discountPercent > 0 ? "text-green-400 font-bold" : "text-amber-400"
                    }`}
                  >
                    {couponMessage}
                  </p>
                )}
              </div>

              {/* Total Row */}
              <div className="flex items-center justify-between text-base border-t border-white/[0.08] pt-3">
                <span className="text-[#a3abd6] font-bold">Total Due</span>
                <span className="font-head text-2xl g">${finalTotal.toFixed(2)}</span>
              </div>

              {/* Minecraft Username Field */}
              <div>
                <label className="text-xs font-bold text-white block mb-1">
                  Your Minecraft Username <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={mcUsername}
                  onChange={(e) => setMcUsername(e.target.value)}
                  placeholder="Steve"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141a42] border border-white/[0.08] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ff9a1f]"
                />
                <span className="text-[11px] text-[#a3abd6] block mt-1">
                  If playing on Bedrock (Mobile or Console), add a dot prefix: <code>.YourName</code>
                </span>
              </div>

              {/* Terms Checkbox */}
              <label className="flex items-start gap-2 text-xs text-[#a3abd6] cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded bg-[#141a42] border-white/20 text-[#ff9a1f] focus:ring-0"
                />
                <span>I agree that digital in-game goods are delivered immediately and non-refundable.</span>
              </label>

              {cartError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{cartError}</span>
                </div>
              )}

              {/* Checkout CTA */}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="btn w-full py-4 text-base font-extrabold flex items-center justify-center gap-2"
              >
                <Lock className="h-4 w-4" />
                <span>Checkout Now (${finalTotal.toFixed(2)})</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
