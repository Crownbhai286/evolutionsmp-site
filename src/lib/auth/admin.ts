import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  isSupabaseAdminConfigured,
  isSupabasePublicConfigured,
} from "@/lib/supabase/server";

export type AdminRole = "owner" | "admin";

export interface AdminUserProfile {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  role: AdminRole;
  is_active: boolean;
  last_login_at: string | null;
}

export type AdminGuardResult =
  | {
      ok: true;
      admin: AdminUserProfile;
      db: SupabaseClient;
    }
  | {
      ok: false;
      response: NextResponse;
    };

/**
 * Resolves the active authenticated administrator from Supabase Auth cookies + `admin_users`.
 */
export async function getCurrentAdminProfile(): Promise<AdminUserProfile | null> {
  if (!isSupabasePublicConfigured()) return null;

  try {
    const ssrClient = await createSupabaseServerClient();
    if (!ssrClient) return null;

    const {
      data: { user },
    } = await ssrClient.auth.getUser();
    if (!user) return null;

    const adminDb = isSupabaseAdminConfigured() ? createSupabaseAdminClient() : null;
    let data: any = null;

    // 1. Try admin client if available
    if (adminDb) {
      try {
        const res = await adminDb
          .from("admin_users")
          .select("id, user_id, email, display_name, role, is_active, last_login_at")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!res.error && res.data) {
          data = res.data;
        }
      } catch {
        // Fallback below
      }
    }

    // 2. Fallback to SSR client (RLS is_active_admin())
    if (!data) {
      try {
        const res = await ssrClient
          .from("admin_users")
          .select("id, user_id, email, display_name, role, is_active, last_login_at")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!res.error && res.data) {
          data = res.data;
        }
      } catch {
        // Fallback below
      }
    }

    // 3. Fallback matching verified user email
    if (!data && user.email) {
      const emailDb = adminDb ?? ssrClient;
      try {
        const res = await emailDb
          .from("admin_users")
          .select("id, user_id, email, display_name, role, is_active, last_login_at")
          .ilike("email", user.email)
          .maybeSingle();
        if (!res.error && res.data && (!res.data.user_id || res.data.user_id === user.id)) {
          data = res.data;
        }
      } catch {
        // Ignore fallback error
      }
    }

    if (!data || !data.is_active) return null;
    return data as AdminUserProfile;
  } catch {
    return null;
  }
}

/**
 * Enforces server-side session + active `admin_users` check + optional role requirement.
 */
export async function requireAdminSession(
  requiredRole: AdminRole = "admin"
): Promise<AdminGuardResult> {
  if (!isSupabasePublicConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and keys to .env.local." },
        { status: 503 }
      ),
    };
  }

  try {
    const ssrClient = await createSupabaseServerClient();
    if (!ssrClient) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Database unavailable." }, { status: 503 }),
      };
    }

    const {
      data: { user },
      error: authError,
    } = await ssrClient.auth.getUser();

    if (authError || !user) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
      };
    }

    const adminDb = isSupabaseAdminConfigured() ? createSupabaseAdminClient() : null;
    let activeDb: SupabaseClient = ssrClient;
    let adminRow: any = null;

    // 1. Try adminDb (service role) if configured
    if (adminDb) {
      try {
        const { data, error } = await adminDb
          .from("admin_users")
          .select("id, user_id, email, display_name, role, is_active, last_login_at")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!error && data) {
          adminRow = data;
          activeDb = adminDb;
        }
      } catch {
        // Fallback to ssrClient below
      }
    }

    // 2. Fallback to authenticated SSR client (respects RLS is_active_admin())
    if (!adminRow) {
      try {
        const { data, error } = await ssrClient
          .from("admin_users")
          .select("id, user_id, email, display_name, role, is_active, last_login_at")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!error && data) {
          adminRow = data;
          activeDb = ssrClient;
        }
      } catch {
        // Continue to email fallback
      }
    }

    // 3. Fallback matching verified session email if user_id was unset or mismatched
    if (!adminRow && user.email) {
      try {
        const queryDb = adminDb ?? ssrClient;
        const { data, error } = await queryDb
          .from("admin_users")
          .select("id, user_id, email, display_name, role, is_active, last_login_at")
          .ilike("email", user.email)
          .maybeSingle();
        if (!error && data && (!data.user_id || data.user_id === user.id)) {
          adminRow = data;
          activeDb = queryDb;

          // If user_id wasn't linked yet, link it now if using adminDb
          if (!data.user_id && adminDb) {
            await adminDb
              .from("admin_users")
              .update({ user_id: user.id })
              .eq("id", data.id);
          }
        }
      } catch {
        // Ignore fallback update errors
      }
    }

    if (!adminRow || !adminRow.is_active) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Admin permissions required." }, { status: 403 }),
      };
    }

    const profile = adminRow as AdminUserProfile;
    if (requiredRole === "owner" && profile.role !== "owner") {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Owner permissions required for this operation." },
          { status: 403 }
        ),
      };
    }

    return { ok: true, admin: profile, db: activeDb };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    };
  }
}

/**
 * Revalidates public pages whenever CMS data changes in /admin.
 */
export function revalidateAllPublicPaths(): void {
  const paths = [
    "/",
    "/store",
    "/news",
    "/staff",
    "/rules",
    "/vote",
    "/leaderboard",
  ];
  for (const p of paths) {
    revalidatePath(p);
  }
  revalidatePath("/", "layout");
}
