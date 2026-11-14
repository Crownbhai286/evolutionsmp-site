import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize") || 25)));
  const rawSearch = searchParams.get("search")?.trim() || "";
  // Strip PostgREST filter syntax delimiters and wildcards to prevent .or() filter injection
  const search = rawSearch.replace(/[(),*%"\\]/g, "").slice(0, 100);

  let query = guard.db
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (search) {
    query = query.or(
      `admin_email.ilike.%${search}%,action.ilike.%${search}%,entity_type.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    items: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
  });
}
