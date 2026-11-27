import { NextRequest, NextResponse } from "next/server";
import {
  getWhatsAppConnection,
  saveWhatsAppConnection,
  validateEnvironment,
  WhatsAppEnvironment,
} from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";
import { getServerWhatsAppEnv } from "@/lib/env";
import { requireActiveUserSession, handleAuthError } from "@/lib/admin-auth";

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
    const sessionUser = await requireActiveUserSession();
    const orgId = sessionUser.organizationId;


    const { searchParams } = new URL(req.url);
    const requestedEnv = searchParams.get("environment") || "production";
    let targetEnv: WhatsAppEnvironment = "production";
    try {
      targetEnv = validateEnvironment(requestedEnv);
    } catch {
      targetEnv = "production";
    }

    const hostHeader = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || (hostHeader.includes("localhost") ? "http" : "https");
    const webhookUrl = `${proto}://${hostHeader}/api/webhook`;

    const serverWhatsAppEnv = getServerWhatsAppEnv();

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
        appId: serverWhatsAppEnv.appId || "3356483501181888",
        configId: serverWhatsAppEnv.configId || "2934849833375100",
        apiVersion: serverWhatsAppEnv.apiVersion,
        webhookUrl,
      });
    }

    const [prodConfig, sandConfig, org] = await Promise.all([
      getWhatsAppConnection(orgId, "production"),
      getWhatsAppConnection(orgId, "sandbox"),
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, webhookVerifyToken: true },
      }),
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
      configId: serverWhatsAppEnv.configId || "2934849833375100",
      apiVersion: serverWhatsAppEnv.apiVersion,
      webhookUrl,
    });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}

/**
 * POST /api/whatsapp/config
 * Saves WhatsApp credentials for either "production" or "sandbox".
 * Safely stores separate connections without cross-environment overwriting.
 */
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireActiveUserSession();
    const userOrgId = sessionUser.organizationId;

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

    const targetOrg = await prisma.organization.findUnique({
      where: { id: userOrgId },
      select: { id: true },
    });
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
        select: { id: true },
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
    return handleAuthError(error);
  }
}

