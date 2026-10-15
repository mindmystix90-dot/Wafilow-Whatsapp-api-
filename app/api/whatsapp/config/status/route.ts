import { NextResponse } from "next/server";
import { getWhatsAppConfig } from "@/lib/whatsapp";
import { maskSecret } from "@/lib/env";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/whatsapp/config/status
 * Returns safe configuration status strictly for the authenticated tenant.
 * Unconnected accounts return configured: false.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const orgId = session?.user?.organizationId;

    if (!orgId) {
      return NextResponse.json({
        configured: false,
        phoneNumberId: null,
        wabaId: null,
        accessTokenConfigured: false,
        apiVersion: "v24.0",
      });
    }

    const config = await getWhatsAppConfig(orgId);

    return NextResponse.json({
      configured: config.isConfigured,
      phoneNumberId: config.isConfigured && config.phoneNumberId ? maskSecret(config.phoneNumberId) || config.phoneNumberId : null,
      wabaId: config.isConfigured && config.wabaId ? maskSecret(config.wabaId) || config.wabaId : null,
      accessTokenConfigured: Boolean(config.isConfigured && config.accessToken && config.accessToken.length > 0),
      apiVersion: "v24.0",
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error checking config status";
    console.error("[WhatsApp Config Status GET Error]:", error);
    return NextResponse.json(
      {
        configured: false,
        accessTokenConfigured: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
