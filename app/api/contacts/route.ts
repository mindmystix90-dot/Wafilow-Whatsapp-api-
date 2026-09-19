import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhoneNumber } from "@/lib/whatsapp";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const orgId = session?.user?.organizationId;

    const contacts = await prisma.contact.findMany({
      where: orgId ? { organizationId: orgId } : undefined,
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
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    return NextResponse.json({ success: true, contacts: formatted });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ success: false, error: errorMsg, contacts: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const orgId = session?.user?.organizationId;

    const body = await req.json().catch(() => ({}));
    const { name, phone, tags } = body;

    if (!phone) {
      return NextResponse.json({ success: false, error: "Phone number is required" }, { status: 400 });
    }

    const norm = normalizePhoneNumber(phone);
    if (!norm.valid) {
      return NextResponse.json({ success: false, error: norm.error }, { status: 400 });
    }

    const contact = await prisma.contact.upsert({
      where: { phoneNumber: norm.digits },
      update: {
        name: name?.trim() || undefined,
        tags: tags ? String(tags).trim() : undefined,
        organizationId: orgId || undefined,
        status: "active",
        updatedAt: new Date(),
      },
      create: {
        name: name?.trim() || norm.formatted,
        phoneNumber: norm.digits,
        waId: norm.digits,
        tags: tags ? String(tags).trim() : "Direct Contact",
        status: "active",
        organizationId: orgId || null,
      },
    });

    return NextResponse.json({ success: true, contact });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
