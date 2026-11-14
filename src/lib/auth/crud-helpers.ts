import { NextResponse } from "next/server";
import { z, type ZodSchema } from "zod";
import { requireAdminSession, revalidateAllPublicPaths } from "@/lib/auth/admin";
import { recordAuditLog } from "@/lib/audit";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

const uuidSchema = z.string().uuid();

function mapDbErrorStatus(error: { code?: string; message?: string }): number {
  if (error.code === "23505") return 409;
  if (error.code === "23503") return 400;
  return 500;
}

interface CrudListOptions {
  table: string;
  orderBy: string;
  ascending?: boolean;
  secondaryOrderBy?: string;
}

export async function handleAdminList(options: CrudListOptions) {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  let query = guard.db
    .from(options.table)
    .select("*")
    .order(options.orderBy, { ascending: options.ascending ?? true });

  if (options.secondaryOrderBy) {
    query = query.order(options.secondaryOrderBy, { ascending: true });
  }

  const { data, error } = await query;
  if (error) {
    const status = mapDbErrorStatus(error);
    const msg =
      error.code === "23505"
        ? "A record with this unique identifier (slug/name) already exists."
        : error.message;
    return NextResponse.json({ error: msg }, { status });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function handleAdminCreate<T extends Record<string, unknown>>(
  req: Request,
  options: {
    table: string;
    entityType: string;
    actionName: string;
    schema: ZodSchema<T>;
    transform?: (parsed: T) => Record<string, unknown>;
  }
) {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  const rl = checkRateLimit(`admin-write:${guard.admin.id}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = options.schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = options.transform ? options.transform(parsed.data) : parsed.data;
  const { data, error } = await guard.db
    .from(options.table)
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    const status = mapDbErrorStatus(error);
    const msg =
      error.code === "23505"
        ? "A record with this unique identifier (slug/name) already exists."
        : error.message;
    return NextResponse.json({ error: msg }, { status });
  }

  await recordAuditLog({
    adminUserId: guard.admin.id,
    adminEmail: guard.admin.email,
    adminRole: guard.admin.role,
    action: options.actionName,
    entityType: options.entityType,
    entityId: data.id,
    details: { created: data.title || data.name || data.username || data.slug || data.id },
    ipAddress: getRequestIp(req),
  });

  revalidateAllPublicPaths();
  return NextResponse.json({ item: data }, { status: 201 });
}

export async function handleAdminUpdate<T extends Record<string, unknown>>(
  req: Request,
  id: string,
  options: {
    table: string;
    entityType: string;
    actionName: string;
    schema: ZodSchema<Partial<T>>;
    transform?: (parsed: Partial<T>) => Record<string, unknown>;
  }
) {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid record ID." }, { status: 400 });
  }

  const rl = checkRateLimit(`admin-write:${guard.admin.id}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = options.schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = options.transform ? options.transform(parsed.data) : parsed.data;
  const { data, error } = await guard.db
    .from(options.table)
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    const status = mapDbErrorStatus(error);
    const msg =
      error.code === "23505"
        ? "A record with this unique identifier (slug/name) already exists."
        : error.message;
    return NextResponse.json({ error: msg }, { status });
  }

  if (!data) {
    return NextResponse.json({ error: "Record not found." }, { status: 404 });
  }

  await recordAuditLog({
    adminUserId: guard.admin.id,
    adminEmail: guard.admin.email,
    adminRole: guard.admin.role,
    action: options.actionName,
    entityType: options.entityType,
    entityId: id,
    details: { updated: data.title || data.name || data.username || data.slug || id },
    ipAddress: getRequestIp(req),
  });

  revalidateAllPublicPaths();
  return NextResponse.json({ item: data });
}

export async function handleAdminDelete(
  req: Request,
  id: string,
  options: {
    table: string;
    entityType: string;
    actionName: string;
  }
) {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid record ID." }, { status: 400 });
  }

  const rl = checkRateLimit(`admin-delete:${guard.admin.id}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const { data: existing } = await guard.db
    .from(options.table)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Record not found." }, { status: 404 });
  }

  const { error } = await guard.db.from(options.table).delete().eq("id", id);
  if (error) {
    const status = mapDbErrorStatus(error);
    const msg =
      error.code === "23505"
        ? "A record with this unique identifier (slug/name) already exists."
        : error.message;
    return NextResponse.json({ error: msg }, { status });
  }

  await recordAuditLog({
    adminUserId: guard.admin.id,
    adminEmail: guard.admin.email,
    adminRole: guard.admin.role,
    action: options.actionName,
    entityType: options.entityType,
    entityId: id,
    details: {
      deleted: existing?.title || existing?.name || existing?.username || existing?.slug || id,
    },
    ipAddress: getRequestIp(req),
  });

  revalidateAllPublicPaths();
  return NextResponse.json({ deleted: true });
}
