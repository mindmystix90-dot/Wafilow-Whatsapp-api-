import { NextResponse } from "next/server";
import { getWhatsAppConfig } from "@/lib/whatsapp";
import { maskSecret } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * GET /api/whatsapp/config/status
 * Returns safe configuration status without exposing access tokens or secrets.
 */
export async function GET() {
  try {
    const config = await getWhatsAppConfig();

    return NextResponse.json({
      configured: config.isConfigured,
      phoneNumberId: config.phoneNumberId ? maskSecret(config.phoneNumberId) || config.phoneNumberId : null,
      wabaId: config.wabaId ? maskSecret(config.wabaId) || config.wabaId : null,
      accessTokenConfigured: Boolean(config.accessToken && config.accessToken.length > 0),
      apiVersion: "v21.0",
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
