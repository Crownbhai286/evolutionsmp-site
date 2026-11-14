import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/lib/audit";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { adminUserCreateSchema, adminUserUpdateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminSession("admin");
  if (!guard.ok) return guard.response;

  const { data, error } = await guard.db
    .from("admin_users")
    .select("id, user_id, email, display_name, role, is_active, last_login_at, created_at")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const guard = await requireAdminSession("owner");
  if (!guard.ok) return guard.response;

  const rl = checkRateLimit(`admin-create-user:${guard.admin.id}`, 10, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });

  const adminClient = createSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is required to create admin accounts." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = adminUserCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const { data: createdAuth, error: authErr } = await adminClient.auth.admin.createUser({
    email: normalizedEmail,
    password: parsed.data.password,
    email_confirm: true,
  });

  if (authErr || !createdAuth.user) {
    return NextResponse.json(
      { error: authErr?.message || "Failed to create Auth user." },
      { status: 400 }
    );
  }

  const { data: adminRow, error: insertErr } = await adminClient
    .from("admin_users")
    .insert({
      user_id: createdAuth.user.id,
      email: normalizedEmail,
      display_name: parsed.data.display_name,
      role: parsed.data.role,
      is_active: true,
    })
    .select("id, user_id, email, display_name, role, is_active, created_at")
    .single();

  if (insertErr) {
    await adminClient.auth.admin.deleteUser(createdAuth.user.id).catch(() => {});
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  await recordAuditLog({
    adminUserId: guard.admin.id,
    adminEmail: guard.admin.email,
    adminRole: guard.admin.role,
    action: "CREATE_ADMIN_USER",
    entityType: "admin_users",
    entityId: adminRow.id,
    details: { email: adminRow.email, role: adminRow.role },
    ipAddress: getRequestIp(req),
  });

  return NextResponse.json({ item: adminRow }, { status: 201 });
}

export async function PATCH(req: Request) {
  const guard = await requireAdminSession("owner");
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = adminUserUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed." }, { status: 400 });
  }

  if (parsed.data.id === guard.admin.id && parsed.data.is_active === false) {
    return NextResponse.json(
      { error: "You cannot deactivate your own active owner account." },
      { status: 400 }
    );
  }

  if (parsed.data.id === guard.admin.id && parsed.data.role === "admin") {
    return NextResponse.json(
      { error: "You cannot demote your own owner role to prevent accidental lockout." },
      { status: 400 }
    );
  }

  const { id, ...patch } = parsed.data;
  const { data, error } = await guard.db
    .from("admin_users")
    .update(patch)
    .eq("id", id)
    .select("id, user_id, email, display_name, role, is_active, last_login_at, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAuditLog({
    adminUserId: guard.admin.id,
    adminEmail: guard.admin.email,
    adminRole: guard.admin.role,
    action: "UPDATE_ADMIN_USER",
    entityType: "admin_users",
    entityId: id,
    details: patch,
    ipAddress: getRequestIp(req),
  });

  return NextResponse.json({ item: data });
}
