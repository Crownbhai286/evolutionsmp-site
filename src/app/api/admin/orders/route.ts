import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await requireAdminSession("admin");
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();
  const status = searchParams.get("status")?.trim();
  const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit")) || 50));

  let query = guard.db
    .from("store_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(
      `order_id.ilike.%${search}%,famgateway_order_id.ilike.%${search}%,username.ilike.%${search}%,utr.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    // If table doesn't exist yet, return helpful response rather than crashing
    if (error.code === "42P01" || error.message.includes("does not exist") || error.code === "PGRST205") {
      return NextResponse.json({
        orders: [],
        tableReady: false,
        notice: "Table store_orders not initialized yet. Apply supabase/migrations/002_famgateway_orders.sql.",
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    orders: data ?? [],
    tableReady: true,
  });
}
