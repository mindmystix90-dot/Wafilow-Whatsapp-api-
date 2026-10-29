import { NextResponse } from "next/server";
import { requireSuperAdmin, handleAuthError } from "@/lib/admin-auth";
import { getSystemHealthOverview } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSuperAdmin();
    const health = await getSystemHealthOverview();
    return NextResponse.json({ success: true, health });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}
