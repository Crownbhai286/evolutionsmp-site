import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin";
import { getTebexConfigStatus } from "@/lib/tebex";
import { isSupabaseAdminConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  const { db, admin } = guard;

  try {
    const [
      statsRes,
      settingsRes,
      productsCountRes,
      newsCountRes,
      staffCountRes,
      voteSitesRes,
      logsRes,
    ] = await Promise.all([
      db.from("server_statistics").select("*").eq("key", "default").maybeSingle(),
      db.from("website_settings").select("java_ip, bedrock_ip, bedrock_port, season_name, minecraft_version").eq("key", "default").maybeSingle(),
      db.from("store_products").select("id", { count: "exact", head: true }),
      db.from("news_posts").select("id, status", { count: "exact" }),
      db.from("staff_members").select("id", { count: "exact", head: true }),
      db.from("vote_sites").select("id, votes_today, is_enabled"),
      db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(12),
    ]);

    const totalVotes = (voteSitesRes.data || []).reduce(
      (sum: number, v: any) => sum + (Number(v.votes_today) || 0),
      0
    );
    const publishedNewsCount = (newsCountRes.data || []).filter(
      (n: any) => n.status === "published"
    ).length;

    return NextResponse.json({
      admin,
      databaseConnected: true,
      serviceRoleConfigured: isSupabaseAdminConfigured(),
      tebexStatus: getTebexConfigStatus(),
      stats: statsRes.data ?? null,
      settings: settingsRes.data ?? null,
      counts: {
        products: productsCountRes.count ?? 0,
        newsTotal: newsCountRes.count ?? 0,
        newsPublished: publishedNewsCount,
        staff: staffCountRes.count ?? 0,
        voteSites: (voteSitesRes.data || []).length,
        votesTodayTotal: totalVotes,
      },
      recentActivities: logsRes.data ?? [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load admin overview." },
      { status: 500 }
    );
  }
}
