import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin";
import { recordAuditLog } from "@/lib/audit";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const rl = checkRateLimit(`admin-login:${ip}`, 15, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  const { admin, db } = guard;
  await db
    .from("admin_users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", admin.id);

  await recordAuditLog({
    adminUserId: admin.id,
    adminEmail: admin.email,
    adminRole: admin.role,
    action: "LOGIN",
    entityType: "admin_session",
    entityId: admin.id,
    ipAddress: ip,
  });

  return NextResponse.json({ ok: true, admin });
}
