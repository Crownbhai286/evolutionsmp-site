import { createSupabaseAdminClient } from "@/lib/supabase/server";

interface AuditInput {
  adminUserId?: string | null;
  adminEmail: string;
  adminRole: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * Records an immutable audit trail entry into `audit_logs` via service-role client.
 */
export async function recordAuditLog(input: AuditInput): Promise<void> {
  try {
    const adminDb = createSupabaseAdminClient();
    if (!adminDb) return;

    await adminDb.from("audit_logs").insert({
      admin_user_id: input.adminUserId ?? null,
      admin_email: input.adminEmail,
      admin_role: input.adminRole,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      details: input.details ?? {},
      ip_address: input.ipAddress ?? null,
    });
  } catch (err) {
    console.error("Failed to record audit log:", err);
  }
}
