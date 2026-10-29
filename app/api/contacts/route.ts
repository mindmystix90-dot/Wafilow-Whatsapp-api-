import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhoneNumber, validateEnvironment, WhatsAppEnvironment } from "@/lib/whatsapp";
import { requireActiveUserSession, handleAuthError } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireActiveUserSession();
    const orgId = user.organizationId;

    const { searchParams } = new URL(req.url);
    const rawEnv = searchParams.get("environment") || "production";
    let environment: WhatsAppEnvironment = "production";
    try {
      environment = validateEnvironment(rawEnv);
    } catch {
      environment = "production";
    }

    const contacts = await prisma.contact.findMany({
      where: {
        organizationId: orgId,
        environment,
      },
      orderBy: { updatedAt: "desc" },
    });

    const formatted = contacts.map((c) => {
      const tags = c.tags ? c.tags.split(",").map((t) => t.trim()).filter(Boolean) : ["WhatsApp"];
      return {
        id: c.id,
        name: c.name,
        phone: c.phoneNumber.startsWith("+") ? c.phoneNumber : `+${c.phoneNumber}`,
        tags,
        status: c.status,
        optIn: c.status === "active",
        environment: c.environment,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    return NextResponse.json({ success: true, environment, contacts: formatted });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireActiveUserSession();
    const orgId = user.organizationId;

    const body = await req.json().catch(() => ({}));
    const { name, phone, tags, environment: rawEnv = "production" } = body;

    let environment: WhatsAppEnvironment = "production";
    try {
      environment = validateEnvironment(rawEnv);
    } catch {
      environment = "production";
    }

    if (!phone) {
      return NextResponse.json({ success: false, error: "Phone number is required" }, { status: 400 });
    }

    const norm = normalizePhoneNumber(phone);
    if (!norm.valid) {
      return NextResponse.json({ success: false, error: norm.error }, { status: 400 });
    }

    // Check if phone number already exists in another tenant's workspace
    const existing = await prisma.contact.findUnique({
      where: { phoneNumber: norm.digits },
    });

    if (existing && existing.organizationId && existing.organizationId !== orgId) {
      return NextResponse.json(
        { success: false, error: "This phone number is already registered to another workspace." },
        { status: 409 }
      );
    }

    const contact = await prisma.contact.upsert({
      where: { phoneNumber: norm.digits },
      update: {
        name: name?.trim() || undefined,
        tags: tags ? String(tags).trim() : undefined,
        organizationId: orgId,
        environment,
        status: "active",
        updatedAt: new Date(),
      },
      create: {
        name: name?.trim() || norm.formatted,
        phoneNumber: norm.digits,
        waId: norm.digits,
        tags: tags ? String(tags).trim() : environment === "sandbox" ? "Sandbox Contact" : "Direct Contact",
        status: "active",
        organizationId: orgId,
        environment,
      },
    });

    return NextResponse.json({ success: true, environment, contact });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}

