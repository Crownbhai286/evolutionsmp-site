import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth/admin";
import { recordAuditLog } from "@/lib/audit";
import { getRequestIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  if (!z.string().uuid().safeParse(params.id).success) {
    return NextResponse.json({ error: "Invalid media ID." }, { status: 400 });
  }

  const { data: row, error: fetchErr } = await guard.db
    .from("media_files")
    .select("*")
    .eq("id", params.id)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Media file not found." }, { status: 404 });
  }

  if (row.storage_path) {
    await guard.db.storage.from(row.bucket || "media").remove([row.storage_path]);
  }

  const { error: delErr } = await guard.db
    .from("media_files")
    .delete()
    .eq("id", params.id);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  await recordAuditLog({
    adminUserId: guard.admin.id,
    adminEmail: guard.admin.email,
    adminRole: guard.admin.role,
    action: "DELETE_MEDIA",
    entityType: "media_files",
    entityId: params.id,
    details: { fileName: row.file_name, folder: row.folder },
    ipAddress: getRequestIp(req),
  });

  return NextResponse.json({ deleted: true });
}
