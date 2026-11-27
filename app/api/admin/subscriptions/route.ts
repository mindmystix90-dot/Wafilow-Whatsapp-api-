import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, handleAuthError } from "@/lib/admin-auth";
import { listSubscriptionsWithBilling } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const plan = searchParams.get("plan") || undefined;

    const { subscriptions, billingSchemaReady } =
      await listSubscriptionsWithBilling({ search, plan });

    return NextResponse.json({
      success: true,
      subscriptions,
      count: subscriptions.length,
      billingSchemaReady,
    });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}
