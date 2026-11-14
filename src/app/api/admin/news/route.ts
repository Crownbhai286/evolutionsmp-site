import { handleAdminCreate, handleAdminList } from "@/lib/auth/crud-helpers";
import { newsPostSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleAdminList({
    table: "news_posts",
    orderBy: "published_at",
    ascending: false,
  });
}

export async function POST(req: Request) {
  return handleAdminCreate(req, {
    table: "news_posts",
    entityType: "news_posts",
    actionName: "CREATE_NEWS",
    schema: newsPostSchema,
  });
}
