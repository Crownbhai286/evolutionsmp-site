import { handleAdminDelete, handleAdminUpdate } from "@/lib/auth/crud-helpers";
import { serverRuleSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return handleAdminUpdate(req, params.id, {
    table: "server_rules",
    entityType: "server_rules",
    actionName: "UPDATE_RULE",
    schema: serverRuleSchema.partial(),
  });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return handleAdminDelete(req, params.id, {
    table: "server_rules",
    entityType: "server_rules",
    actionName: "DELETE_RULE",
  });
}
