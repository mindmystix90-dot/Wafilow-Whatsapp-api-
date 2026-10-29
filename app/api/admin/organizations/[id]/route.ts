import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, handleAuthError } from "@/lib/admin-auth";
import { getOrganizationDetails, updateOrganization } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;

    const org = await getOrganizationDetails(id);
    if (!org) {
      return NextResponse.json({ success: false, error: "Organization not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, organization: org });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireSuperAdmin();
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const { name, status, planTier, monthlyLimit } = body;

    const updated = await updateOrganization(
      id,
      {
        name,
        status,
        planTier,
        monthlyLimit: typeof monthlyLimit === "number" ? monthlyLimit : undefined,
      },
      admin
    );

    return NextResponse.json({
      success: true,
      organization: updated,
      message: "Organization updated successfully.",
    });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}
