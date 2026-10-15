import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWhatsAppConfig } from "@/lib/whatsapp";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    let orgId = session?.user?.organizationId;

    if (!session || !userId) {
      return NextResponse.json({
        success: true,
        stats: {
          totalMessages: 0,
          totalOutbound: 0,
          totalInbound: 0,
          deliveredOutbound: 0,
          readMessages: 0,
          totalContacts: 0,
          activeContacts: 0,
          messagesSentToday: 0,
          messagesDeliveredToday: 0,
          openConversations: 0,
          deliveryRate: 100,
          readRate: 100,
        },
        recentInquiries: [],
        metaConfig: {
          isConfigured: false,
          phoneNumberId: "Not configured",
          wabaId: "Not configured",
          hasAccessToken: false,
          verifyToken: "",
        },
      });
    }

    if (!orgId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      orgId = user?.organizationId || null;
    }

    if (!orgId) {
      return NextResponse.json({
        success: true,
        stats: {
          totalMessages: 0,
          totalOutbound: 0,
          totalInbound: 0,
          deliveredOutbound: 0,
          readMessages: 0,
          totalContacts: 0,
          activeContacts: 0,
          messagesSentToday: 0,
          messagesDeliveredToday: 0,
          openConversations: 0,
          deliveryRate: 100,
          readRate: 100,
        },
        recentInquiries: [],
        metaConfig: {
          isConfigured: false,
          phoneNumberId: "Not configured",
          wabaId: "Not configured",
          hasAccessToken: false,
          verifyToken: "",
        },
      });
    }

    const config = await getWhatsAppConfig(orgId);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const msgOrgFilter = { organizationId: orgId };
    const contactOrgFilter = { organizationId: orgId };

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
      prisma.message.count({ where: msgOrgFilter }).catch(() => 0),
      prisma.message.count({ where: { ...msgOrgFilter, direction: "outbound" } }).catch(() => 0),
      prisma.message.count({ where: { ...msgOrgFilter, direction: "inbound" } }).catch(() => 0),
      prisma.message.count({
        where: {
          ...msgOrgFilter,
          direction: "outbound",
          status: { in: ["delivered", "read"] },
        },
      }).catch(() => 0),
      prisma.message.count({ where: { ...msgOrgFilter, status: "read" } }).catch(() => 0),
      prisma.contact.count({ where: contactOrgFilter }).catch(() => 0),
      prisma.contact.count({ where: { ...contactOrgFilter, status: "active" } }).catch(() => 0),
      prisma.message.count({
        where: {
          ...msgOrgFilter,
          direction: "outbound",
          timestamp: { gte: todayStart },
        },
      }).catch(() => 0),
      prisma.message.count({
        where: {
          ...msgOrgFilter,
          direction: "outbound",
          status: { in: ["delivered", "read"] },
          timestamp: { gte: todayStart },
        },
      }).catch(() => 0),
      prisma.contact.count({
        where: {
          ...contactOrgFilter,
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
      where: contactOrgFilter,
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
