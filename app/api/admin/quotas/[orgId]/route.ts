import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, handleAuthError } from "@/lib/admin-auth";
import { setOrganizationQuotaOverride, checkOrganizationQuota } from "@/lib/quota";
import { recordAuditLog } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const admin = await requireSuperAdmin();
    const { orgId } = await params;

    const body = await req.json().catch(() => ({}));
    const { limit, planTier } = body;

    if (limit !== undefined && (typeof limit !== "number" || limit < 0)) {
      return NextResponse.json(
        { success: false, error: "Quota limit must be a non-negative number." },
        { status: 400 }
      );
    }

    await setOrganizationQuotaOverride(orgId, {
      limit: typeof limit === "number" ? limit : undefined,
      planTier: typeof planTier === "string" ? planTier : undefined,
    });

    const currentQuota = await checkOrganizationQuota(orgId);

    await recordAuditLog({
      actorId: admin.adminId,
      actorEmail: admin.adminEmail,
      action: "QUOTA_OVERRIDE_UPDATE",
      targetType: "ORGANIZATION",
      targetId: orgId,
      details: { limit, planTier, currentUsage: currentQuota.used },
    });

    return NextResponse.json({
      success: true,
      quota: currentQuota,
      message: "Organization quota updated successfully.",
    });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}
