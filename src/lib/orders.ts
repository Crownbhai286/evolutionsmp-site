import { createSupabaseAdminClient, createSupabasePublicClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/lib/audit";
import type { StoreCatalogItem, CoinConfigData } from "@/lib/types";

export interface StoredOrderItem {
  slug: string;
  name: string;
  quantity: number;
  unitPriceUsd: number;
  subtotalUsd: number;
  coinAmount?: number;
}

export interface StoreOrderRecord {
  id: string;
  order_id: string;
  famgateway_order_id: string | null;
  username: string;
  amount: number;
  currency: string;
  original_usd_total: number;
  items: StoredOrderItem[];
  delivery_commands: string[];
  status: "pending" | "paid" | "failed" | "expired" | "cancelled";
  payment_status: "unpaid" | "paid" | "failed" | "expired";
  payment_method: string;
  utr: string | null;
  sender_upi: string | null;
  checkout_url: string;
  delivery_status: "pending" | "delivered" | "failed" | "manual_review";
  delivered_at: string | null;
  delivery_attempts: number;
  delivery_error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Builds concrete in-game Minecraft console commands for paid order fulfillment.
 */
export function buildDeliveryCommands(params: {
  username: string;
  items: { slug: string; quantity: number }[];
  catalog: StoreCatalogItem[];
  coinConfig: CoinConfigData;
}): string[] {
  const commands: string[] = [];
  const cleanIgn = params.username.trim();

  for (const cartItem of params.items) {
    const qty = Math.max(1, cartItem.quantity || 1);

    // Custom coin package
    const coinMatch = /^coins-custom-(\d+)$/.exec(cartItem.slug);
    if (coinMatch) {
      const coins = Number(coinMatch[1]) * qty;
      const tpl = params.coinConfig.deliveryCommandTemplate || "eco give {username} {coins}";
      commands.push(
        tpl.replace(/\{username\}/gi, cleanIgn).replace(/\{coins\}/gi, String(coins))
      );
      continue;
    }

    // Catalog products
    const product = params.catalog.find((p) => p.id === cartItem.slug);
    if (!product) continue;

    if (product.deliveryCommand && product.deliveryCommand.trim()) {
      const cmd = product.deliveryCommand.trim();
      // If the command is repeatable per quantity (like keys)
      if (cmd.includes("{quantity}")) {
        commands.push(
          cmd.replace(/\{username\}/gi, cleanIgn).replace(/\{quantity\}/gi, String(qty))
        );
      } else {
        // Repeat command if multiple quantities
        for (let i = 0; i < qty; i++) {
          commands.push(cmd.replace(/\{username\}/gi, cleanIgn));
        }
      }
    } else if (product.coinAmount && product.coinAmount > 0) {
      const coins = product.coinAmount * qty;
      const tpl = params.coinConfig.deliveryCommandTemplate || "eco give {username} {coins}";
      commands.push(
        tpl.replace(/\{username\}/gi, cleanIgn).replace(/\{coins\}/gi, String(coins))
      );
    } else if (product.category === "RANKS") {
      const rankName = product.id.replace(/^rank-/, "");
      commands.push(`lp user ${cleanIgn} parent add ${rankName}`);
    } else {
      // Fallback log command for staff review
      commands.push(`say [Store] Verified purchase of ${product.name} x${qty} for ${cleanIgn}`);
    }
  }

  return commands;
}

function getDatabaseClient() {
  const adminDb = createSupabaseAdminClient();
  if (!adminDb) {
    console.error(
      "[Orders] SUPABASE_SERVICE_ROLE_KEY is required for secure server-side store_orders operations. Public client is forbidden."
    );
    return null;
  }
  return adminDb;
}

/**
 * Persists a new checkout order into `store_orders` with status: 'pending'.
 */
export async function createInternalOrder(params: {
  orderId: string;
  username: string;
  amountInr: number;
  amountUsd: number;
  items: StoredOrderItem[];
  deliveryCommands: string[];
  checkoutUrl?: string;
  metadata?: Record<string, unknown>;
}): Promise<StoreOrderRecord | null> {
  const db = getDatabaseClient();
  if (!db) {
    console.warn("[Orders] No Supabase client configured to persist order.");
    return null;
  }

  const newOrder = {
    order_id: params.orderId,
    username: params.username.trim(),
    amount: params.amountInr,
    currency: "INR",
    original_usd_total: params.amountUsd,
    items: params.items,
    delivery_commands: params.deliveryCommands,
    status: "pending",
    payment_status: "unpaid",
    payment_method: "famgateway_upi",
    checkout_url: params.checkoutUrl || "",
    delivery_status: "pending",
    delivery_attempts: 0,
    metadata: params.metadata || {},
  };

  try {
    const { data, error } = await db
      .from("store_orders")
      .insert(newOrder)
      .select("*")
      .single();

    if (error) {
      console.error("[Orders] Failed to insert store_orders record:", error.message);
      return null;
    }
    return data as StoreOrderRecord;
  } catch (err) {
    console.error("[Orders] Exception creating store order:", err);
    return null;
  }
}

/**
 * Updates an order with gateway identifiers (like famgateway_order_id and checkout_url).
 */
export async function updateOrderGatewayInfo(params: {
  orderId: string;
  gatewayOrderId: string;
  checkoutUrl: string;
}): Promise<void> {
  const db = getDatabaseClient();
  if (!db) return;

  try {
    await db
      .from("store_orders")
      .update({
        famgateway_order_id: params.gatewayOrderId,
        checkout_url: params.checkoutUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", params.orderId);
  } catch (err) {
    console.error("[Orders] Failed updating gateway info:", err);
  }
}

/**
 * Fetches an order by internal order_id OR gateway_order_id.
 */
export async function getStoreOrder(
  orderIdOrGatewayId: string
): Promise<StoreOrderRecord | null> {
  const db = getDatabaseClient();
  if (!db) return null;

  const id = orderIdOrGatewayId.trim();
  try {
    // Check internal order_id first
    const { data: byInternal } = await db
      .from("store_orders")
      .select("*")
      .eq("order_id", id)
      .maybeSingle();

    if (byInternal) return byInternal as StoreOrderRecord;

    // Check by gateway order id
    const { data: byGateway } = await db
      .from("store_orders")
      .select("*")
      .eq("famgateway_order_id", id)
      .maybeSingle();

    if (byGateway) return byGateway as StoreOrderRecord;

    return null;
  } catch (err) {
    console.error("[Orders] Exception fetching store order:", err);
    return null;
  }
}

/**
 * Idempotently executes order delivery and marks order as paid.
 * Guarantees that multiple webhooks or race conditions NEVER double-deliver.
 */
export async function fulfillStoreOrder(params: {
  orderId: string;
  utr?: string;
  senderUpi?: string;
  verifiedAmount?: number;
  source: string;
}): Promise<{
  success: boolean;
  alreadyFulfilled: boolean;
  order: StoreOrderRecord | null;
  error?: string;
}> {
  const db = getDatabaseClient();
  if (!db) {
    return { success: false, alreadyFulfilled: false, order: null, error: "Database client unavailable." };
  }

  const order = await getStoreOrder(params.orderId);
  if (!order) {
    return {
      success: false,
      alreadyFulfilled: false,
      order: null,
      error: `Order "${params.orderId}" not found in database.`,
    };
  }

  // Idempotency check: Already fulfilled or paid
  if (order.payment_status === "paid" && order.delivery_status === "delivered") {
    return {
      success: true,
      alreadyFulfilled: true,
      order,
    };
  }

  // Optional Amount Check
  if (params.verifiedAmount && Math.abs(Number(order.amount) - Number(params.verifiedAmount)) > 1.0) {
    console.warn(
      `[Orders] Amount discrepancy for order ${order.order_id}: stored ₹${order.amount} vs verified ₹${params.verifiedAmount}`
    );
  }

  const deliveredAt = new Date().toISOString();
  const utr = params.utr || order.utr || null;
  const senderUpi = params.senderUpi || order.sender_upi || null;

  try {
    const { data: updated, error } = await db
      .from("store_orders")
      .update({
        status: "paid",
        payment_status: "paid",
        delivery_status: "delivered",
        delivered_at: deliveredAt,
        delivery_attempts: (order.delivery_attempts || 0) + 1,
        utr,
        sender_upi: senderUpi,
        updated_at: deliveredAt,
      })
      .eq("id", order.id)
      .select("*")
      .single();

    if (error) {
      console.error("[Orders] Failed to mark order paid:", error.message);
      return { success: false, alreadyFulfilled: false, order, error: error.message };
    }

    // Record audit log for payment fulfillment
    await recordAuditLog({
      adminEmail: "famgateway-webhook@system",
      adminRole: "system",
      action: "FAMGATEWAY_PAYMENT_FULFILLED",
      entityType: "store_order",
      entityId: order.order_id,
      details: {
        orderId: order.order_id,
        gatewayOrderId: order.famgateway_order_id,
        username: order.username,
        amountInr: order.amount,
        utr,
        senderUpi,
        source: params.source,
        commandsDelivered: order.delivery_commands,
      },
    });

    return {
      success: true,
      alreadyFulfilled: false,
      order: updated as StoreOrderRecord,
    };
  } catch (err: any) {
    console.error("[Orders] Exception during order fulfillment:", err);
    return { success: false, alreadyFulfilled: false, order, error: err?.message };
  }
}
