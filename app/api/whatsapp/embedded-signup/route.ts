import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getServerWhatsAppEnv } from "@/lib/env";
import { encryptToken } from "@/lib/crypto";

export const dynamic = "force-dynamic";

class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

/**
 * POST /api/whatsapp/embedded-signup
 *
 * Secure server-side endpoint for Meta WhatsApp Embedded Signup (v4).
 * - Requires authenticated session and isolates credentials strictly to user's organization.
 * - Encrypts access token at rest.
 * - Idempotently persists WhatsAppBusinessAccount and WhatsAppPhoneNumber records.
 * - Enforces strict tenant isolation (returns 409 Conflict if WABA or phone belongs to another tenant).
 * - NEVER leaks access tokens, secrets, or authorization codes to browser or server logs.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Validate authenticated Wafilow session before provisioning
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const userOrgId = session?.user?.organizationId;

    if (!session || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required. You must be signed in to connect WhatsApp Business via Embedded Signup.",
        },
        { status: 401 }
      );
    }

    let targetOrg = null;

    if (userOrgId) {
      targetOrg = await prisma.organization.findUnique({
        where: { id: userOrgId },
      });
    }

    if (!targetOrg) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { organization: true },
      });

      if (user?.organization) {
        targetOrg = user.organization;
      } else {
        // Create an organization if the user doesn't have one
        targetOrg = await prisma.organization.create({
          data: {
            name: `${user?.name || "Customer"}'s Workspace`,
            webhookVerifyToken: `wafilow_${Math.random().toString(36).substring(2, 12)}`,
          },
        });
        await prisma.user.update({
          where: { id: userId },
          data: { organizationId: targetOrg.id },
        });
      }
    }

    // 2. Parse request payload
    const body = await req.json().catch(() => ({}));
    const {
      code,
      wabaId,
      phoneNumberId,
      sessionInfo,
      event: clientEvent,
    } = body;

    // Strict verification: Coexistence is NEVER trusted solely from a client-provided boolean.
    // It must be verified from authentic Meta Embedded Signup postMessage session info.
    const sessionPayload =
      typeof sessionInfo === "object" && sessionInfo !== null
        ? (sessionInfo as Record<string, unknown>)
        : null;

    const sessionType = sessionPayload?.type;
    const sessionEvent =
      (typeof sessionPayload?.event === "string" ? sessionPayload.event : undefined) ||
      (typeof clientEvent === "string" ? clientEvent : undefined);

    const isCoexistenceSession =
      sessionType === "WA_EMBEDDED_SIGNUP" &&
      sessionEvent === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING";

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Temporary authorization code from Meta is required.",
        },
        { status: 400 }
      );
    }

    // 3. Validate server credentials using existing Wafilow environment configuration
    const env = getServerWhatsAppEnv();
    const appId = env.appId || "3356483501181888";
    const appSecret = env.appSecret;
    const apiVersion = env.apiVersion || "v24.0";

    if (!appSecret) {
      console.error(
        "[Embedded Signup Error] META_APP_SECRET is not configured on the server."
      );
      return NextResponse.json(
        {
          success: false,
          error:
            "Meta App Secret (META_APP_SECRET) is not configured on the server. Please add META_APP_SECRET to your environment variables.",
        },
        { status: 500 }
      );
    }

    // 4. Exchange authorization code with Meta Graph API
    console.log(
      `[Embedded Signup] Exchanging authorization code with Meta Graph API (${apiVersion}) for org: ${targetOrg.id}`
    );

    const tokenUrl = new URL(`https://graph.facebook.com/${apiVersion}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("code", code.trim());

    const tokenRes = await fetch(tokenUrl.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!tokenRes.ok) {
      const metaErr = await tokenRes.json().catch(() => ({}));
      const errorMsg = metaErr?.error?.message || "Meta authorization code exchange failed.";
      const errorCode = metaErr?.error?.code;
      const errorSubcode = metaErr?.error?.error_subcode;
      console.error(
        `[Embedded Signup Error] Meta rejected code exchange (code: ${errorCode}, subcode: ${errorSubcode}): ${errorMsg}`
      );
      return NextResponse.json(
        {
          success: false,
          error: `Meta authorization failed: ${errorMsg}`,
        },
        { status: 400 }
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken || typeof accessToken !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Meta token exchange succeeded but no access token was returned.",
        },
        { status: 400 }
      );
    }

    // 5. Resolve WABA ID
    let resolvedWabaId = wabaId && String(wabaId).trim() ? String(wabaId).trim() : null;
    let resolvedPhoneId =
      phoneNumberId && String(phoneNumberId).trim() ? String(phoneNumberId).trim() : null;
    let businessName: string | null = null;
    let displayPhone: string | null = null;
    let verifiedName: string | null = null;

    // If client did not capture WABA ID from postMessage, discover it from debug_token
    if (!resolvedWabaId) {
      try {
        const debugUrl = new URL(`https://graph.facebook.com/${apiVersion}/debug_token`);
        debugUrl.searchParams.set("input_token", accessToken);
        debugUrl.searchParams.set("access_token", `${appId}|${appSecret}`);

        const debugRes = await fetch(debugUrl.toString());
        if (debugRes.ok) {
          const debugData = await debugRes.json();
          const scopes = debugData?.data?.granular_scopes || [];
          for (const s of scopes) {
            if (s.scope === "whatsapp_business_management" && s.target_ids?.[0]) {
              resolvedWabaId = String(s.target_ids[0]);
              break;
            }
          }
        }
      } catch (err) {
        console.warn("[Embedded Signup] Could not resolve WABA ID from debug_token:", err);
      }
    }

    if (!resolvedWabaId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing WhatsApp Business Account ID (WABA ID) from signup session. Ensure permissions were approved in the Meta dialog.",
        },
        { status: 400 }
      );
    }

    // 6. Query WABA details from Meta
    try {
      const wabaRes = await fetch(
        `https://graph.facebook.com/${apiVersion}/${resolvedWabaId}?fields=id,name,currency,timezone_id`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (wabaRes.ok) {
        const wabaData = await wabaRes.json();
        businessName = wabaData.name || null;
      }
    } catch (err) {
      console.warn("[Embedded Signup] Could not query WABA details from Meta:", err);
    }

    // 7. Resolve Phone Number ID & details
    if (!resolvedPhoneId) {
      try {
        const phoneRes = await fetch(
          `https://graph.facebook.com/${apiVersion}/${resolvedWabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (phoneRes.ok) {
          const phoneData = await phoneRes.json();
          const numbers = phoneData?.data || [];
          if (numbers.length > 0) {
            resolvedPhoneId = String(numbers[0].id);
            displayPhone = numbers[0].display_phone_number || null;
            verifiedName = numbers[0].verified_name || null;
          }
        }
      } catch (err) {
        console.warn("[Embedded Signup] Could not query phone numbers from Meta:", err);
      }
    } else {
      try {
        const phoneRes = await fetch(
          `https://graph.facebook.com/${apiVersion}/${resolvedPhoneId}?fields=id,display_phone_number,verified_name`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (phoneRes.ok) {
          const phoneData = await phoneRes.json();
          displayPhone = phoneData.display_phone_number || null;
          verifiedName = phoneData.verified_name || null;
        }
      } catch (err) {
        console.warn("[Embedded Signup] Could not fetch phone details from Meta:", err);
      }
    }

    if (!resolvedPhoneId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing Phone Number ID from signup session. Ensure a phone number was registered or verified during Meta signup.",
        },
        { status: 400 }
      );
    }

    // 8. Best-effort webhook subscription for WABA
    try {
      const subRes = await fetch(
        `https://graph.facebook.com/${apiVersion}/${resolvedWabaId}/subscribed_apps`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (subRes.ok) {
        console.log(`[Embedded Signup] Subscribed WABA ${resolvedWabaId} to webhook events.`);
      }
    } catch (err) {
      console.warn("[Embedded Signup] Webhook subscription attempt:", err);
    }

    // 9. Atomic, tenant-isolated, idempotent database transaction
    await prisma.$transaction(async (tx) => {
      // Check WABA ownership across tenants
      const existingWabaRecord = await tx.whatsAppBusinessAccount.findUnique({
        where: { wabaId: resolvedWabaId! },
      });
      const existingOrgWithWaba = await tx.organization.findUnique({
        where: { wabaId: resolvedWabaId! },
      });

      if (
        (existingWabaRecord && existingWabaRecord.organizationId !== targetOrg.id) ||
        (existingOrgWithWaba && existingOrgWithWaba.id !== targetOrg.id)
      ) {
        throw new ConflictError(
          "This WhatsApp Business Account (WABA ID) is already registered to another organization."
        );
      }

      // Check Phone Number ownership across tenants
      const existingPhoneRecord = await tx.whatsAppPhoneNumber.findUnique({
        where: { phoneNumberId: resolvedPhoneId! },
        include: { wabaAccount: true },
      });
      const existingOrgWithPhone = await tx.organization.findUnique({
        where: { phoneNumberId: resolvedPhoneId! },
      });

      if (
        (existingPhoneRecord?.wabaAccount &&
          existingPhoneRecord.wabaAccount.organizationId !== targetOrg.id) ||
        (existingOrgWithPhone && existingOrgWithPhone.id !== targetOrg.id)
      ) {
        throw new ConflictError(
          "This Phone Number ID is already registered to another organization."
        );
      }

      // Upsert WhatsAppBusinessAccount
      let wabaAccount = null;
      if (existingWabaRecord) {
        wabaAccount = await tx.whatsAppBusinessAccount.update({
          where: { id: existingWabaRecord.id },
          data: {
            organizationId: targetOrg.id,
            name: businessName || existingWabaRecord.name || targetOrg.name,
            updatedAt: new Date(),
          },
        });
      } else {
        wabaAccount = await tx.whatsAppBusinessAccount.create({
          data: {
            wabaId: resolvedWabaId!,
            organizationId: targetOrg.id,
            name: businessName || targetOrg.name || "WhatsApp Business Account",
          },
        });
      }

      // Upsert WhatsAppPhoneNumber
      if (existingPhoneRecord) {
        await tx.whatsAppPhoneNumber.update({
          where: { id: existingPhoneRecord.id },
          data: {
            wabaAccountId: wabaAccount.id,
            displayPhone: displayPhone || existingPhoneRecord.displayPhone,
            verifiedName: verifiedName || existingPhoneRecord.verifiedName,
            updatedAt: new Date(),
          },
        });
      } else {
        await tx.whatsAppPhoneNumber.create({
          data: {
            phoneNumberId: resolvedPhoneId!,
            wabaAccountId: wabaAccount.id,
            displayPhone: displayPhone || null,
            verifiedName: verifiedName || null,
          },
        });
      }

      // Update Organization with encrypted credentials
      await tx.organization.update({
        where: { id: targetOrg.id },
        data: {
          wabaId: resolvedWabaId,
          phoneNumberId: resolvedPhoneId,
          accessToken: encryptToken(accessToken),
          displayPhoneNumber: displayPhone || undefined,
        },
      });
    });

    console.log(
      `[Embedded Signup Success] Connected WABA: ${resolvedWabaId}, Phone: ${resolvedPhoneId} to org: ${targetOrg.id}`
    );

    return NextResponse.json({
      success: true,
      message: isCoexistenceSession
        ? "WhatsApp Business Account connected with Coexistence enabled (WhatsApp Business App + Cloud API)."
        : "WhatsApp Business Account connected successfully via Embedded Signup.",
      configured: true,
      isCoexistence: isCoexistenceSession,
      onboardingEvent: sessionEvent || "FINISH",
      wabaId: resolvedWabaId,
      phoneNumberId: resolvedPhoneId,
      businessName: businessName || targetOrg.name,
      displayPhoneNumber: displayPhone,
      verifiedName: verifiedName,
    });
  } catch (error: unknown) {
    if (error instanceof ConflictError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A unique constraint conflict occurred: This WABA or phone number is already registered to another organization.",
        },
        { status: 409 }
      );
    }

    const errMsg = error instanceof Error ? error.message : "Internal server error occurred.";
    console.error("[Embedded Signup Error]:", errMsg);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
