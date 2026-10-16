import { NextRequest, NextResponse } from "next/server";
import {
  getWhatsAppConnection,
  saveWhatsAppConnection,
  validateEnvironment,
  WhatsAppEnvironment,
} from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

/**
 * GET /api/whatsapp/config
 * Returns current configuration status strictly for the authenticated customer's organization.
 * Supports ?environment=production | sandbox.
 * Returns both production and sandbox details for multi-environment dashboards.
 * Never exposes access tokens or secrets.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    let orgId = session?.user?.organizationId;

    if (userId && !orgId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      orgId = user?.organizationId || null;
    }

    const { searchParams } = new URL(req.url);
    const requestedEnv = searchParams.get("environment") || "production";
    let targetEnv: WhatsAppEnvironment = "production";
    try {
      targetEnv = validateEnvironment(requestedEnv);
    } catch {
      targetEnv = "production";
    }

    const hostHeader = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const host = hostHeader.endsWith(".vercel.app") ? "wafilow-whatsapp-api.vercel.app" : hostHeader;
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const webhookUrl = host.includes("localhost")
      ? `${proto}://${host}/api/webhook`
      : "https://wafilow-whatsapp-api.vercel.app/api/webhook";

    if (!orgId) {
      return NextResponse.json({
        success: true,
        environment: targetEnv,
        configured: false,
        production: {
          configured: false,
          status: "disconnected",
          phoneNumberId: null,
          wabaId: null,
          displayPhoneNumber: null,
          verifiedName: null,
          hasAccessToken: false,
          lastCheckedAt: null,
        },
        sandbox: {
          configured: false,
          status: "disconnected",
          phoneNumberId: null,
          wabaId: null,
          displayPhoneNumber: null,
          verifiedName: null,
          hasAccessToken: false,
          lastCheckedAt: null,
        },
        phoneNumberId: null,
        wabaId: null,
        verifyToken: null,
        hasAccessToken: false,
        appId: process.env.META_APP_ID || "3356483501181888",
        configId: process.env.META_CONFIG_ID || "2934849833375100",
        webhookUrl,
      });
    }

    const [prodConfig, sandConfig, org] = await Promise.all([
      getWhatsAppConnection(orgId, "production"),
      getWhatsAppConnection(orgId, "sandbox"),
      prisma.organization.findUnique({ where: { id: orgId } }),
    ]);

    const activeConfig = targetEnv === "sandbox" ? sandConfig : prodConfig;

    return NextResponse.json({
      success: true,
      environment: targetEnv,
      // Backward compatibility root fields (point to requested environment)
      configured: activeConfig.isConfigured,
      phoneNumberId: activeConfig.isConfigured ? activeConfig.phoneNumberId : null,
      wabaId: activeConfig.isConfigured ? activeConfig.wabaId : null,
      displayPhoneNumber: activeConfig.displayPhoneNumber,
      verifiedName: activeConfig.verifiedName,
      status: activeConfig.status,
      hasAccessToken: Boolean(activeConfig.accessToken),
      verifyToken: org?.webhookVerifyToken || activeConfig.webhookVerifyToken,
      lastCheckedAt: activeConfig.lastCheckedAt,
      // Detailed multi-environment status
      production: {
        configured: prodConfig.isConfigured,
        status: prodConfig.status,
        phoneNumberId: prodConfig.isConfigured ? prodConfig.phoneNumberId : null,
        wabaId: prodConfig.isConfigured ? prodConfig.wabaId : null,
        displayPhoneNumber: prodConfig.displayPhoneNumber,
        verifiedName: prodConfig.verifiedName,
        hasAccessToken: Boolean(prodConfig.accessToken),
        lastCheckedAt: prodConfig.lastCheckedAt,
        lastError: prodConfig.lastError || null,
        isPendingRegistration: Boolean(
          prodConfig.lastError?.includes("133010") ||
          prodConfig.lastError?.toLowerCase().includes("registration")
        ),
      },
      sandbox: {
        configured: sandConfig.isConfigured,
        status: sandConfig.status,
        phoneNumberId: sandConfig.isConfigured ? sandConfig.phoneNumberId : null,
        wabaId: sandConfig.isConfigured ? sandConfig.wabaId : null,
        displayPhoneNumber: sandConfig.displayPhoneNumber,
        verifiedName: sandConfig.verifiedName,
        hasAccessToken: Boolean(sandConfig.accessToken),
        lastCheckedAt: sandConfig.lastCheckedAt,
      },
      appId: activeConfig.appId,
      configId: process.env.META_CONFIG_ID || "2934849833375100",
      webhookUrl,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error reading config";
    console.error("[WhatsApp Config GET Error]:", error);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/config
 * Saves WhatsApp credentials for either "production" or "sandbox".
 * Safely stores separate connections without cross-environment overwriting.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    let userOrgId = session?.user?.organizationId;

    if (!session || !userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. You must be signed in to configure WhatsApp credentials." },
        { status: 401 }
      );
    }

    if (!userOrgId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { organization: true },
      });
      userOrgId = user?.organizationId || null;
      if (!userOrgId) {
        const createdOrg = await prisma.organization.create({
          data: {
            name: `${user?.name || "Customer"}'s Workspace`,
            webhookVerifyToken: `wafilow_${Math.random().toString(36).substring(2, 12)}`,
          },
        });
        await prisma.user.update({
          where: { id: userId },
          data: { organizationId: createdOrg.id },
        });
        userOrgId = createdOrg.id;
      }
    }

    const body = await req.json().catch(() => ({}));
    const {
      environment: rawEnv = "production",
      phoneNumberId,
      wabaId,
      accessToken,
      verifyToken,
      displayPhone,
      verifiedName,
    } = body;

    let environment: WhatsAppEnvironment;
    try {
      environment = validateEnvironment(rawEnv);
    } catch (envErr) {
      return NextResponse.json(
        { success: false, error: envErr instanceof Error ? envErr.message : "Invalid environment selection" },
        { status: 400 }
      );
    }

    const targetOrg = await prisma.organization.findUnique({ where: { id: userOrgId } });
    if (!targetOrg) {
      return NextResponse.json(
        { success: false, error: "Organization not found for authenticated user." },
        { status: 404 }
      );
    }

    const cleanWabaId = wabaId && String(wabaId).trim() ? String(wabaId).trim() : null;
    const cleanPhoneId = phoneNumberId && String(phoneNumberId).trim() ? String(phoneNumberId).trim() : null;
    const rawToken =
      accessToken &&
      !accessToken.includes("[Meta Cloud API Token]") &&
      !accessToken.startsWith("••••") &&
      String(accessToken).trim()
        ? String(accessToken).trim()
        : undefined;

    // Check cross-tenant isolation: ensures another organization doesn't already own this phone or WABA
    if (cleanPhoneId) {
      const existingConn = await prisma.whatsAppConnection.findFirst({
        where: {
          phoneNumberId: cleanPhoneId,
          NOT: { organizationId: targetOrg.id },
        },
      });
      if (existingConn) {
        throw new ConflictError(
          `This Phone Number ID is already registered to another organization in ${existingConn.environment} mode.`
        );
      }
    }

    // Save connection using isolated saveWhatsAppConnection
    const updatedConn = await saveWhatsAppConnection({
      organizationId: targetOrg.id,
      environment,
      phoneNumberId: cleanPhoneId,
      wabaId: cleanWabaId,
      accessToken: rawToken,
      displayPhoneNumber: displayPhone,
      verifiedName,
      status: "connected",
    });

    // Update webhook verify token on organization if provided
    if (verifyToken && String(verifyToken).trim()) {
      await prisma.organization.update({
        where: { id: targetOrg.id },
        data: { webhookVerifyToken: String(verifyToken).trim() },
      });
    }

    return NextResponse.json({
      success: true,
      message: `${environment === "sandbox" ? "Sandbox test" : "Production"} WhatsApp Cloud API credentials saved securely.`,
      environment,
      configured: updatedConn.isConfigured,
      status: updatedConn.status,
    });
  } catch (error: unknown) {
    if (error instanceof ConflictError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    const errorMsg = error instanceof Error ? error.message : "Error saving config";
    console.error("[WhatsApp Config POST Error]:", error);
    return NextResponse.json({ success: false, error: `Failed to save configuration: ${errorMsg}` }, { status: 500 });
  }
}
