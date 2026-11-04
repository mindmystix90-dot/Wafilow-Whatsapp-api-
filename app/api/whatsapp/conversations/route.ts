import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateEnvironment, WhatsAppEnvironment, calculateCustomerWindow } from "@/lib/whatsapp";
import { requireActiveUserSession, handleAuthError } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await requireActiveUserSession();
    const orgId = sessionUser.organizationId;

    const { searchParams } = new URL(req.url);
    const rawEnv = searchParams.get("environment") || "production";
    let environment: WhatsAppEnvironment = "production";
    try {
      environment = validateEnvironment(rawEnv);
    } catch {
      environment = "production";
    }

    // Fetch contacts strictly for this customer's organization and environment
    const contacts = await prisma.contact.findMany({
      where: {
        organizationId: orgId,
        environment,
      },
      include: {
        messages: {
          where: { environment },
          orderBy: { timestamp: "desc" },
          take: 1,
        },
        _count: {
          select: {
            messages: {
              where: {
                direction: "inbound",
                environment,
                status: { not: "read" },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Compute 24-hour customer service window strictly from latest INBOUND messages
    const contactIds = contacts.map((c) => c.id);
    let inboundMap = new Map<string, Date>();
    if (contactIds.length > 0) {
      try {
        const latestInbounds = await prisma.message.findMany({
          where: {
            contactId: { in: contactIds },
            direction: "inbound",
            environment,
          },
          orderBy: { timestamp: "desc" },
          distinct: ["contactId"],
          select: {
            contactId: true,
            timestamp: true,
          },
        });
        inboundMap = new Map(latestInbounds.map((m) => [m.contactId, m.timestamp]));
      } catch (inboundErr) {
        console.warn("[Conversations] Notice querying latest inbounds (falling back):", inboundErr);
      }
    }

    const conversations = contacts.map((c) => {
      const latestMsg = c.messages[0];
      const tagsArray = c.tags
        ? c.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [environment === "sandbox" ? "Sandbox Test" : "WhatsApp"];

      let formattedTime = "";
      if (latestMsg?.timestamp) {
        const d = new Date(latestMsg.timestamp);
        const now = new Date();
        if (d.toDateString() === now.toDateString()) {
          formattedTime = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } else {
          formattedTime = d.toLocaleDateString([], { month: "short", day: "numeric" });
        }
      }

      const lastInboundTimestamp = inboundMap.get(c.id) || null;
      const windowStatus = calculateCustomerWindow(lastInboundTimestamp);

      return {
        id: c.id,
        name: c.name || `+${c.phoneNumber}`,
        phone: c.phoneNumber.startsWith("+") ? c.phoneNumber : `+${c.phoneNumber}`,
        rawPhone: c.phoneNumber,
        lastMessage: latestMsg?.content || (environment === "sandbox" ? "Sandbox contact created" : "No messages yet"),
        lastMessageStatus: latestMsg?.status || "delivered",
        lastMessageDirection: latestMsg?.direction || "inbound",
        time: formattedTime,
        unread: c._count?.messages || 0,
        tags: tagsArray,
        environment: c.environment,
        updatedAt: c.updatedAt,
        lastInboundAt: lastInboundTimestamp ? lastInboundTimestamp.toISOString() : null,
        isWindowOpen: windowStatus.isOpen,
        windowExpiresAt: windowStatus.expiresAt ? windowStatus.expiresAt.toISOString() : null,
        remainingHours: windowStatus.remainingHours,
        remainingMinutes: windowStatus.remainingMinutes,
      };
    });

    return NextResponse.json({
      success: true,
      environment,
      conversations,
    });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}

