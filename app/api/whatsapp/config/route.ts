import { NextRequest, NextResponse } from "next/server";
import { getWhatsAppConfig } from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { encryptToken } from "@/lib/crypto";

export const dynamic = "force-dynamic";

/**
 * GET /api/whatsapp/config
 * Returns current configuration status strictly for the authenticated customer's organization.
 * Never exposes access tokens or secrets.
 * Unconnected accounts return configured: false and null details.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    let orgId = session?.user?.organizationId;

    // If orgId is not on session, look up from user record in database
    if (userId && !orgId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      orgId = user?.organizationId || null;
    }

    const hostHeader = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const host = hostHeader.endsWith(".vercel.app") ? "wafilow-whatsapp-api.vercel.app" : hostHeader;
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const webhookUrl = host.includes("localhost")
      ? `${proto}://${host}/api/webhook`
      : "https://wafilow-whatsapp-api.vercel.app/api/webhook";

    // Unauthenticated or users without an organization get empty onboarding state
    if (!orgId) {
      return NextResponse.json({
        success: true,
        configured: false,
        phoneNumberId: null,
        wabaId: null,
        verifyToken: null,
        hasAccessToken: false,
        appId: process.env.META_APP_ID || "3356483501181888",
        configId: process.env.META_CONFIG_ID || "2934849833375100",
        businessName: null,
        displayPhoneNumber: null,
        verifiedName: null,
        webhookUrl,
      });
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        wabaAccounts: {
          include: { phoneNumbers: true },
        },
      },
    });

    const config = await getWhatsAppConfig(orgId);

    const activeWaba =
      org?.wabaAccounts?.find((w) => w.wabaId === config.wabaId) || org?.wabaAccounts?.[0];
    const activePhone =
      activeWaba?.phoneNumbers?.find((p) => p.phoneNumberId === config.phoneNumberId) ||
      org?.wabaAccounts?.flatMap((w) => w.phoneNumbers)?.find((p) => p.phoneNumberId === config.phoneNumberId) ||
      activeWaba?.phoneNumbers?.[0];

    return NextResponse.json({
      success: true,
      configured: config.isConfigured,
      phoneNumberId: config.isConfigured ? config.phoneNumberId : null,
      wabaId: config.isConfigured ? config.wabaId : null,
      verifyToken: org?.webhookVerifyToken || config.webhookVerifyToken,
      hasAccessToken: Boolean(config.accessToken),
      appId: config.appId || process.env.META_APP_ID || "3356483501181888",
      configId: process.env.META_CONFIG_ID || "2934849833375100",
      businessName: config.isConfigured ? activeWaba?.name || org?.name || null : null,
      displayPhoneNumber: config.isConfigured ? activePhone?.displayPhone || org?.displayPhoneNumber || null : null,
      verifiedName: config.isConfigured ? activePhone?.verifiedName || null : null,
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

class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

/**
 * POST /api/whatsapp/config
 * Saves updated WhatsApp Cloud API credentials strictly for the authenticated tenant.
 * Encrypts sensitive access tokens at rest.
 * Enforces strict authentication and rejects cross-tenant hijacking attempts.
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
        // Create an organization for the user if they don't have one
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
    const { phoneNumberId, wabaId, accessToken, verifyToken, displayPhone, verifiedName } = body;

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

    // Encrypt sensitive token at rest before writing to database
    const cleanToken = rawToken ? encryptToken(rawToken) : undefined;
    const cleanVerifyToken = verifyToken && String(verifyToken).trim() ? String(verifyToken).trim() : undefined;

    await prisma.$transaction(async (tx) => {
      // 1. Verify WABA ownership across tenants
      if (cleanWabaId) {
        const existingWabaRecord = await tx.whatsAppBusinessAccount.findUnique({
          where: { wabaId: cleanWabaId },
        });

        const existingOrgWithWaba = await tx.organization.findUnique({
          where: { wabaId: cleanWabaId },
        });

        if (
          (existingWabaRecord && existingWabaRecord.organizationId !== targetOrg.id) ||
          (existingOrgWithWaba && existingOrgWithWaba.id !== targetOrg.id)
        ) {
          throw new ConflictError(
            "This WhatsApp Business Account (WABA ID) is already registered to another organization."
          );
        }
      }

      // 2. Verify Phone Number ownership across tenants
      if (cleanPhoneId) {
        const existingPhoneRecord = await tx.whatsAppPhoneNumber.findUnique({
          where: { phoneNumberId: cleanPhoneId },
          include: { wabaAccount: true },
        });

        const existingOrgWithPhone = await tx.organization.findUnique({
          where: { phoneNumberId: cleanPhoneId },
        });

        if (
          (existingPhoneRecord?.wabaAccount && existingPhoneRecord.wabaAccount.organizationId !== targetOrg.id) ||
          (existingOrgWithPhone && existingOrgWithPhone.id !== targetOrg.id)
        ) {
          throw new ConflictError("This Phone Number ID is already registered to another organization.");
        }
      }

      // 3. Upsert / update WhatsAppBusinessAccount record
      let wabaAccount = null;
      if (cleanWabaId) {
        const existingWabaRecord = await tx.whatsAppBusinessAccount.findUnique({
          where: { wabaId: cleanWabaId },
        });

        if (existingWabaRecord) {
          // Current organization already owns this WABA: UPDATE existing record
          wabaAccount = await tx.whatsAppBusinessAccount.update({
            where: { id: existingWabaRecord.id },
            data: {
              organizationId: targetOrg.id,
              name: targetOrg.name || existingWabaRecord.name || "WhatsApp Business Account",
              updatedAt: new Date(),
            },
          });
        } else {
          // WABA does not exist: CREATE the WABA record
          wabaAccount = await tx.whatsAppBusinessAccount.create({
            data: {
              wabaId: cleanWabaId,
              organizationId: targetOrg.id,
              name: targetOrg.name || "WhatsApp Business Account",
            },
          });
        }
      } else if (targetOrg.wabaId) {
        wabaAccount = await tx.whatsAppBusinessAccount.findUnique({
          where: { wabaId: targetOrg.wabaId },
        });
      }

      // 4. Update / create associated WhatsAppPhoneNumber record
      if (cleanPhoneId) {
        const existingPhoneRecord = await tx.whatsAppPhoneNumber.findUnique({
          where: { phoneNumberId: cleanPhoneId },
        });

        if (existingPhoneRecord) {
          await tx.whatsAppPhoneNumber.update({
            where: { id: existingPhoneRecord.id },
            data: {
              wabaAccountId: wabaAccount?.id || existingPhoneRecord.wabaAccountId,
              displayPhone:
                typeof displayPhone === "string" && displayPhone.trim()
                  ? displayPhone.trim()
                  : existingPhoneRecord.displayPhone,
              verifiedName:
                typeof verifiedName === "string" && verifiedName.trim()
                  ? verifiedName.trim()
                  : existingPhoneRecord.verifiedName,
              updatedAt: new Date(),
            },
          });
        } else {
          await tx.whatsAppPhoneNumber.create({
            data: {
              phoneNumberId: cleanPhoneId,
              wabaAccountId: wabaAccount?.id,
              displayPhone: typeof displayPhone === "string" && displayPhone.trim() ? displayPhone.trim() : null,
              verifiedName: typeof verifiedName === "string" && verifiedName.trim() ? verifiedName.trim() : null,
            },
          });
        }
      }

      // 5. Update Organization credentials
      await tx.organization.update({
        where: { id: targetOrg.id },
        data: {
          ...(cleanWabaId !== null ? { wabaId: cleanWabaId } : {}),
          ...(cleanPhoneId !== null ? { phoneNumberId: cleanPhoneId } : {}),
          ...(cleanToken !== undefined ? { accessToken: cleanToken } : {}),
          ...(cleanVerifyToken !== undefined ? { webhookVerifyToken: cleanVerifyToken } : {}),
        },
      });
    });

    const updatedConfig = await getWhatsAppConfig(targetOrg.id);

    return NextResponse.json({
      success: true,
      message: "WhatsApp Cloud API credentials saved securely.",
      configured: updatedConfig.isConfigured,
    });
  } catch (error: unknown) {
    if (error instanceof ConflictError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      );
    }

    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
      const prismaErr = error as { meta?: { target?: string[] | string } };
      const target = Array.isArray(prismaErr.meta?.target)
        ? prismaErr.meta?.target.join(", ")
        : String(prismaErr.meta?.target || "");

      if (target.includes("wabaId")) {
        return NextResponse.json(
          {
            success: false,
            error: "This WhatsApp Business Account (WABA ID) is already registered to another organization.",
          },
          { status: 409 }
        );
      }
      if (target.includes("phoneNumberId")) {
        return NextResponse.json(
          {
            success: false,
            error: "This Phone Number ID is already registered to another organization.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: "A unique constraint conflict occurred with the provided credentials." },
        { status: 409 }
      );
    }

    const errorMsg = error instanceof Error ? error.message : "Error saving config";
    console.error("[WhatsApp Config POST Error]:", error);
    return NextResponse.json(
      { success: false, error: `Failed to save configuration: ${errorMsg}` },
      { status: 500 }
    );
  }
}
