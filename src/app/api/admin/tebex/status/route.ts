import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin";
import { getTebexConfigStatus } from "@/lib/tebex";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  return NextResponse.json({
    tebex: getTebexConfigStatus(),
  });
}
