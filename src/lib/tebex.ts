import crypto from "node:crypto";

export interface TebexStatus {
  configured: boolean;
  hasPublicToken: boolean;
  hasSecretKey: boolean;
  hasWebhookSecret: boolean;
}

export function getTebexConfigStatus(): TebexStatus {
  const pub = process.env.TEBEX_PUBLIC_TOKEN?.trim() || "";
  const sec = process.env.TEBEX_SECRET_KEY?.trim() || "";
  const wh = process.env.TEBEX_WEBHOOK_SECRET?.trim() || "";

  const hasPublicToken = Boolean(pub) && !pub.includes("your_tebex_public_token");
  const hasSecretKey = Boolean(sec) && !sec.includes("your_tebex_secret_key");
  const hasWebhookSecret = Boolean(wh);

  return {
    configured: hasPublicToken && hasSecretKey,
    hasPublicToken,
    hasSecretKey,
    hasWebhookSecret,
  };
}

/**
 * Verifies official Tebex webhook SHA-256 HMAC signature header (`X-Signature`).
 */
export function verifyTebexWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.TEBEX_WEBHOOK_SECRET?.trim();
  if (!secret || !signatureHeader) return false;

  const bodyHash = crypto.createHash("sha256").update(rawBody).digest("hex");
  const expected = crypto.createHmac("sha256", secret).update(bodyHash).digest("hex");

  const sigBuf = Buffer.from(signatureHeader, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

/**
 * Creates a Tebex Headless API basket, attaches mapped package IDs, and returns checkout URL.
 */
export async function createTebexHeadlessCheckout(params: {
  username: string;
  returnUrl: string;
  cancelUrl: string;
  items: { tebexPackageId: string; quantity: number }[];
}): Promise<{ basketIdent: string; checkoutUrl: string }> {
  const status = getTebexConfigStatus();
  if (!status.hasPublicToken) {
    throw new Error("TEBEX_PUBLIC_TOKEN is not configured.");
  }

  const publicToken = process.env.TEBEX_PUBLIC_TOKEN!.trim();
  const baseUrl = `https://headless.tebex.io/api/accounts/${encodeURIComponent(publicToken)}`;

  const basketRes = await fetch(`${baseUrl}/baskets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      complete_url: params.returnUrl,
      cancel_url: params.cancelUrl,
      username: params.username,
      complete_auto_redirect: true,
    }),
  });

  if (!basketRes.ok) {
    const text = await basketRes.text();
    throw new Error(`Tebex basket creation failed (${basketRes.status}): ${text}`);
  }

  const basketJson = await basketRes.json();
  const basketIdent = basketJson?.data?.ident as string | undefined;
  const checkoutLink = basketJson?.data?.links?.checkout as string | undefined;

  if (!basketIdent) {
    throw new Error("Tebex API did not return a basket identifier.");
  }

  for (const item of params.items) {
    const pkgRes = await fetch(`${baseUrl}/baskets/${encodeURIComponent(basketIdent)}/packages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        package_id: item.tebexPackageId,
        quantity: item.quantity,
      }),
    });

    if (!pkgRes.ok) {
      const text = await pkgRes.text();
      throw new Error(`Failed adding package ${item.tebexPackageId} to Tebex basket: ${text}`);
    }
  }

  const finalRes = await fetch(`${baseUrl}/baskets/${encodeURIComponent(basketIdent)}`, {
    method: "GET",
  });
  const finalJson = finalRes.ok ? await finalRes.json() : null;
  const url = (finalJson?.data?.links?.checkout as string | undefined) || checkoutLink;

  if (!url) {
    throw new Error("Tebex checkout URL was not returned after adding packages.");
  }

  return { basketIdent, checkoutUrl: url };
}
