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

    let org = null;
    if (orgId) {
      org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: {
          wabaAccounts: {
            include: { phoneNumbers: true },
          },
        },
      });
    } else {
      org = await prisma.organization.findFirst({
        where: {
          OR: [
            { accessToken: { not: null } },
            { phoneNumberId: { not: null } },
            { wabaId: { not: null } },
          ],
        },
        include: {
          wabaAccounts: {
            include: { phoneNumbers: true },
          },
        },
      });
    }

    const activeWaba =
      org?.wabaAccounts?.find((w) => w.wabaId === config.wabaId) || org?.wabaAccounts?.[0];
    const activePhone =
      activeWaba?.phoneNumbers?.find((p) => p.phoneNumberId === config.phoneNumberId) ||
      org?.wabaAccounts?.flatMap((w) => w.phoneNumbers)?.find((p) => p.phoneNumberId === config.phoneNumberId) ||
      activeWaba?.phoneNumbers?.[0];

    return NextResponse.json({
      success: true,
      configured: config.isConfigured,
      phoneNumberId: config.phoneNumberId,
      wabaId: config.wabaId,
      verifyToken: config.webhookVerifyToken,
      hasAccessToken: Boolean(config.accessToken),
      appId: config.appId || process.env.META_APP_ID || "3356483501181888",
      configId: process.env.META_CONFIG_ID || "293484983375100",
      businessName: activeWaba?.name || org?.name || null,
      displayPhoneNumber: activePhone?.displayPhone || org?.displayPhoneNumber || null,
      verifiedName: activePhone?.verifiedName || null,
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
 * Saves updated WhatsApp Cloud API credentials securely on the server.
 * Handles WABA and Phone Number records idempotently with strict tenant isolation.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userOrgId = session?.user?.organizationId;

    const body = await req.json().catch(() => ({}));
    const { phoneNumberId, wabaId, accessToken, verifyToken, displayPhone, verifiedName } = body;

    const requestedOrgId =
      userOrgId ||
      (body.organizationId && typeof body.organizationId === "string" ? body.organizationId.trim() : null);

    let targetOrg = requestedOrgId
      ? await prisma.organization.findUnique({ where: { id: requestedOrgId } })
      : await prisma.organization.findFirst();

    if (!targetOrg) {
      targetOrg = await prisma.organization.create({
        data: {
          name: "Primary WhatsApp Business",
          webhookVerifyToken: verifyToken ? String(verifyToken).trim() : "wafilow_webhook_token_secure_9921",
        },
      });
    }

    const cleanWabaId = wabaId && String(wabaId).trim() ? String(wabaId).trim() : null;
    const cleanPhoneId = phoneNumberId && String(phoneNumberId).trim() ? String(phoneNumberId).trim() : null;
    const cleanToken =
      accessToken &&
      !accessToken.includes("[Meta Cloud API Token]") &&
      !accessToken.startsWith("••••") &&
      String(accessToken).trim()
        ? String(accessToken).trim()
        : undefined;
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
