import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWhatsAppConfig } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getWhatsAppConfig();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Precise metrics from Prisma database
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
      prisma.message.count().catch(() => 0),
      prisma.message.count({ where: { direction: "outbound" } }).catch(() => 0),
      prisma.message.count({ where: { direction: "inbound" } }).catch(() => 0),
      prisma.message.count({
        where: {
          direction: "outbound",
          status: { in: ["delivered", "read"] },
        },
      }).catch(() => 0),
      prisma.message.count({ where: { status: "read" } }).catch(() => 0),
      prisma.contact.count().catch(() => 0),
      prisma.contact.count({ where: { status: "active" } }).catch(() => 0),
      prisma.message.count({
        where: {
          direction: "outbound",
          timestamp: { gte: todayStart },
        },
      }).catch(() => 0),
      prisma.message.count({
        where: {
          direction: "outbound",
          status: { in: ["delivered", "read"] },
          timestamp: { gte: todayStart },
        },
      }).catch(() => 0),
      prisma.contact.count({
        where: {
          messages: {
            some: {},
          },
        },
      }).catch(() => 0),
    ]);

    // Calculate delivery rate and read rate based on real DB records
    const deliveryRate =
      totalOutbound > 0
        ? Math.round((deliveredOutbound / totalOutbound) * 100)
        : 0;

    const readRate =
      totalMessages > 0
        ? Math.round((readMessages / totalMessages) * 100)
        : 0;

    // 2. Recent Active Customer Inquiries / Conversations from real DB
    const recentContacts = await prisma.contact.findMany({
      include: {
        messages: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }).catch(() => []);

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
      };
    });

    return NextResponse.json({
      success: true,
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
        isConfigured: config.isConfigured,
        phoneNumberId: config.phoneNumberId || "Not configured",
        wabaId: config.wabaId || "Not configured",
        hasAccessToken: Boolean(config.accessToken),
        verifyToken: config.webhookVerifyToken,
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error fetching stats";
    console.error("[Dashboard Stats Error]:", error);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
