import { NextResponse } from "next/server";
import { requireAdminSession, revalidateAllPublicPaths } from "@/lib/auth/admin";
import { recordAuditLog } from "@/lib/audit";
import { getRequestIp } from "@/lib/rate-limit";
import { homepageSectionSchema } from "@/lib/validations";
import { DEFAULT_HOMEPAGE_SECTIONS } from "@/lib/services/public-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  const { data, error } = await guard.db
    .from("homepage_sections")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({
      sections: DEFAULT_HOMEPAGE_SECTIONS.map((s) => ({
        section_key: s.sectionKey,
        kicker: s.kicker,
        title: s.title,
        subtitle: s.subtitle,
        is_enabled: s.isEnabled,
        sort_order: s.sortOrder,
        content: s.content,
      })),
    });
  }

  return NextResponse.json({ sections: data });
}

export async function PATCH(req: Request) {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = homepageSectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error } = await guard.db
    .from("homepage_sections")
    .upsert(parsed.data, { onConflict: "section_key" })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordAuditLog({
    adminUserId: guard.admin.id,
    adminEmail: guard.admin.email,
    adminRole: guard.admin.role,
    action: "UPDATE_HOMEPAGE_SECTION",
    entityType: "homepage_sections",
    entityId: parsed.data.section_key,
    details: { is_enabled: parsed.data.is_enabled, title: parsed.data.title },
    ipAddress: getRequestIp(req),
  });

  revalidateAllPublicPaths();
  return NextResponse.json({ section: data });
}
