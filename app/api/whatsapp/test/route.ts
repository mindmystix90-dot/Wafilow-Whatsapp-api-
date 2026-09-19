import { NextRequest, NextResponse } from "next/server";
import { normalizePhoneNumber, sendWhatsAppMessage, getWhatsAppConfig } from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { to, messageType = "template", text } = body;

    if (!to) {
      return NextResponse.json(
        { success: false, error: "Recipient phone number ('to') is required." },
        { status: 400 }
      );
    }

    const norm = normalizePhoneNumber(to);
    if (!norm.valid) {
      return NextResponse.json(
        { success: false, error: norm.error },
        { status: 400 }
      );
    }

    const config = await getWhatsAppConfig();
    if (!config.isConfigured) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Meta WhatsApp Cloud API is not configured on this server. Please provide META_PHONE_NUMBER_ID and META_ACCESS_TOKEN in server environment or API Settings.",
          configured: false,
        },
        { status: 400 }
      );
    }

    // Default to 'hello_world' template which is pre-approved by Meta for all WABAs and functions outside the 24h conversation window
    const sendResult = await sendWhatsAppMessage({
      to: norm.digits,
      type: messageType === "text" ? "text" : "template",
      text: text || "Test ping from Wafilow WhatsApp Cloud API",
      template: {
        name: "hello_world",
        language: { code: "en_US" },
      },
      organizationId: config.organizationId,
    });

    if (!sendResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: sendResult.error,
          metaError: sendResult.rawMetaError,
        },
        { status: 400 }
      );
    }

    // Persist contact & message to database for audit and inbox tracking
    try {
      const contact = await prisma.contact.upsert({
        where: { phoneNumber: norm.digits },
        update: {
          status: "active",
          updatedAt: new Date(),
        },
        create: {
          name: `WhatsApp User (${norm.formatted})`,
          phoneNumber: norm.digits,
          waId: norm.digits,
          tags: "Test Ping",
          status: "active",
          organizationId: config.organizationId,
        },
      });

      await prisma.message.create({
        data: {
          contactId: contact.id,
          organizationId: config.organizationId,
          wamId: sendResult.messageId,
          direction: "outbound",
          content: messageType === "text" && text ? text : "Template: hello_world (Test Ping)",
          type: messageType === "text" ? "text" : "template",
          status: "sent",
        },
      });
    } catch (dbErr) {
      console.warn("[Test Route] Warning: could not log test message to DB:", dbErr);
    }

    return NextResponse.json({
      success: true,
      messageId: sendResult.messageId,
      recipient: norm.formatted,
      message: `Test WhatsApp ping successfully dispatched via Meta Cloud API (ID: ${sendResult.messageId}).`,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal server error";
    console.error("[Test WhatsApp Message Error]:", error);
    return NextResponse.json(
      { success: false, error: `Failed to process test message: ${errorMsg}` },
      { status: 500 }
    );
  }
}
