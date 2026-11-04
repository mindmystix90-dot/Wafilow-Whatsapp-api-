import { NextRequest, NextResponse } from "next/server";
import {
  normalizePhoneNumber,
  sendWhatsAppMessage,
  getWhatsAppConnection,
  validateEnvironment,
  WhatsAppEnvironment,
  calculateCustomerWindow,
} from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";
import { requireActiveUserSession, handleAuthError } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/whatsapp/messages
 * Retrieves real messages from the database for a specific contact and environment,
 * along with the 24-hour customer service window status strictly derived from the latest inbound message.
 */
export async function GET(req: NextRequest) {
  try {
    const sessionUser = await requireActiveUserSession();
    const orgId = sessionUser.organizationId;

    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get("contactId");
    const rawEnv = searchParams.get("environment") || "production";
    let environment: WhatsAppEnvironment = "production";
    try {
      environment = validateEnvironment(rawEnv);
    } catch {
      environment = "production";
    }

    if (!contactId) {
      return NextResponse.json(
        { success: false, error: "contactId query parameter is required", messages: [] },
        { status: 400 }
      );
    }

    // Verify contact ownership
    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) {
      return NextResponse.json(
        { success: false, error: "Contact not found", messages: [] },
        { status: 404 }
      );
    }

    if (orgId && contact.organizationId && contact.organizationId !== orgId) {
      return NextResponse.json(
        { success: false, error: "Access denied to contact in another workspace", messages: [] },
        { status: 403 }
      );
    }

    const messages = await prisma.message.findMany({
      where: {
        contactId,
        ...(orgId ? { organizationId: orgId } : {}),
        environment,
      },
      orderBy: { timestamp: "asc" },
    });

    // Find the latest INBOUND customer message to strictly compute the 24h service window
    const lastInbound = await prisma.message.findFirst({
      where: {
        contactId,
        direction: "inbound",
        environment,
      },
      orderBy: { timestamp: "desc" },
      select: { timestamp: true },
    });

    const customerWindow = calculateCustomerWindow(lastInbound?.timestamp);

    const formattedMessages = messages.map((m) => {
      const d = new Date(m.timestamp);

      // Extract error code and type if message failed
      let errorCode: number | undefined;
      let errorType: string | undefined;
      if (m.status === "failed" && m.errorMessage) {
        if (m.errorMessage.includes("131047") || m.errorMessage.includes("131030")) {
          errorCode = m.errorMessage.includes("131047") ? 131047 : 131030;
          errorType = "window_closed";
        } else if (m.errorMessage.includes("133010")) {
          errorCode = 133010;
          errorType = "phone_registration_required";
        } else if (m.errorMessage.includes("190")) {
          errorCode = 190;
          errorType = "token_expired";
        }
      }

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
        errorCode,
        errorType,
        environment: m.environment,
      };
    });

    return NextResponse.json({
      success: true,
      environment,
      customerWindow,
      messages: formattedMessages,
    });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}

