import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUserSession, handleAuthError } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/profile
 * Returns the authenticated Wafilow user's personal profile.
 * Strictly user-isolated: users only access their own profile.
 */
export async function GET() {
  try {
    const sessionUser = await requireActiveUserSession();
    const userId = sessionUser.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        organizationId: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User profile not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name || "",
        email: user.email || "",
        image: user.image || null,
        role: user.role || "user",
        organizationId: user.organizationId || null,
        organizationName: user.organization?.name || "Default Workspace",
        createdAt: user.createdAt,
      },
    });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}

/**
 * PATCH /api/user/profile
 * Updates the user's personal display name.
 * Disallows client-supplied modification of role, organizationId, email, or credentials.
 */
export async function PATCH(req: NextRequest) {
  try {
    const sessionUser = await requireActiveUserSession();
    const userId = sessionUser.userId;

    const body = await req.json().catch(() => ({}));
    const { name } = body;

    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return NextResponse.json(
        { success: false, error: "Display name cannot be empty." },
        { status: 400 }
      );
    }

    const cleanName = typeof name === "string" ? name.trim().slice(0, 100) : undefined;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(cleanName !== undefined ? { name: cleanName } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      user: updatedUser,
    });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}

