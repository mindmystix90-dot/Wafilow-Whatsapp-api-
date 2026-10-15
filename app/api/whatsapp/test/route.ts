import { NextRequest, NextResponse } from "next/server";
import {
  normalizePhoneNumber,
  sendWhatsAppMessage,
  getWhatsAppConnection,
  validateEnvironment,
  WhatsAppEnvironment,
} from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    let orgId = session?.user?.organizationId;

    if (!session || !userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in to send test messages." },
        { status: 401 }
      );
    }

    if (!orgId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      orgId = user?.organizationId || null;
    }

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: "No WhatsApp Business account connected to your workspace." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { to, messageType = "template", text, environment: rawEnv = "production" } = body;

    let environment: WhatsAppEnvironment;
    try {
      environment = validateEnvironment(rawEnv);
    } catch {
      return NextResponse.json(
        { success: false, error: `Invalid environment '${rawEnv}'. Expected 'production' or 'sandbox'.` },
        { status: 400 }
      );
    }

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

    const config = await getWhatsAppConnection(orgId, environment);
    if (!config.isConfigured) {
      return NextResponse.json(
        {
          success: false,
          error: `WhatsApp Cloud API is not configured for ${environment.toUpperCase()} mode. Please enter credentials in Settings.`,
          environment,
          configured: false,
        },
        { status: 400 }
      );
    }

    // Default to 'hello_world' template which is pre-approved by Meta for all WABAs
    const sendResult = await sendWhatsAppMessage({
      to: norm.digits,
      type: messageType === "text" ? "text" : "template",
      text: text || `Test ping from Wafilow WhatsApp Cloud API [${environment.toUpperCase()} MODE]`,
      template: {
        name: "hello_world",
        language: { code: "en_US" },
      },
      organizationId: orgId,
      environment,
    });

    if (!sendResult.success) {
      return NextResponse.json(
        {
          success: false,
          environment,
          error: sendResult.error,
          errorCode: sendResult.errorCode,
          errorType: sendResult.errorType,
          metaError: sendResult.rawMetaError,
        },
        { status: 400 }
      );
    }

    // Persist contact & message to database for audit and inbox tracking with environment tag
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
          tags: `${environment === "sandbox" ? "Sandbox Test Ping" : "Test Ping"}`,
          status: "active",
          organizationId: config.organizationId,
          environment,
        },
      });

      await prisma.message.create({
        data: {
          contactId: contact.id,
          organizationId: config.organizationId,
          environment,
          wamId: sendResult.messageId,
          direction: "outbound",
          content: messageType === "text" && text ? text : `Template: hello_world (${environment.toUpperCase()} Ping)`,
          type: messageType === "text" ? "text" : "template",
          status: "sent",
        },
      });
    } catch (dbErr) {
      console.warn("[Test Route] Warning: could not log test message to DB:", dbErr);
    }

    return NextResponse.json({
      success: true,
      environment,
      messageId: sendResult.messageId,
      recipient: norm.formatted,
      message: `Test WhatsApp ping successfully dispatched via Meta Cloud API in ${environment.toUpperCase()} mode (ID: ${sendResult.messageId}).`,
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
