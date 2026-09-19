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
        { status: 400 }
      );
    }

    // Hash password securely with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Organization setup:
    // If an initial unowned organization exists (0 users), the first user claims it.
    // Otherwise, create a new separate Organization to guarantee tenant isolation.
    const orphanOrg = await prisma.organization.findFirst({
      where: {
        users: { none: {} },
      },
    });

    let targetOrgId: string;

    if (orphanOrg) {
      if (organizationName && organizationName.trim()) {
        await prisma.organization.update({
          where: { id: orphanOrg.id },
          data: { name: organizationName.trim() },
        });
      }
      targetOrgId = orphanOrg.id;
    } else {
      const cleanOrgName =
        organizationName?.trim() ||
        `${name?.trim() || normalizedEmail.split("@")[0]}'s Organization`;

      const newOrg = await prisma.organization.create({
        data: {
          name: cleanOrgName,
          webhookVerifyToken: `wafilow_${Math.random().toString(36).substring(2, 12)}`,
        },
      });
      targetOrgId = newOrg.id;
    }

    // Create user in PostgreSQL
    const newUser = await prisma.user.create({
      data: {
        name: name?.trim() || normalizedEmail.split("@")[0],
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

    return NextResponse.json({
      success: true,
      message: "Account created successfully.",
      user: newUser,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error creating account";
    console.error("[Register Error]:", error);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
