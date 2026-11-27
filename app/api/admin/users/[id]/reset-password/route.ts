import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, handleAuthError } from "@/lib/admin-auth";
import {
  generatePasswordResetToken,
  setUserTemporaryPassword,
} from "@/lib/admin-store";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/users/[id]/reset-password
 * Supports either:
 * 1) Direct temporary password update ({ temporaryPassword }) with immediate session revocation
 * 2) Expiring, single-use, SHA-256 hashed password reset token ({ mode: "token" } or empty body)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireSuperAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    if (
      typeof body?.temporaryPassword === "string" &&
      body.temporaryPassword.trim().length > 0 &&
      body.mode !== "token"
    ) {
      const result = await setUserTemporaryPassword(
        id,
        body.temporaryPassword,
        admin
      );
      return NextResponse.json(result);
    }

    const result = await generatePasswordResetToken(id, admin);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("at least 8") || message.includes("not found")) {
      return NextResponse.json(
        { success: false, error: message },
        { status: message.includes("not found") ? 404 : 400 }
      );
    }
    return handleAuthError(error);
  }
}
