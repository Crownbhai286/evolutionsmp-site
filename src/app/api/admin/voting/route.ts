import { handleAdminCreate, handleAdminList } from "@/lib/auth/crud-helpers";
import { voteSiteSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleAdminList({
    table: "vote_sites",
    orderBy: "sort_order",
    ascending: true,
  });
}

export async function POST(req: Request) {
  return handleAdminCreate(req, {
    table: "vote_sites",
    entityType: "vote_sites",
    actionName: "CREATE_VOTE_SITE",
    schema: voteSiteSchema,
  });
}
