import { handleAdminDelete, handleAdminUpdate } from "@/lib/auth/crud-helpers";
import { voteSiteSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return handleAdminUpdate(req, params.id, {
    table: "vote_sites",
    entityType: "vote_sites",
    actionName: "UPDATE_VOTE_SITE",
    schema: voteSiteSchema.partial(),
  });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return handleAdminDelete(req, params.id, {
    table: "vote_sites",
    entityType: "vote_sites",
    actionName: "DELETE_VOTE_SITE",
  });
}
