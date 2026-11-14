import { handleAdminCreate, handleAdminList } from "@/lib/auth/crud-helpers";
import { staffMemberSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleAdminList({
    table: "staff_members",
    orderBy: "sort_order",
    ascending: true,
  });
}

export async function POST(req: Request) {
  return handleAdminCreate(req, {
    table: "staff_members",
    entityType: "staff_members",
    actionName: "CREATE_STAFF",
    schema: staffMemberSchema,
  });
}
