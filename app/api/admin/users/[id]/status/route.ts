import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, handleAuthError } from "@/lib/admin-auth";
import { updateUserStatus } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireSuperAdmin();
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const { status } = body;

    if (status !== "active" && status !== "suspended") {
      return NextResponse.json(
        { success: false, error: "Status must be either 'active' or 'suspended'." },
        { status: 400 }
      );
    }

    // Prevent admin from suspending themselves
    if (admin.adminId === id && status === "suspended") {
      return NextResponse.json(
        { success: false, error: "Administrators cannot suspend their own account." },
        { status: 400 }
      );
    }

    const result = await updateUserStatus(id, status, admin);
    return NextResponse.json({
      success: true,
      user: result,
      message: `User status changed to ${status}. All existing sessions have been revoked.`,
    });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}
