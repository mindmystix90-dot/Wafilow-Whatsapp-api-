import { NextResponse } from "next/server";
import { requireSuperAdmin, handleAuthError } from "@/lib/admin-auth";
import { getSuperAdminDashboardMetrics } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSuperAdmin();
    const metrics = await getSuperAdminDashboardMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    return handleAuthError(error);
  }
}
