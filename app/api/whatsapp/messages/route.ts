import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage, getWhatsAppConfig, normalizePhoneNumber } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/**
 * GET /api/whatsapp/messages?contactId=...
 * Retrieves real messages from the database for a specific contact
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get("contactId");

    if (!contactId) {
      return NextResponse.json(
        { success: false, error: "contactId query parameter is required", messages: [] },
        { status: 400 }
      );
    }

    const messages = await prisma.message.findMany({
      where: { contactId },
      orderBy: { timestamp: "asc" },
    });

    const formattedMessages = messages.map((m) => {
      const d = new Date(m.timestamp);
      return {
        id: m.id,
        wamId: m.wamId,
        sender: m.direction === "inbound" ? "customer" : "agent",
        text: m.content,
        type: m.type,
        time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timestamp: m.timestamp,
        status: m.status,
        errorMessage: m.errorMessage,
      };
    });

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Database query error";
    console.error("[Get Messages Error]:", error);
    return NextResponse.json(
      { success: false, error: `Failed to fetch messages: ${errorMsg}`, messages: [] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/whatsapp/messages
 * Sends a real text message through Meta Cloud API and persists to DB.
 * Never marks the message as sent if Meta rejects it.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { contactId, text, to } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, error: "Message text cannot be empty." },
        { status: 400 }
      );
    }

    let contact = null;

    if (contactId) {
      contact = await prisma.contact.findUnique({
        where: { id: contactId },
      });
    } else if (to) {
      const norm = normalizePhoneNumber(to);
      if (!norm.valid) {
        return NextResponse.json(
          { success: false, error: norm.error },
          { status: 400 }
        );
      }
      contact = await prisma.contact.upsert({
        where: { phoneNumber: norm.digits },
        update: {},
        create: {
          name: norm.formatted,
          phoneNumber: norm.digits,
          waId: norm.digits,
          status: "active",
        },
      });
    }

    if (!contact) {
      return NextResponse.json(
        { success: false, error: "Contact not found. Please provide a valid contactId or recipient phone number." },
        { status: 404 }
      );
    }

    const config = await getWhatsAppConfig(contact.organizationId || undefined);

    if (!config.isConfigured) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Meta WhatsApp Cloud API is not configured. Please supply META_PHONE_NUMBER_ID and META_ACCESS_TOKEN in server environment or Settings.",
        },
        { status: 400 }
      );
    }

    // Call Meta Cloud API v21.0
    const sendResult = await sendWhatsAppMessage({
      to: contact.phoneNumber,
      type: "text",
      text: text.trim(),
      organizationId: contact.organizationId || undefined,
    });

    // RULE 9: Do not mark the message successful if Meta rejects it.
    if (!sendResult.success) {
      // Record failed outbound attempt in DB with actual error message
      const failedMsg = await prisma.message.create({
        data: {
          contactId: contact.id,
          organizationId: contact.organizationId || config.organizationId,
          direction: "outbound",
          content: text.trim(),
          type: "text",
          status: "failed",
          errorMessage: sendResult.error,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: sendResult.error,
          metaError: sendResult.rawMetaError,
          failedMessage: {
            id: failedMsg.id,
            sender: "agent",
            text: text.trim(),
            status: "failed",
            errorMessage: sendResult.error,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        },
        { status: 400 }
      );
    }

    // Meta accepted message: save with returned Meta message ID (wamId)
    const savedMsg = await prisma.message.create({
      data: {
        contactId: contact.id,
        organizationId: contact.organizationId || config.organizationId,
        wamId: sendResult.messageId,
        direction: "outbound",
        content: text.trim(),
        type: "text",
        status: "sent",
      },
    });

    // Update contact's updatedAt timestamp
    await prisma.contact.update({
      where: { id: contact.id },
      data: { updatedAt: new Date() },
    });

    const d = new Date(savedMsg.timestamp);

    return NextResponse.json({
      success: true,
      message: {
        id: savedMsg.id,
        wamId: savedMsg.wamId,
        sender: "agent",
        text: savedMsg.content,
        status: "sent",
        time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timestamp: savedMsg.timestamp,
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal server error";
    console.error("[Send Message Route Error]:", error);
    return NextResponse.json(
      { success: false, error: `Failed to dispatch message: ${errorMsg}` },
      { status: 500 }
    );
  }
}
