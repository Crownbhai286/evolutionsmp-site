import { handleAdminDelete, handleAdminUpdate } from "@/lib/auth/crud-helpers";
import { newsPostSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return handleAdminUpdate(req, params.id, {
    table: "news_posts",
    entityType: "news_posts",
    actionName: "UPDATE_NEWS",
    schema: newsPostSchema.partial(),
  });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return handleAdminDelete(req, params.id, {
    table: "news_posts",
    entityType: "news_posts",
    actionName: "DELETE_NEWS",
  });
}
