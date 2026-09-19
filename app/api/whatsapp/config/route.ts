import { NextRequest, NextResponse } from "next/server";
import { getWhatsAppConfig } from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/whatsapp/config
 * Returns current configuration status without exposing access tokens or secrets.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const orgId = session?.user?.organizationId;
    const config = await getWhatsAppConfig(orgId || undefined);

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const webhookUrl = `${proto}://${host}/api/webhook`;

    return NextResponse.json({
      success: true,
      configured: config.isConfigured,
      phoneNumberId: config.phoneNumberId,
      wabaId: config.wabaId,
      verifyToken: config.webhookVerifyToken,
      hasAccessToken: Boolean(config.accessToken),
      appId: config.appId,
      webhookUrl,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error fetching config";
    console.error("[WhatsApp Config GET Error]:", error);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}

/**
 * POST /api/whatsapp/config
 * Saves updated WhatsApp Cloud API credentials securely on the server.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userOrgId = session?.user?.organizationId;

    const body = await req.json().catch(() => ({}));
    const { phoneNumberId, wabaId, accessToken, verifyToken } = body;

    // Find target Organization (user's organization or first existing)
    const existingOrg = userOrgId
      ? await prisma.organization.findUnique({ where: { id: userOrgId } })
      : await prisma.organization.findFirst();

    if (existingOrg) {
      await prisma.organization.update({
        where: { id: existingOrg.id },
        data: {
          phoneNumberId: phoneNumberId ? String(phoneNumberId).trim() : existingOrg.phoneNumberId,
          wabaId: wabaId ? String(wabaId).trim() : existingOrg.wabaId,
          accessToken: accessToken && !accessToken.includes("[Meta Cloud API Token]") ? String(accessToken).trim() : existingOrg.accessToken,
          webhookVerifyToken: verifyToken ? String(verifyToken).trim() : existingOrg.webhookVerifyToken,
        },
      });
    } else {
      await prisma.organization.create({
        data: {
          name: "Primary WhatsApp Business",
          phoneNumberId: phoneNumberId ? String(phoneNumberId).trim() : undefined,
          wabaId: wabaId ? String(wabaId).trim() : undefined,
          accessToken: accessToken && !accessToken.includes("[Meta Cloud API Token]") ? String(accessToken).trim() : undefined,
          webhookVerifyToken: verifyToken ? String(verifyToken).trim() : "wafilow_webhook_token_secure_9921",
        },
      });
    }

    const updatedConfig = await getWhatsAppConfig(existingOrg?.id);

    return NextResponse.json({
      success: true,
      message: "WhatsApp Cloud API credentials saved securely.",
      configured: updatedConfig.isConfigured,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error saving config";
    console.error("[WhatsApp Config POST Error]:", error);
    return NextResponse.json(
      { success: false, error: `Failed to save configuration: ${errorMsg}` },
      { status: 500 }
    );
  }
}