/**
 * POST /api/whatsapp/messages
 * Sends a real message (text or approved template) through Meta Cloud API v24.0.
 * Strictly calculates 24-hour customer window using latest INBOUND message.
 * Blocks free-form text when window is closed, requiring approved templates.
 */
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireActiveUserSession();
    const sessionOrgId = sessionUser.organizationId;

    const body = await req.json().catch(() => ({}));
    const {
      contactId,
      text,
      to,
      type = "text",
      template,
      environment: rawEnv = "production",
    } = body;

    let environment: WhatsAppEnvironment;
    try {
      environment = validateEnvironment(rawEnv);
    } catch (envErr) {
      return NextResponse.json(
        { success: false, error: envErr instanceof Error ? envErr.message : "Invalid environment" },
        { status: 400 }
      );
    }

    if (type === "text" && (!text || !text.trim())) {
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
        update: {
          organizationId: sessionOrgId,
          environment,
        },
        create: {
          name: norm.formatted,
          phoneNumber: norm.digits,
          waId: norm.digits,
          status: "active",
          organizationId: sessionOrgId,
          environment,
        },
      });
    }

    if (!contact) {
      return NextResponse.json(
        { success: false, error: "Contact not found. Please provide a valid contactId or recipient phone number." },
        { status: 404 }
      );
    }

    if (contact.organizationId && contact.organizationId !== sessionOrgId) {
      return NextResponse.json(
        { success: false, error: "Access denied to contact in another workspace" },
        { status: 403 }
      );
    }

    const config = await getWhatsAppConnection(sessionOrgId, environment);
    if (!config.isConfigured) {
      return NextResponse.json(
        {
          success: false,
          error: `Your ${environment.toUpperCase()} WhatsApp Business account is not connected yet. Please configure credentials in Settings.`,
          environment,
        },
        { status: 400 }
      );
    }

    // Strictly calculate the 24-hour customer window using the latest INBOUND customer message
    const lastInbound = await prisma.message.findFirst({
      where: {
        contactId: contact.id,
        direction: "inbound",
        environment,
      },
      orderBy: { timestamp: "desc" },
      select: { timestamp: true },
    });

    const windowStatus = calculateCustomerWindow(lastInbound?.timestamp);

    // BLOCK free-form text messages when the 24-hour window is closed!
    if (type === "text" && !windowStatus.isOpen) {
      return NextResponse.json(
        {
          success: false,
          environment,
          error: "Meta Error (Code 131047): The 24-hour customer service window has expired (more than 24 hours have passed since customer last replied). Outside this window, Meta requires sending an approved Template message (e.g. hello_world) to re-engage with this customer.",
          errorCode: 131047,
          errorType: "window_closed",
          isWindowOpen: false,
          windowExpiresAt: windowStatus.expiresAt,
          canSendTemplate: true,
        },
        { status: 400 }
      );
    }

    const contentToPersist =
      type === "template"
        ? (text && text.trim()) || `Template: ${template?.name || "hello_world"}`
        : text.trim();

    // Call Meta Cloud API v24.0 strictly with requested environment & type
    const sendResult = await sendWhatsAppMessage({
      to: contact.phoneNumber,
      type: type === "template" ? "template" : "text",
      text: type === "text" ? text.trim() : undefined,
      template:
        type === "template"
          ? template || { name: "hello_world", language: { code: "en_US" } }
          : undefined,
      organizationId: sessionOrgId,
      environment,
    });

    if (!sendResult.success) {
      // Record failed outbound attempt in DB with environment tag
      const failedMsg = await prisma.message.create({
        data: {
          contactId: contact.id,
          organizationId: sessionOrgId,
          environment,
          direction: "outbound",
          content: contentToPersist,
          type: type === "template" ? "template" : "text",
          status: "failed",
          errorMessage: sendResult.error,
        },
      });

      const errorStatusCode =
        sendResult.errorType === "quota_exceeded"
          ? 429
          : sendResult.errorType === "suspended"
          ? 403
          : 400;

      return NextResponse.json(
        {
          success: false,
          environment,
          error: sendResult.error,
          errorCode: sendResult.errorCode,
          errorType: sendResult.errorType,
          fbtraceId: sendResult.fbtraceId,
          metaError: sendResult.rawMetaError,
          failedMessage: {
            id: failedMsg.id,
            sender: "agent",
            text: contentToPersist,
            type: failedMsg.type,
            status: "failed",
            errorMessage: sendResult.error,
            errorCode: sendResult.errorCode,
            errorType: sendResult.errorType,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            environment,
          },
        },
        { status: errorStatusCode }
      );
    }

    // Meta accepted message: save with returned Meta message ID (wamId)
    const savedMsg = await prisma.message.create({
      data: {
        contactId: contact.id,
        organizationId: sessionOrgId,
        environment,
        wamId: sendResult.messageId,
        direction: "outbound",
        content: contentToPersist,
        type: type === "template" ? "template" : "text",
        status: "sent",
      },
    });

    await prisma.contact.update({
      where: { id: contact.id },
      data: { updatedAt: new Date(), environment },
    });

    // Keep Conversation record in sync
    const orgId = sessionOrgId;
    const existingConv = await prisma.conversation.findFirst({
      where: { contactId: contact.id, organizationId: orgId, environment },
    });

    if (existingConv) {
      await prisma.conversation.update({
        where: { id: existingConv.id },
        data: { lastMessageAt: new Date() },
      });
    } else {
      await prisma.conversation.create({
        data: {
          contactId: contact.id,
          organizationId: orgId,
          environment,
          lastMessageAt: new Date(),
          status: "open",
        },
      });
    }

    const d = new Date(savedMsg.timestamp);
    return NextResponse.json({
      success: true,
      environment,
      message: {
        id: savedMsg.id,
        wamId: savedMsg.wamId,
        sender: "agent",
        text: savedMsg.content,
        type: savedMsg.type,
        status: "sent",
        time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timestamp: savedMsg.timestamp,
        environment,
      },
    });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}

