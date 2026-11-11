import { NextResponse } from "next/server";
import { COIN_CONFIG } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const rawCoins = body.coins;
    const rawUsername = typeof body.username === "string" ? body.username.trim() : "";
    // Strict sanitization: Minecraft usernames are 1-16 chars alphanumeric/underscore (plus optional Bedrock prefix)
    const isValidUsername = /^[a-zA-Z0-9_.*~-]{1,16}$/.test(rawUsername);
    const username = isValidUsername ? rawUsername : "";

    if (rawCoins === undefined || rawCoins === null || isNaN(Number(rawCoins))) {
      return NextResponse.json(
        { error: "Invalid coin amount provided." },
        { status: 400 }
      );
    }

    const coins = Math.floor(Number(rawCoins));

    // Admin Configured Limits
    if (coins < COIN_CONFIG.minCustomCoins) {
      return NextResponse.json(
        {
          error: `Minimum purchase limit is ${COIN_CONFIG.minCustomCoins.toLocaleString()} Coins.`,
          minCoins: COIN_CONFIG.minCustomCoins,
          maxCoins: COIN_CONFIG.maxCustomCoins,
        },
        { status: 400 }
      );
    }

    if (coins > COIN_CONFIG.maxCustomCoins) {
      return NextResponse.json(
        {
          error: `Maximum purchase limit is ${COIN_CONFIG.maxCustomCoins.toLocaleString()} Coins per order.`,
          minCoins: COIN_CONFIG.minCustomCoins,
          maxCoins: COIN_CONFIG.maxCustomCoins,
        },
        { status: 400 }
      );
    }

    // Authoritative Server-Side Price Calculation
    const pricing = COIN_CONFIG.calculatePrice(coins);

    // Tebex delivery command template & package integration
    const deliveryCommand = username
      ? `eco give ${username} ${coins}`
      : `eco give {username} ${coins}`;

    return NextResponse.json({
      success: true,
      coins,
      price: pricing.price,
      originalPrice: pricing.originalPrice,
      discountPercent: pricing.discountPercent,
      unitPrice: Math.round((pricing.price / coins) * 10000) / 10000,
      limits: {
        min: COIN_CONFIG.minCustomCoins,
        max: COIN_CONFIG.maxCustomCoins,
      },
      delivery: {
        system: "Tebex / In-game Economy Delivery",
        command: deliveryCommand,
        tebexPackageId: "coins-custom-amount",
        currency: "USD",
        executionTime: "instant",
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
