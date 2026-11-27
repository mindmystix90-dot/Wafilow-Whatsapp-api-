import { NextResponse } from "next/server";
import { getWhatsAppConfig } from "@/lib/whatsapp";
import { getServerWhatsAppEnv, maskSecret } from "@/lib/env";
import { requireActiveUserSession, handleAuthError } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/whatsapp/config/status
 * Returns safe configuration status strictly for the authenticated tenant.
 * Unconnected accounts return configured: false.
 */
export async function GET() {
  try {
    const sessionUser = await requireActiveUserSession();
    const orgId = sessionUser.organizationId;

    const config = await getWhatsAppConfig(orgId);

    return NextResponse.json({
      configured: config.isConfigured,
      phoneNumberId: config.isConfigured && config.phoneNumberId ? maskSecret(config.phoneNumberId) || config.phoneNumberId : null,
      wabaId: config.isConfigured && config.wabaId ? maskSecret(config.wabaId) || config.wabaId : null,
      accessTokenConfigured: Boolean(config.isConfigured && config.accessToken && config.accessToken.length > 0),
      apiVersion: getServerWhatsAppEnv().apiVersion,
    });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}

