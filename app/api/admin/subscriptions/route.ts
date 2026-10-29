import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, handleAuthError } from "@/lib/admin-auth";
import { listOrganizations } from "@/lib/admin-store";
import { getNextResetDate } from "@/lib/quota";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const plan = searchParams.get("plan") || undefined;

    const orgs = await listOrganizations({ search, plan });
    const nextReset = getNextResetDate().toISOString();

    const subscriptions = orgs.map((org) => ({
      id: `sub_${org.id}`,
      organizationId: org.id,
      organizationName: org.name,
      status: org.status === "active" ? "active" : "suspended",
      planTier: org.planTier,
      monthlyLimit: org.monthlyLimit,
      billingCycle: "monthly",
      currentPeriodStart: new Date(new Date().setDate(1)).toISOString(),
      currentPeriodEnd: nextReset,
      autoRenew: true,
      paymentStatus: "paid",
      createdAt: org.createdAt,
    }));

    return NextResponse.json({ success: true, subscriptions, count: subscriptions.length });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}
