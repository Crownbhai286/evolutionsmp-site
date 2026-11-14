import { handleAdminCreate, handleAdminList } from "@/lib/auth/crud-helpers";
import { serverRuleSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleAdminList({
    table: "server_rules",
    orderBy: "sort_order",
    ascending: true,
    secondaryOrderBy: "rule_number",
  });
}

export async function POST(req: Request) {
  return handleAdminCreate(req, {
    table: "server_rules",
    entityType: "server_rules",
    actionName: "CREATE_RULE",
    schema: serverRuleSchema,
  });
}
