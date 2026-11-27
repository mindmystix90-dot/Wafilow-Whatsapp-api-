import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, handleAuthError } from "@/lib/admin-auth";
import { getCustomerDetails, updateUserAdmin } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;

    const customer = await getCustomerDetails(id);
    if (!customer) {
      return NextResponse.json(
        { success: false, error: "User not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, customer });
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

    const result = await updateUserAdmin(
      id,
      {
        name: typeof body.name === "string" ? body.name : undefined,
        email: typeof body.email === "string" ? body.email : undefined,
        role: typeof body.role === "string" ? body.role : undefined,
        organizationId:
          body.organizationId === null || typeof body.organizationId === "string"
            ? body.organizationId
            : undefined,
        status:
          body.status === "active" || body.status === "suspended"
            ? body.status
            : undefined,
        temporaryPassword:
          typeof body.temporaryPassword === "string"
            ? body.temporaryPassword
            : undefined,
      },
      admin
    );

    return NextResponse.json({
      success: true,
      user: result.user,
      sessionsRevoked: result.sessionsRevoked,
      message: result.sessionsRevoked
        ? "User updated and active sessions revoked."
        : "User updated successfully.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("not found") ||
      message.includes("already uses") ||
      message.includes("Single-owner") ||
      message.includes("Cannot demote") ||
      message.includes("Cannot suspend") ||
      message.includes("Invalid") ||
      message.includes("valid email") ||
      message.includes("does not exist") ||
      message.includes("at least 8")
    ) {
      const status = message.includes("not found") ? 404 : 400;
      return NextResponse.json({ success: false, error: message }, { status });
    }
    return handleAuthError(error);
  }
}
