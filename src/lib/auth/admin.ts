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

    const db = createSupabaseAdminClient() ?? ssrClient;
    const { data } = await db
      .from("admin_users")
      .select("id, user_id, email, display_name, role, is_active, last_login_at")
      .eq("user_id", user.id)
      .maybeSingle();

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
    const db = adminDb ?? ssrClient;

    const { data: adminRow, error: rowError } = await db
      .from("admin_users")
      .select("id, user_id, email, display_name, role, is_active, last_login_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (rowError || !adminRow || !adminRow.is_active) {
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

    return { ok: true, admin: profile, db };
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
