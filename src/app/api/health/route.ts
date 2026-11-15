import { NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabasePublicClient,
  isSupabaseAdminConfigured,
  isSupabasePublicConfigured,
} from "@/lib/supabase/server";
import { getTebexConfigStatus } from "@/lib/tebex";
import { getFamGatewayConfigStatus } from "@/lib/famgateway";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseConfigured = isSupabasePublicConfigured();
  const serviceRoleConfigured = isSupabaseAdminConfigured();
  const tebex = getTebexConfigStatus();
  const famgateway = getFamGatewayConfigStatus();

  const rawSyncKey = process.env.MINECRAFT_SYNC_API_KEY?.trim() || "";
  const syncApiConfigured = Boolean(rawSyncKey) && !rawSyncKey.includes("replace-with");

  let databaseConnected = false;
  let storageBucketReady = false;

  if (supabaseConfigured) {
    try {
      const publicClient = createSupabasePublicClient();
      if (publicClient) {
        const { error } = await publicClient
          .from("website_settings")
          .select("key")
          .limit(1);
        databaseConnected = !error;
      }

      if (serviceRoleConfigured) {
        const adminClient = createSupabaseAdminClient();
        if (adminClient) {
          const { data: buckets } = await adminClient.storage.listBuckets();
          storageBucketReady = Boolean(
            buckets?.some((b) => b.name === "media" || b.id === "media")
          );
        }
      }
    } catch {
      databaseConnected = false;
    }
  }

  return NextResponse.json({
    ok: true,
    mode: databaseConnected ? "supabase" : "fallback",
    supabaseConfigured,
    databaseConnected,
    serviceRoleConfigured,
    storageBucketReady,
    syncApiConfigured,
    tebexConfigured: tebex.configured,
    famgatewayConfigured: famgateway.configured,
    timestamp: new Date().toISOString(),
  });
}
