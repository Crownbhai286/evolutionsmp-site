import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function isConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
  return (
    Boolean(url && anon) &&
    !url.includes("your-project-ref") &&
    !anon.includes("your-supabase-anon-key")
  );
}

export async function updateAdminSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginPage = pathname === "/admin/login";

  if (!isAdminRoute) {
    return response;
  }

  if (!isConfigured()) {
    if (!isLoginPage) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("setup", "missing");
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (!isLoginPage) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  // Verify the signed-in user holds an active row in admin_users
  let isActiveAdmin = false;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

  if (serviceKey && !serviceKey.includes("your-supabase-service-role-key")) {
    try {
      const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: adminRow, error: adminErr } = await adminClient
        .from("admin_users")
        .select("id, is_active")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!adminErr && adminRow) {
        isActiveAdmin = Boolean(adminRow.is_active);
      }
    } catch {
      // Fallback to ssr client below
    }
  }

  // Fallback to checking via authenticated SSR client (using RLS is_active_admin())
  if (!isActiveAdmin) {
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("id, is_active")
      .eq("user_id", user.id)
      .maybeSingle();
    isActiveAdmin = Boolean(adminRow?.is_active);
  }

  if (!isActiveAdmin) {
    if (!isLoginPage) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  if (isLoginPage) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}
