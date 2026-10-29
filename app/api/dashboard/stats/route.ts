import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWhatsAppConnection, validateEnvironment, WhatsAppEnvironment } from "@/lib/whatsapp";
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


    const [prodConfig, sandConfig] = await Promise.all([
      getWhatsAppConnection(orgId, "production"),
      getWhatsAppConnection(orgId, "sandbox"),
    ]);

    const activeConfig = environment === "sandbox" ? sandConfig : prodConfig;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const msgOrgFilter = { organizationId: orgId, environment };
    const contactOrgFilter = { organizationId: orgId, environment };

    // 1. Precise metrics from Prisma database for this environment
    const [
      totalMessages,
      totalOutbound,
      totalInbound,
      deliveredOutbound,
      readMessages,
      totalContacts,
      activeContacts,
      messagesSentToday,
      messagesDeliveredToday,
      openConversations,
    ] = await Promise.all([
      prisma.message.count({ where: msgOrgFilter }).catch(() => 0),
      prisma.message.count({ where: { ...msgOrgFilter, direction: "outbound" } }).catch(() => 0),
      prisma.message.count({ where: { ...msgOrgFilter, direction: "inbound" } }).catch(() => 0),
      prisma.message
        .count({
          where: {
            ...msgOrgFilter,
            direction: "outbound",
            status: { in: ["delivered", "read"] },
          },
        })
        .catch(() => 0),
      prisma.message.count({ where: { ...msgOrgFilter, status: "read" } }).catch(() => 0),
      prisma.contact.count({ where: contactOrgFilter }).catch(() => 0),
      prisma.contact.count({ where: { ...contactOrgFilter, status: "active" } }).catch(() => 0),
      prisma.message
        .count({
          where: {
            ...msgOrgFilter,
            direction: "outbound",
            timestamp: { gte: todayStart },
          },
        })
        .catch(() => 0),
      prisma.message
        .count({
          where: {
            ...msgOrgFilter,
            direction: "outbound",
            status: { in: ["delivered", "read"] },
            timestamp: { gte: todayStart },
          },
        })
        .catch(() => 0),
      prisma.contact
        .count({
          where: {
            ...contactOrgFilter,
            messages: {
              some: { environment },
            },
          },
        })
        .catch(() => 0),
    ]);

    const deliveryRate =
      totalOutbound > 0 ? Math.round((deliveredOutbound / totalOutbound) * 100) : 0;
    const readRate = totalMessages > 0 ? Math.round((readMessages / totalMessages) * 100) : 0;

    // 2. Recent Active Customer Inquiries / Conversations from real DB
    const recentContacts = await prisma.contact
      .findMany({
        where: contactOrgFilter,
        include: {
          messages: {
            where: { environment },
            orderBy: { timestamp: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      })
      .catch(() => []);

    const recentInquiries = recentContacts.map((c) => {
      const latestMsg = c.messages[0];
      let formattedTime = "Recent";
      if (latestMsg?.timestamp) {
        const d = new Date(latestMsg.timestamp);
        const now = new Date();
        if (d.toDateString() === now.toDateString()) {
          formattedTime = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } else {
          formattedTime = d.toLocaleDateString([], { month: "short", day: "numeric" });
        }
      }

      return {
        id: c.id,
        name: c.name || `+${c.phoneNumber}`,
        phone: c.phoneNumber.startsWith("+") ? c.phoneNumber : `+${c.phoneNumber}`,
        lastMessage: latestMsg?.content || "Conversation opened",
        direction: latestMsg?.direction || "inbound",
        status: latestMsg?.status || "delivered",
        time: formattedTime,
        unread: latestMsg?.direction === "inbound" && latestMsg?.status !== "read",
        environment: c.environment,
      };
    });

    return NextResponse.json({
      success: true,
      environment,
      stats: {
        totalMessages,
        totalOutbound,
        totalInbound,
        deliveredOutbound,
        readMessages,
        totalContacts,
        activeContacts,
        messagesSentToday,
        messagesDeliveredToday,
        openConversations,
        deliveryRate,
        readRate,
      },
      recentInquiries,
      metaConfig: {
        isConfigured: activeConfig.isConfigured,
        phoneNumberId: activeConfig.phoneNumberId || "Not configured",
        wabaId: activeConfig.wabaId || "Not configured",
        displayPhoneNumber: activeConfig.displayPhoneNumber,
        verifiedName: activeConfig.verifiedName,
        status: activeConfig.status,
        hasAccessToken: Boolean(activeConfig.accessToken),
        verifyToken: activeConfig.webhookVerifyToken,
        environment,
      },
      connections: {
        production: {
          configured: prodConfig.isConfigured,
          status: prodConfig.status,
          displayPhoneNumber: prodConfig.displayPhoneNumber,
          phoneNumberId: prodConfig.phoneNumberId,
        },
        sandbox: {
          configured: sandConfig.isConfigured,
          status: sandConfig.status,
          displayPhoneNumber: sandConfig.displayPhoneNumber,
          phoneNumberId: sandConfig.phoneNumberId,
        },
      },
    });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}

