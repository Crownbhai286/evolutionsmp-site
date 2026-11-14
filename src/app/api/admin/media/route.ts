import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth/admin";
import { recordAuditLog } from "@/lib/audit";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  MEDIA_FOLDERS,
} from "@/lib/validations";

export const dynamic = "force-dynamic";

const ALLOWED_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function matchesImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;
  switch (mimeType) {
    case "image/jpeg":
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/png":
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    case "image/gif":
      return buffer.subarray(0, 6).toString("ascii").startsWith("GIF8");
    case "image/webp":
      return (
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );
    default:
      return false;
  }
}

export async function GET(req: Request) {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const folder = searchParams.get("folder");

  let query = guard.db
    .from("media_files")
    .select("*")
    .order("created_at", { ascending: false });

  if (folder && folder !== "all") {
    query = query.eq("folder", folder);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  const rl = checkRateLimit(`admin-media:${guard.admin.id}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Upload rate limit exceeded." }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const file = formData.get("file");
  const rawFolder = String(formData.get("folder") || "general");
  const replaceId = formData.get("replaceId") ? String(formData.get("replaceId")) : null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required." }, { status: 400 });
  }

  const folder = (MEDIA_FOLDERS as readonly string[]).includes(rawFolder)
    ? rawFolder
    : "general";

  if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPG, PNG, WebP, and GIF images are allowed." },
      { status: 400 }
    );
  }

  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "File size must be between 1 byte and 5MB." },
      { status: 400 }
    );
  }

  const safeBase = file.name
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "image";
  const ext = ALLOWED_EXT[file.type] || "png";
  const storagePath = `${folder}/${Date.now()}-${safeBase}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!matchesImageSignature(buffer, file.type)) {
    return NextResponse.json(
      { error: "File contents do not match the declared image format." },
      { status: 400 }
    );
  }

  let priorStorageObject: { path: string; bucket: string } | null = null;
  if (replaceId) {
    if (!z.string().uuid().safeParse(replaceId).success) {
      return NextResponse.json({ error: "Invalid replaceId." }, { status: 400 });
    }
    const { data: oldRow } = await guard.db
      .from("media_files")
      .select("storage_path, bucket")
      .eq("id", replaceId)
      .maybeSingle();

    if (!oldRow) {
      return NextResponse.json({ error: "Target media file to replace was not found." }, { status: 404 });
    }
    if (oldRow.storage_path) {
      priorStorageObject = {
        path: oldRow.storage_path,
        bucket: oldRow.bucket || "media",
      };
    }
  }

  const { error: uploadErr } = await guard.db.storage
    .from("media")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = guard.db.storage.from("media").getPublicUrl(storagePath);

  let savedRow: any = null;
  let dbErr: any = null;

  if (replaceId) {
    const res = await guard.db
      .from("media_files")
      .update({
        file_name: file.name,
        storage_path: storagePath,
        public_url: publicUrl,
        folder,
        mime_type: file.type,
        file_size: file.size,
        uploaded_by: guard.admin.user_id,
      })
      .eq("id", replaceId)
      .select("*")
      .single();
    savedRow = res.data;
    dbErr = res.error;
  } else {
    const res = await guard.db
      .from("media_files")
      .insert({
        file_name: file.name,
        storage_path: storagePath,
        public_url: publicUrl,
        bucket: "media",
        folder,
        mime_type: file.type,
        file_size: file.size,
        uploaded_by: guard.admin.user_id,
      })
      .select("*")
      .single();
    savedRow = res.data;
    dbErr = res.error;
  }

  if (dbErr) {
    await guard.db.storage.from("media").remove([storagePath]).catch(() => {});
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  if (priorStorageObject) {
    await guard.db.storage
      .from(priorStorageObject.bucket)
      .remove([priorStorageObject.path])
      .catch(() => {});
  }

  await recordAuditLog({
    adminUserId: guard.admin.id,
    adminEmail: guard.admin.email,
    adminRole: guard.admin.role,
    action: replaceId ? "REPLACE_MEDIA" : "UPLOAD_MEDIA",
    entityType: "media_files",
    entityId: savedRow.id,
    details: { fileName: file.name, folder, fileSize: file.size },
    ipAddress: getRequestIp(req),
  });

  return NextResponse.json({ item: savedRow }, { status: 201 });
}
