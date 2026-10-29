import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, handleAuthError } from "@/lib/admin-auth";
import { updateOrganization } from "@/lib/admin-store";
import { recordAuditLog } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireSuperAdmin();
    const { id } = await params;

    // Handle either sub_orgId or orgId
    const orgId = id.startsWith("sub_") ? id.replace("sub_", "") : id;

    const body = await req.json().catch(() => ({}));
    const { planTier, monthlyLimit, status } = body;

    const updated = await updateOrganization(
      orgId,
      {
        planTier,
        monthlyLimit: typeof monthlyLimit === "number" ? monthlyLimit : undefined,
        status: status === "active" || status === "suspended" ? status : undefined,
      },
      admin
    );

    await recordAuditLog({
      actorId: admin.adminId,
      actorEmail: admin.adminEmail,
      action: "SUBSCRIPTION_UPDATE",
      targetType: "SUBSCRIPTION",
      targetId: id,
      details: { planTier, monthlyLimit, status },
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: `sub_${orgId}`,
        organizationId: orgId,
        organizationName: updated.name,
        planTier: updated.planTier,
        status: updated.status,
      },
      message: "Subscription updated successfully.",
    });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}
