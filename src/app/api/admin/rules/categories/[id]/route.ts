import { handleAdminDelete, handleAdminUpdate } from "@/lib/auth/crud-helpers";
import { ruleCategorySchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return handleAdminUpdate(req, params.id, {
    table: "rule_categories",
    entityType: "rule_categories",
    actionName: "UPDATE_RULE_CATEGORY",
    schema: ruleCategorySchema.partial(),
  });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return handleAdminDelete(req, params.id, {
    table: "rule_categories",
    entityType: "rule_categories",
    actionName: "DELETE_RULE_CATEGORY",
  });
}
