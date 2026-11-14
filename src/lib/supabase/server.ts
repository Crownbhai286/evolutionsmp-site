import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function isSupabasePublicConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
  return (
    Boolean(url && anonKey) &&
    !url.includes("your-project-ref") &&
    !anonKey.includes("your-supabase-anon-key")
  );
}

export function isSupabaseAdminConfigured(): boolean {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  return (
    isSupabasePublicConfigured() &&
    Boolean(serviceKey) &&
    !serviceKey.includes("your-supabase-service-role-key")
  );
}

/**
 * Cookie-authenticated SSR Supabase client (respects RLS policies).
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  if (!isSupabasePublicConfigured()) return null;
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Cookie writes inside Server Components are safely ignored when middleware refreshes sessions
          }
        },
      },
    }
  );
}

/**
 * Anonymous read-only client for cache-safe public SSR data fetches without reading cookies.
 */
export function createSupabasePublicClient(): SupabaseClient | null {
  if (!isSupabasePublicConfigured()) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Service-role Supabase client strictly restricted to server execution.
 */
export function createSupabaseAdminClient(): SupabaseClient | null {
  if (typeof window !== "undefined") {
    throw new Error("createSupabaseAdminClient must never be invoked on the client.");
  }
  if (!isSupabaseAdminConfigured()) return null;

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
