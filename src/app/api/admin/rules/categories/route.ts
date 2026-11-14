import { handleAdminCreate, handleAdminList } from "@/lib/auth/crud-helpers";
import { ruleCategorySchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleAdminList({
    table: "rule_categories",
    orderBy: "sort_order",
    ascending: true,
  });
}

export async function POST(req: Request) {
  return handleAdminCreate(req, {
    table: "rule_categories",
    entityType: "rule_categories",
    actionName: "CREATE_RULE_CATEGORY",
    schema: ruleCategorySchema,
  });
}
