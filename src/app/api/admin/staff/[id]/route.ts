import { handleAdminDelete, handleAdminUpdate } from "@/lib/auth/crud-helpers";
import { staffMemberSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return handleAdminUpdate(req, params.id, {
    table: "staff_members",
    entityType: "staff_members",
    actionName: "UPDATE_STAFF",
    schema: staffMemberSchema.partial(),
  });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return handleAdminDelete(req, params.id, {
    table: "staff_members",
    entityType: "staff_members",
    actionName: "DELETE_STAFF",
  });
}
