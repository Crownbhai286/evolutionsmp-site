import crypto from "node:crypto";

export interface FamGatewayConfigStatus {
  configured: boolean;
  hasApiKey: boolean;
  usdToInrRate: number;
}

export interface FamGatewayOrderResult {
  gatewayOrderId: string;
  checkoutUrl: string;
  amount: number;
  qrUrl?: string;
  upiIntent?: string;
}

export interface FamGatewayVerifyResult {
  verified: boolean;
  status: "paid" | "success" | "confirmed" | "pending" | "expired" | "failed" | "unknown";
  orderId: string;
  amount?: number;
  utr?: string;
  senderUpi?: string;
  raw?: unknown;
}

/**
 * Checks server configuration for FamGateway UPI payments.
 */
export function getFamGatewayConfigStatus(): FamGatewayConfigStatus {
  const apiKey = process.env.FAMGATEWAY_API_KEY?.trim() || "";
  const hasApiKey = Boolean(apiKey) && !apiKey.includes("your_api_key_here");
  const rawRate = Number(process.env.USD_TO_INR_RATE);
  const usdToInrRate = Number.isFinite(rawRate) && rawRate > 0 ? rawRate : 94.25;

  return {
    configured: hasApiKey,
    hasApiKey,
    usdToInrRate,
  };
}

/**
 * Converts USD prices from catalog to INR for UPI payment processing.
 */
export function convertUsdToInr(usdAmount: number, customRate?: number): number {
  const rate = customRate || getFamGatewayConfigStatus().usdToInrRate;
  const safeUsd = Math.max(0, Number(usdAmount) || 0);
  const inr = Math.round(safeUsd * rate * 100) / 100;
  return Math.max(1, inr); // Minimum 1 INR for payment processor
}

/**
 * Generates an internal unique order reference for EvolutionSMP.
 */
export function generateInternalOrderId(): string {
  const time = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `EVO-UPI-${time}-${rand}`;
}

/**
 * Cryptographically verifies incoming webhook payload using HMAC-SHA256 signature.
 */
export function verifyFamGatewayWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const apiKey = process.env.FAMGATEWAY_API_KEY?.trim();
  if (!apiKey || !signatureHeader) return false;

  try {
    const expected = crypto
      .createHmac("sha256", apiKey)
      .update(rawBody)
      .digest("hex");

    const cleanHeader = signatureHeader
      .trim()
      .toLowerCase()
      .replace(/^sha256=/i, "");
    const cleanExpected = expected.toLowerCase();

    const sigBuf = Buffer.from(cleanHeader, "utf8");
    const expBuf = Buffer.from(cleanExpected, "utf8");

    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch (err) {
    console.error("[FamGateway] Webhook signature verification error:", err);
    return false;
  }
}

/**
 * Initiates a hosted payment session with FamGateway UPI.
 * POST https://famgateway.in/api/create-order
 */
export async function createFamGatewayOrder(params: {
  amount: number;
  customerName: string;
  redirectUrl: string;
  webhookUrl: string;
}): Promise<FamGatewayOrderResult> {
  const apiKey = process.env.FAMGATEWAY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("FAMGATEWAY_API_KEY is not configured on the server.");
  }

  const endpoint = "https://famgateway.in/api/create-order";
  const payload = {
    amount: Number(params.amount.toFixed(2)),
    customer_name: params.customerName.trim(),
    redirect_url: params.redirectUrl,
    webhook_url: params.webhookUrl,
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const responseText = await response.text();
  let json: any = null;
  try {
    json = JSON.parse(responseText);
  } catch {
    throw new Error(
      `FamGateway API returned non-JSON response (HTTP ${response.status}): ${responseText.slice(0, 150)}`
    );
  }

  if (!response.ok || (json.status && json.status !== "success" && json.status !== "true" && json.status !== 200)) {
    const errorMsg = json.message || json.error || `HTTP ${response.status}`;
    throw new Error(`FamGateway order creation failed: ${errorMsg}`);
  }

  // Support both top-level and nested data payloads
  const data = json.data || json;
  const checkoutUrl = data.checkout_url || json.checkout_url;
  const gatewayOrderId = data.order_id || json.order_id;

  if (!checkoutUrl) {
    throw new Error("FamGateway did not return a valid checkout URL in response.");
  }

  return {
    gatewayOrderId: String(gatewayOrderId || ""),
    checkoutUrl: String(checkoutUrl),
    amount: Number(data.payable_amount || data.amount || params.amount),
    qrUrl: data.qr_url || undefined,
    upiIntent: data.upi_intent || undefined,
  };
}

/**
 * Authoritative Server-to-Server order verification before fulfillment.
 * GET https://famgateway.in/api/verify-order.php?order_id=...
 */
export async function verifyFamGatewayOrderServerToServer(
  orderId: string
): Promise<FamGatewayVerifyResult> {
  const apiKey = process.env.FAMGATEWAY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("FAMGATEWAY_API_KEY is not configured.");
  }

  const cleanId = orderId.trim();
  if (!cleanId) {
    return {
      verified: false,
      status: "unknown",
      orderId: "",
    };
  }

  const url = `https://famgateway.in/api/verify-order.php?order_id=${encodeURIComponent(cleanId)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-Api-Key": apiKey,
    },
    cache: "no-store",
  });

  const text = await response.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    console.error(`[FamGateway] verify-order returned non-JSON for ${cleanId}:`, text.slice(0, 100));
    return {
      verified: false,
      status: "unknown",
      orderId: cleanId,
    };
  }

  const rawStatus = String(json.status || json.data?.status || "").toLowerCase();
  const utr = json.utr || json.data?.utr || json.bank_ref_num || undefined;
  const amount = Number(json.amount || json.data?.amount) || undefined;
  const senderUpi = json.sender_upi || json.data?.sender_upi || undefined;

  const isPaid =
    rawStatus === "paid" ||
    rawStatus === "success" ||
    rawStatus === "confirmed" ||
    json.verified === true ||
    json.data?.verified === true;

  const isExpired = rawStatus === "expired";
  const isFailed = rawStatus === "failed" || rawStatus === "rejected";
  const isPending = rawStatus === "pending" || rawStatus === "active";

  let normalizedStatus: FamGatewayVerifyResult["status"] = "unknown";
  if (isPaid) normalizedStatus = "paid";
  else if (isPending) normalizedStatus = "pending";
  else if (isExpired) normalizedStatus = "expired";
  else if (isFailed) normalizedStatus = "failed";

  return {
    verified: isPaid,
    status: normalizedStatus,
    orderId: String(json.order_id || json.data?.order_id || cleanId),
    amount,
    utr: utr ? String(utr) : undefined,
    senderUpi: senderUpi ? String(senderUpi) : undefined,
    raw: json,
  };
}
