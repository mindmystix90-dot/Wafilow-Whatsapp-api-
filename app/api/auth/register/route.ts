import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, email, password, organizationName } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid email address is required." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Hash password securely with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Atomically setup Organization and User inside a transaction
    const newUser = await prisma.$transaction(async (tx) => {
      // Re-verify inside transaction to avoid race conditions
      const duplicateInTx = await tx.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (duplicateInTx) {
        throw new Error("EMAIL_EXISTS");
      }

      // Guaranteed Multi-Tenant Isolation:
      // Always create a dedicated, independent Organization for every newly registered customer.
      // Newly created organizations start in an unconfigured state with no WhatsApp credentials,
      // ensuring zero data leakage or connection inheritance.
      const cleanOrgName =
        (typeof organizationName === "string" && organizationName.trim()) ||
        `${name?.trim() || normalizedEmail.split("@")[0]}'s Workspace`;

      const newOrg = await tx.organization.create({
        data: {
          name: cleanOrgName,
          webhookVerifyToken: `wafilow_${Math.random().toString(36).substring(2, 12)}_${Date.now().toString(36)}`,
          accessToken: null,
          phoneNumberId: null,
          wabaId: null,
          displayPhoneNumber: null,
        },
      });
      const targetOrgId = newOrg.id;

      // Create user in PostgreSQL
      return await tx.user.create({
        data: {
          name: (typeof name === "string" && name.trim()) || normalizedEmail.split("@")[0],
          email: normalizedEmail,
          password: hashedPassword,
          role: "admin",
          organizationId: targetOrgId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          organizationId: true,
          createdAt: true,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Account created successfully.",
      user: newUser,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "EMAIL_EXISTS") {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    console.error("[Register Error]:", error);
    return NextResponse.json(
      { success: false, error: "Unable to create account. Please try again." },
      { status: 500 }
    );
  }
}

