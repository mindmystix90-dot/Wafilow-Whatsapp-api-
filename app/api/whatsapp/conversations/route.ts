import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Fetch all contacts with their latest messages and unread counts
    const contacts = await prisma.contact.findMany({
      include: {
        messages: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
        _count: {
          select: {
            messages: {
              where: {
                direction: "inbound",
                status: { not: "read" },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const conversations = contacts.map((c) => {
      const latestMsg = c.messages[0];
      const tagsArray = c.tags
        ? c.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : ["WhatsApp"];

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

      return {
        id: c.id,
        name: c.name || `+${c.phoneNumber}`,
        phone: c.phoneNumber.startsWith("+") ? c.phoneNumber : `+${c.phoneNumber}`,
        rawPhone: c.phoneNumber,
        lastMessage: latestMsg?.content || "No messages yet",
        lastMessageStatus: latestMsg?.status || "delivered",
        lastMessageDirection: latestMsg?.direction || "inbound",
        time: formattedTime,
        unread: c._count?.messages || 0,
        tags: tagsArray,
        updatedAt: c.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      conversations,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Database query error";
    console.error("[Get Conversations Error]:", error);
    return NextResponse.json(
      { success: false, error: `Failed to fetch conversations: ${errorMsg}`, conversations: [] },
      { status: 500 }
    );
  }
}
