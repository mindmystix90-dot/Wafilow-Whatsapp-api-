import { NextResponse } from "next/server";
import { requireSuperAdmin, handleAuthError } from "@/lib/admin-auth";
import { listAllQuotas } from "@/lib/quota";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSuperAdmin();
    const quotas = await listAllQuotas();
    return NextResponse.json({ success: true, quotas, count: quotas.length });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}
