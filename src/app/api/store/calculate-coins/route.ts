import { NextResponse } from "next/server";
import { calculateDynamicCoinPrice, getCoinConfig } from "@/lib/services/public-data";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const ip = getRequestIp(req);
    const rl = checkRateLimit(`calc-coins:${ip}`, 90, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const coinConfig = await getCoinConfig();
    const rawCoins = body.coins;
    const rawUsername = typeof body.username === "string" ? body.username.trim() : "";
    const isValidUsername = /^[a-zA-Z0-9_.*~-]{1,16}$/.test(rawUsername);
    const username = isValidUsername ? rawUsername : "";

    if (rawCoins === undefined || rawCoins === null || isNaN(Number(rawCoins))) {
      return NextResponse.json(
        { error: "Invalid coin amount provided." },
        { status: 400 }
      );
    }

    const coins = Math.floor(Number(rawCoins));

    if (coins < coinConfig.minCustomCoins) {
      return NextResponse.json(
        {
          error: `Minimum purchase limit is ${coinConfig.minCustomCoins.toLocaleString()} Coins.`,
          minCoins: coinConfig.minCustomCoins,
          maxCoins: coinConfig.maxCustomCoins,
        },
        { status: 400 }
      );
    }

    if (coins > coinConfig.maxCustomCoins) {
      return NextResponse.json(
        {
          error: `Maximum purchase limit is ${coinConfig.maxCustomCoins.toLocaleString()} Coins per order.`,
          minCoins: coinConfig.minCustomCoins,
          maxCoins: coinConfig.maxCustomCoins,
        },
        { status: 400 }
      );
    }

    const pricing = calculateDynamicCoinPrice(coins, coinConfig);
    const deliveryCommand = coinConfig.deliveryCommandTemplate
      .replace("{username}", username || "{username}")
      .replace("{coins}", String(coins));

    return NextResponse.json({
      success: true,
      coins,
      price: pricing.price,
      originalPrice: pricing.originalPrice,
      discountPercent: pricing.discountPercent,
      unitPrice: Math.round((pricing.price / coins) * 10000) / 10000,
      limits: {
        min: coinConfig.minCustomCoins,
        max: coinConfig.maxCustomCoins,
      },
      delivery: {
        system: coinConfig.tebexPackageId ? "Tebex Package Delivery" : "Staff Verified / In-game Economy",
        command: deliveryCommand,
        tebexPackageId: coinConfig.tebexPackageId || "coins-custom-amount",
        currency: "USD",
      },
    });
  } catch (error: any) {
    console.error("calculate-coins error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error calculating coin price." },
      { status: 500 }
    );
  }
}
