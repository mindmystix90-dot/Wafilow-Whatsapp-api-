import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, handleAuthError } from "@/lib/admin-auth";
import { generatePasswordResetToken } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/users/[id]/reset-password
 * Generates an expiring, single-use, cryptographically secure password reset token.
 * Stores only the SHA-256 hash in the database.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireSuperAdmin();
    const { id } = await params;

    const result = await generatePasswordResetToken(id, admin);
    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}
