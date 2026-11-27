import { NextResponse } from "next/server";
import { requireSuperAdmin, handleAuthError } from "@/lib/admin-auth";
import { listAdminWhatsAppConnections } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSuperAdmin();
    const connections = await listAdminWhatsAppConnections();
    return NextResponse.json({
      success: true,
      connections,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
