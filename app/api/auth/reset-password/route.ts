import { NextRequest, NextResponse } from "next/server";
import { redeemPasswordResetToken } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/reset-password
 * Public endpoint to redeem a single-use password reset token.
 * Validates expiration, enforces single-use, updates password, and bumps sessionVersion.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, newPassword } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { success: false, error: "Reset token is required." },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const result = await redeemPasswordResetToken(token, newPassword);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to reset password.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
