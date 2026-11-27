import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, handleAuthError } from "@/lib/admin-auth";
import { upsertTenantBilling } from "@/lib/admin-store";

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
    const {
      planTier,
      monthlyLimit,
      status,
      billingCycle,
      amountCents,
      currency,
      paymentStatus,
      paymentMethod,
      invoiceRef,
      notes,
      currentPeriodEnd,
      lastPaidAt,
    } = body;

    const subscription = await upsertTenantBilling(
      orgId,
      {
        planTier: typeof planTier === "string" ? planTier : undefined,
        monthlyLimit:
          typeof monthlyLimit === "number" ? monthlyLimit : undefined,
        status:
          status === "active" || status === "suspended" ? status : undefined,
        billingCycle:
          typeof billingCycle === "string" ? billingCycle : undefined,
        amountCents:
          typeof amountCents === "number" ? amountCents : undefined,
        currency: typeof currency === "string" ? currency : undefined,
        paymentStatus:
          typeof paymentStatus === "string" ? paymentStatus : undefined,
        paymentMethod:
          typeof paymentMethod === "string" ? paymentMethod : undefined,
        invoiceRef:
          invoiceRef === null || typeof invoiceRef === "string"
            ? invoiceRef
            : undefined,
        notes:
          notes === null || typeof notes === "string" ? notes : undefined,
        currentPeriodEnd:
          currentPeriodEnd === null || typeof currentPeriodEnd === "string"
            ? currentPeriodEnd
            : undefined,
        lastPaidAt:
          lastPaidAt === null || typeof lastPaidAt === "string"
            ? lastPaidAt
            : undefined,
      },
      admin
    );

    return NextResponse.json({
      success: true,
      subscription,
      message: subscription.billingPersisted
        ? "Subscription and manual billing updated successfully."
        : "Plan and quota updated. Run the latest billing migration to persist extended invoice metadata.",
    });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}
