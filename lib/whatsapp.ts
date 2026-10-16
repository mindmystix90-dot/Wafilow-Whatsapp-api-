import { prisma } from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/lib/crypto";

export type WhatsAppEnvironment = "production" | "sandbox";

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
  displayPhoneNumber?: string | null;
  verifiedName?: string | null;
  webhookVerifyToken: string;
  appId?: string;
  appSecret?: string;
  organizationId?: string;
  environment: WhatsAppEnvironment;
  status: string; // "connected" | "disconnected" | "error"
  lastCheckedAt?: Date | null;
  lastError?: string | null;
  isConfigured: boolean;
}

/**
 * Validates environment parameter strictly.
 * Rejects invalid or ambiguous environment strings.
 */
export function validateEnvironment(env?: string | null): WhatsAppEnvironment {
  if (!env || env === "production") return "production";
  if (env === "sandbox") return "sandbox";
  throw new Error(`Invalid WhatsApp environment: '${env}'. Expected 'production' or 'sandbox'.`);
}

/**
 * Normalizes phone numbers to standard E.164 digits without '+'
 * Meta Cloud API requires digits only (e.g. 14155550192)
 */
export function normalizePhoneNumber(raw: string): { valid: boolean; digits: string; formatted: string; error?: string } {
  if (!raw || typeof raw !== "string") {
    return { valid: false, digits: "", formatted: "", error: "Phone number is required." };
  }

  // Strip all non-digit characters
  const digits = raw.replace(/\D/g, "");

  // International standard E.164 allows 7 to 15 digits
  if (digits.length < 7 || digits.length > 15) {
    return {
      valid: false,
      digits,
      formatted: `+${digits}`,
      error: `Invalid phone number format (${digits.length} digits). Standard international numbers must contain 7 to 15 digits.`,
    };
  }

  return {
    valid: true,
    digits,
    formatted: `+${digits}`,
  };
}

/**
 * Resolves Meta WhatsApp Cloud API credentials strictly for the specified organization and environment.
 * NEVER falls back from sandbox to production, or production to sandbox.
 * Strictly isolates customer credentials: never leaks one tenant's credentials to another.
 * Never leaks access tokens to client-side.
 */
export async function getWhatsAppConnection(
  organizationId?: string,
  envInput: string = "production"
): Promise<WhatsAppConfig> {
  const environment = validateEnvironment(envInput);
  const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || "3356483501181888";
  const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || "";
  const defaultWebhookVerifyToken =
    process.env.META_WEBHOOK_VERIFY_TOKEN || "wafilow_webhook_token_secure_9921";

  if (!organizationId) {
    return {
      accessToken: "",
      phoneNumberId: "",
      wabaId: "",
      displayPhoneNumber: null,
      verifiedName: null,
      webhookVerifyToken: defaultWebhookVerifyToken,
      appId,
      appSecret,
      environment,
      status: "disconnected",
      isConfigured: false,
    };
  }

  try {
    // 1. Try to find the explicit WhatsAppConnection model record for this environment
    const connection = await prisma.whatsAppConnection.findUnique({
      where: {
        organizationId_environment: {
          organizationId,
          environment,
        },
      },
      include: {
        organization: true,
      },
    });

    if (connection) {
      const accessToken = decryptToken(connection.accessToken || "");
      const isConfigured = Boolean(accessToken && connection.phoneNumberId);
      return {
        accessToken,
        phoneNumberId: connection.phoneNumberId || "",
        wabaId: connection.wabaId || "",
        displayPhoneNumber: connection.displayPhoneNumber || null,
        verifiedName: connection.verifiedName || null,
        webhookVerifyToken: connection.organization?.webhookVerifyToken || defaultWebhookVerifyToken,
        appId,
        appSecret,
        organizationId,
        environment,
        status: connection.status || (isConfigured ? "connected" : "disconnected"),
        lastCheckedAt: connection.lastCheckedAt,
        lastError: connection.lastError,
        isConfigured,
      };
    }

    // 2. Backward compatibility ONLY for "production":
    // If no explicit WhatsAppConnection exists yet for production, check legacy Organization fields.
    if (environment === "production") {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (org) {
        const accessToken = decryptToken(org.accessToken || "");
        const isConfigured = Boolean(accessToken && org.phoneNumberId);

        // Best effort: backfill the WhatsAppConnection record for production
        if (isConfigured && org.phoneNumberId) {
          try {
            await prisma.whatsAppConnection.upsert({
              where: {
                organizationId_environment: {
                  organizationId,
                  environment: "production",
                },
              },
              update: {
                wabaId: org.wabaId,
                phoneNumberId: org.phoneNumberId,
                displayPhoneNumber: org.displayPhoneNumber,
                accessToken: org.accessToken,
                status: "connected",
                lastCheckedAt: new Date(),
              },
              create: {
                organizationId,
                environment: "production",
                wabaId: org.wabaId,
                phoneNumberId: org.phoneNumberId,
                displayPhoneNumber: org.displayPhoneNumber,
                accessToken: org.accessToken,
                status: "connected",
                lastCheckedAt: new Date(),
              },
            });
          } catch (backfillErr) {
            console.warn("[WhatsApp Connection] Non-blocking backfill error:", backfillErr);
          }
        }

        return {
          accessToken,
          phoneNumberId: org.phoneNumberId || "",
          wabaId: org.wabaId || "",
          displayPhoneNumber: org.displayPhoneNumber || null,
          verifiedName: null,
          webhookVerifyToken: org.webhookVerifyToken || defaultWebhookVerifyToken,
          appId,
          appSecret,
          organizationId: org.id,
          environment: "production",
          status: isConfigured ? "connected" : "disconnected",
          isConfigured,
        };
      }
    }

    // For "sandbox", if no record exists, strictly return unconfigured.
    // NEVER fall back to production credentials!
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    return {
      accessToken: "",
      phoneNumberId: "",
      wabaId: "",
      displayPhoneNumber: null,
      verifiedName: null,
      webhookVerifyToken: org?.webhookVerifyToken || defaultWebhookVerifyToken,
      appId,
      appSecret,
      organizationId,
      environment,
      status: "disconnected",
      isConfigured: false,
    };
  } catch (err) {
    console.error("[WhatsApp Config] DB query error for org:", organizationId, err);
    return {
      accessToken: "",
      phoneNumberId: "",
      wabaId: "",
      displayPhoneNumber: null,
      verifiedName: null,
      webhookVerifyToken: defaultWebhookVerifyToken,
      appId,
      appSecret,
      organizationId,
      environment,
      status: "error",
      lastError: err instanceof Error ? err.message : "Database connection issue",
      isConfigured: false,
    };
  }
}

/**
 * Legacy wrapper: retrieves production WhatsApp config.
 */
export async function getWhatsAppConfig(organizationId?: string): Promise<WhatsAppConfig> {
  return getWhatsAppConnection(organizationId, "production");
}

/**
 * Saves WhatsApp connection credentials for a given organization and environment.
 * Ensures production and sandbox credentials never overwrite each other.
 */
export async function saveWhatsAppConnection({
  organizationId,
  environment,
  phoneNumberId,
  wabaId,
  accessToken,
  displayPhoneNumber,
  verifiedName,
  status = "connected",
}: {
  organizationId: string;
  environment: WhatsAppEnvironment;
  phoneNumberId?: string | null;
  wabaId?: string | null;
  accessToken?: string | null;
  displayPhoneNumber?: string | null;
  verifiedName?: string | null;
  status?: string;
}): Promise<WhatsAppConfig> {
  const encryptedToken = accessToken ? encryptToken(accessToken) : undefined;

  // 1. Upsert WhatsAppConnection record
  await prisma.whatsAppConnection.upsert({
    where: {
      organizationId_environment: {
        organizationId,
        environment,
      },
    },
    update: {
      ...(phoneNumberId !== undefined ? { phoneNumberId } : {}),
      ...(wabaId !== undefined ? { wabaId } : {}),
      ...(encryptedToken !== undefined ? { accessToken: encryptedToken } : {}),
      ...(displayPhoneNumber !== undefined ? { displayPhoneNumber } : {}),
      ...(verifiedName !== undefined ? { verifiedName } : {}),
      status,
      lastCheckedAt: new Date(),
      lastError: null,
      updatedAt: new Date(),
    },
    create: {
      organizationId,
      environment,
      phoneNumberId: phoneNumberId || null,
      wabaId: wabaId || null,
      accessToken: encryptedToken || null,
      displayPhoneNumber: displayPhoneNumber || null,
      verifiedName: verifiedName || null,
      status,
      lastCheckedAt: new Date(),
    },
  });

  // 2. If environment is production, keep legacy Organization columns in sync
  if (environment === "production") {
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(phoneNumberId !== undefined && phoneNumberId !== null ? { phoneNumberId } : {}),
        ...(wabaId !== undefined && wabaId !== null ? { wabaId } : {}),
        ...(encryptedToken !== undefined && encryptedToken !== null ? { accessToken: encryptedToken } : {}),
        ...(displayPhoneNumber !== undefined ? { displayPhoneNumber } : {}),
      },
    });
  }

  return getWhatsAppConnection(organizationId, environment);
}

/**
 * Matches an incoming webhook to an organization and environment strictly.
 * NEVER attaches a message to an arbitrary first organization.
 */
export async function resolveOrganizationAndConnectionForWebhook(
  phoneNumberId?: string,
  wabaId?: string
): Promise<{ id: string; name: string; environment: WhatsAppEnvironment } | null> {
  if (!phoneNumberId && !wabaId) {
    return null;
  }

  try {
    // 1. Check WhatsAppConnection table for phone or WABA match
    if (phoneNumberId) {
      const conn = await prisma.whatsAppConnection.findFirst({
        where: { phoneNumberId },
        include: { organization: true },
      });
      if (conn && conn.organization) {
        return {
          id: conn.organization.id,
          name: conn.organization.name,
          environment: conn.environment as WhatsAppEnvironment,
        };
      }
    }

    if (wabaId) {
      const conn = await prisma.whatsAppConnection.findFirst({
        where: { wabaId },
        include: { organization: true },
      });
      if (conn && conn.organization) {
        return {
          id: conn.organization.id,
          name: conn.organization.name,
          environment: conn.environment as WhatsAppEnvironment,
        };
      }
    }

    // 2. Fall back to legacy Organization / WhatsAppPhoneNumber tables (default: production)
    const conditions: Array<Record<string, unknown>> = [];
    if (phoneNumberId) conditions.push({ phoneNumberId });
    if (wabaId) conditions.push({ wabaId });

    if (conditions.length > 0) {
      const existingOrg = await prisma.organization.findFirst({
        where: { OR: conditions },
      });
      if (existingOrg) {
        return { id: existingOrg.id, name: existingOrg.name, environment: "production" };
      }
    }

    if (phoneNumberId) {
      const phoneRecord = await prisma.whatsAppPhoneNumber.findUnique({
        where: { phoneNumberId },
        include: {
          wabaAccount: {
            include: { organization: true },
          },
        },
      });
      if (phoneRecord?.wabaAccount?.organization) {
        return {
          id: phoneRecord.wabaAccount.organization.id,
          name: phoneRecord.wabaAccount.organization.name,
          environment: "production",
        };
      }
    }
  } catch (err) {
    console.error("[WhatsApp] Error resolving organization for webhook:", err);
  }

  return null;
}

export async function resolveOrganizationForWebhook(
  phoneNumberId?: string,
  wabaId?: string
): Promise<{ id: string; name: string } | null> {
  const result = await resolveOrganizationAndConnectionForWebhook(phoneNumberId, wabaId);
  return result ? { id: result.id, name: result.name } : null;
}

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: number;
  errorType?: "registration" | "window_closed" | "token_expired" | "undeliverable" | "permission" | "general" | "sandbox_recipient";
  rawMetaError?: unknown;
  status?: number;
  environment?: WhatsAppEnvironment;
}

/**
 * Diagnostic test for Meta WhatsApp Cloud API credentials.
 * Runs real Graph API verification against phone number and WABA.
 */
export async function testWhatsAppConnectionDiagnostic(
  organizationId: string,
  envInput: string = "production"
): Promise<{
  success: boolean;
  environment: WhatsAppEnvironment;
  phoneStatus?: {
    id: string;
    displayPhoneNumber?: string;
    verifiedName?: string;
    codeVerificationStatus?: string;
    qualityRating?: string;
  };
  wabaStatus?: {
    id: string;
    name?: string;
    currency?: string;
    timezone?: string;
    accountReviewStatus?: string;
  };
  sandboxRestrictions?: string[];
  isRegistered?: boolean;
  registrationRequired?: boolean;
  message?: string;
  error?: string;
  errorCode?: number;
}> {
  const environment = validateEnvironment(envInput);
  const conn = await getWhatsAppConnection(organizationId, environment);

  if (!conn.isConfigured || !conn.phoneNumberId || !conn.accessToken) {
    return {
      success: false,
      environment,
      error: `WhatsApp Cloud API credentials are not configured for ${environment.toUpperCase()} mode. Please enter Phone Number ID and Access Token in Settings.`,
    };
  }

  const apiVersion = "v24.0";
  try {
    // 1. Test Phone Number endpoint
    const phoneRes = await fetch(
      `https://graph.facebook.com/${apiVersion}/${conn.phoneNumberId}?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating`,
      {
        headers: {
          Authorization: `Bearer ${conn.accessToken}`,
        },
      }
    );

    const phoneData = await phoneRes.json();
    if (!phoneRes.ok || phoneData.error) {
      const err = phoneData.error || {};
      const errorMessage =
        err.message || `Failed to verify ${environment} Phone Number ID with Meta Graph API`;
      
      // Update connection error in DB
      try {
        await prisma.whatsAppConnection.update({
          where: {
            organizationId_environment: {
              organizationId,
              environment,
            },
          },
          data: {
            status: "error",
            lastError: errorMessage,
            lastCheckedAt: new Date(),
          },
        });
      } catch {}

      return {
        success: false,
        environment,
        errorCode: err.code,
        error: `Meta API Error (${err.code || phoneRes.status}): ${errorMessage}`,
      };
    }

    // 2. Test WABA endpoint if wabaId provided
    let wabaDetails = undefined;
    if (conn.wabaId) {
      try {
        const wabaRes = await fetch(
          `https://graph.facebook.com/${apiVersion}/${conn.wabaId}?fields=id,name,currency,timezone_id,account_review_status`,
          {
            headers: {
              Authorization: `Bearer ${conn.accessToken}`,
            },
          }
        );
        if (wabaRes.ok) {
          const wabaData = await wabaRes.json();
          wabaDetails = {
            id: wabaData.id,
            name: wabaData.name,
            currency: wabaData.currency,
            timezone: wabaData.timezone_id,
            accountReviewStatus: wabaData.account_review_status,
          };
        }
      } catch (wabaErr) {
        console.warn("[Test Diagnostic] Could not fetch WABA details:", wabaErr);
      }
    }

    // Distinguish "credentials accessible" from "phone registered for Cloud API messaging"
    const isRegistrationRequired = Boolean(
      environment === "production" &&
      (conn.lastError?.includes("133010") ||
       conn.lastError?.toLowerCase().includes("registration required") ||
       conn.lastError?.toLowerCase().includes("account not registered"))
    );

    // Update connection status in DB
    try {
      await prisma.whatsAppConnection.update({
        where: {
          organizationId_environment: {
            organizationId,
            environment,
          },
        },
        data: {
          status: isRegistrationRequired ? "error" : "connected",
          displayPhoneNumber: phoneData.display_phone_number || conn.displayPhoneNumber,
          verifiedName: phoneData.verified_name || conn.verifiedName,
          ...(isRegistrationRequired ? {} : { lastError: null }),
          lastCheckedAt: new Date(),
        },
      });
    } catch {}

    const sandboxRestrictions =
      environment === "sandbox"
        ? [
            "Test Phone Number can only send messages to up to 5 verified recipient numbers registered in Meta Developer Console (WhatsApp -> API Setup -> 'To').",
            "Temporary access tokens generated in the Meta Developer Console expire after 24 hours.",
            "Outside the 24-hour customer window, you must use pre-approved templates (such as 'hello_world').",
            "Meta sandbox does not support broadcasting to unverified production contacts.",
          ]
        : undefined;

    const diagnosticMessage = isRegistrationRequired
      ? "Meta credentials and phone details are accessible, but Cloud API phone registration is required before sending messages. Please complete registration with your 6-digit PIN."
      : `${environment === "sandbox" ? "Meta Sandbox" : "Production"} WhatsApp Cloud API verified successfully.`;

    return {
      success: true,
      environment,
      isRegistered: !isRegistrationRequired,
      registrationRequired: isRegistrationRequired,
      message: diagnosticMessage,
      phoneStatus: {
        id: phoneData.id,
        displayPhoneNumber: phoneData.display_phone_number,
        verifiedName: phoneData.verified_name,
        codeVerificationStatus: phoneData.code_verification_status,
        qualityRating: phoneData.quality_rating,
      },
      wabaStatus: wabaDetails,
      sandboxRestrictions,
    };
  } catch (networkErr: unknown) {
    const errorMsg = networkErr instanceof Error ? networkErr.message : "Network error contacting Meta";
    return {
      success: false,
      environment,
      error: `Network error connecting to Meta Graph API: ${errorMsg}`,
    };
  }
}

/**
 * Sends a real message or template through Meta WhatsApp Cloud API v24.0
 * Strictly uses the specified environment (production or sandbox).
 */
export async function sendWhatsAppMessage({
  to,
  type = "text",
  text,
  template,
  organizationId,
  environment: envInput = "production",
}: {
  to: string;
  type?: "text" | "template";
  text?: string;
  template?: {
    name: string;
    language?: { code: string };
    components?: unknown[];
  };
  organizationId?: string;
  environment?: string;
}): Promise<SendWhatsAppResult> {
  const environment = validateEnvironment(envInput);
  const norm = normalizePhoneNumber(to);
  if (!norm.valid) {
    return {
      success: false,
      error: norm.error,
      environment,
    };
  }

  const config = await getWhatsAppConnection(organizationId, environment);
  if (!config.isConfigured) {
    return {
      success: false,
      error: `Meta WhatsApp Cloud API credentials are not configured for ${environment.toUpperCase()} mode. Please enter Phone Number ID and Access Token in Settings.`,
      environment,
    };
  }

  let payload: Record<string, unknown>;
  if (type === "template") {
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: norm.digits,
      type: "template",
      template: {
        name: template?.name || "hello_world",
        language: {
          code: template?.language?.code || "en_US",
        },
        ...(template?.components ? { components: template.components } : {}),
      },
    };
  } else {
    if (!text || !text.trim()) {
      return {
        success: false,
        error: "Message text cannot be empty.",
        environment,
      };
    }
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: norm.digits,
      type: "text",
      text: {
        preview_url: false,
        body: text.trim(),
      },
    };
  }

  const endpoint = `https://graph.facebook.com/v24.0/${config.phoneNumberId}/messages`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const metaErr = data.error || {};
      const code = typeof metaErr.code === "number" ? metaErr.code : undefined;
      const subcode = metaErr.error_subcode;
      let userFriendlyMessage = metaErr.message || "Failed to send message via Meta Cloud API";
      let errorType: SendWhatsAppResult["errorType"] = "general";

      if (code === 133010) {
        errorType = "registration";
        userFriendlyMessage =
          environment === "sandbox"
            ? "Meta Error (Code 133010): Test Account not registered. For Sandbox, ensure your Meta Test Phone Number ID is copied from App -> WhatsApp -> API Setup."
            : "Meta Error (Code 133010): Account not registered. This WhatsApp phone number has not completed Cloud API registration. Complete two-step verification PIN registration in Settings.";
      } else if (code === 131030) {
        errorType = "window_closed";
        userFriendlyMessage =
          "Meta Error (Code 131030): Customer service window is closed (more than 24 hours have passed since customer last replied). Outside this 24-hour window, you must send an approved Meta WhatsApp Template (e.g. hello_world).";
      } else if (code === 190) {
        errorType = "token_expired";
        userFriendlyMessage =
          environment === "sandbox"
            ? "Meta Error (Code 190): Meta Sandbox Access Token has expired (Developer Console temporary tokens last 24 hours). Generate a fresh token in Meta Developer Console -> WhatsApp -> API Setup."
            : "Meta Error (Code 190): Invalid or expired Meta Access Token. Refresh your Permanent System User Token in Meta Business Manager and update Settings.";
      } else if (code === 131026) {
        errorType = environment === "sandbox" ? "sandbox_recipient" : "undeliverable";
        userFriendlyMessage =
          environment === "sandbox"
            ? `Meta Error (Code 131026): In Meta Sandbox mode, you can only send messages to numbers pre-registered in your Meta Developer Console. Add ${norm.formatted} to the 'To' recipient list in Meta App -> WhatsApp -> API Setup.`
            : "Meta Error (Code 131026): Message undeliverable. The recipient number may not have a WhatsApp account or is unable to receive messages from this business number.";
      } else if (code === 200 || code === 10) {
        errorType = "permission";
        userFriendlyMessage =
          "Meta Error (Code 200/10): Missing permissions. Verify your Meta token has 'whatsapp_business_messaging' and 'whatsapp_business_management' permissions.";
      } else if (code === 131042) {
        errorType = "general";
        userFriendlyMessage =
          "Meta Error (Code 131042): Business account eligibility or payment method issue. Please review your WhatsApp Account status in Meta Business Manager.";
      } else if (code === 100) {
        userFriendlyMessage = `Meta Error (Code 100): Invalid request parameter: ${metaErr.error_data?.details || metaErr.message}`;
      } else if (code === 132000) {
        userFriendlyMessage = `Meta Error (Code 132000): Template does not exist or has not been approved in language ${template?.language?.code || "en_US"}.`;
      }

      console.error(`[WhatsApp Cloud API Send Error (${environment})]:`, {
        status: response.status,
        code,
        subcode,
        errorType,
        message: metaErr.message,
        details: metaErr.error_data?.details,
      });

      // If registration is required, persist error status in DB so UI immediately highlights registration
      if (code === 133010 && organizationId) {
        try {
          await prisma.whatsAppConnection.update({
            where: {
              organizationId_environment: {
                organizationId,
                environment,
              },
            },
            data: {
              status: "error",
              lastError: userFriendlyMessage,
              lastCheckedAt: new Date(),
            },
          });
        } catch {}
      }

      return {
        success: false,
        error: userFriendlyMessage,
        errorCode: code,
        errorType,
        rawMetaError: metaErr,
        status: response.status,
        environment,
      };
    }

    const messageId = data.messages?.[0]?.id;
    return {
      success: true,
      messageId,
      environment,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Network error contacting Meta Cloud API";
    console.error(`[WhatsApp Send Network Exception (${environment})]:`, err);
    return {
      success: false,
      error: `Network error reaching Meta Cloud API: ${errorMsg}`,
      environment,
    };
  }
}

export interface RegisterWhatsAppResult {
  success: boolean;
  message?: string;
  error?: string;
  errorCode?: number;
  errorSubcode?: number;
}

/**
 * Registers a phone number for WhatsApp Cloud API messaging (v24.0).
 * Dispatches POST https://graph.facebook.com/v24.0/{PHONE_NUMBER_ID}/register
 *
 * Strict Security & Safety:
 * - Never logs, persists, caches, or exposes the 6-digit PIN or decrypted access token.
 * - Enforces server-side resolution and validation.
 * - Does not perform automatic retries (protecting the customer from Meta 72-hour lockout).
 * - Updates database connection status only after Meta confirms registration success.
 */
export async function registerWhatsAppPhoneNumber({
  organizationId,
  pin,
}: {
  organizationId: string;
  pin: string;
}): Promise<RegisterWhatsAppResult> {
  const cleanPin = typeof pin === "string" ? pin.trim() : "";
  if (!cleanPin || !/^\d{6}$/.test(cleanPin)) {
    return {
      success: false,
      error: "Two-step verification PIN must be exactly 6 numeric digits.",
    };
  }

  const conn = await getWhatsAppConnection(organizationId, "production");
  if (!conn.isConfigured || !conn.phoneNumberId || !conn.accessToken) {
    return {
      success: false,
      error: "Production WhatsApp connection credentials are not configured. Please connect your account first.",
    };
  }

  const apiVersion = "v24.0";
  const endpoint = `https://graph.facebook.com/${apiVersion}/${conn.phoneNumberId}/register`;

  console.log(`[WhatsApp Register] Submitting Cloud API registration for Phone ID ${conn.phoneNumberId} (Org: ${organizationId})`);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${conn.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        pin: cleanPin,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.error) {
      const metaErr = data.error || {};
      const code = typeof metaErr.code === "number" ? metaErr.code : undefined;
      const subcode = metaErr.error_subcode;
      let userMessage = metaErr.message || "Failed to register phone number with Meta Cloud API.";

      if (code === 133005) {
        userMessage =
          "Two-step verification PIN mismatch. The entered 6-digit PIN does not match the PIN set for this phone number in Meta WhatsApp Manager.";
      } else if (code === 133015) {
        userMessage =
          "Meta rate limit reached. Meta allows a maximum of 10 registration attempts per 72 hours for this phone number. Please wait before trying again.";
      } else if (code === 190) {
        userMessage =
          "Meta Access Token is expired or invalid. Please update your token in WhatsApp Settings before registering.";
      } else if (code === 200 || code === 10) {
        userMessage =
          "Missing Meta permissions. Ensure your token has 'whatsapp_business_messaging' and 'whatsapp_business_management' permissions.";
      } else if (code === 100) {
        userMessage =
          "Invalid request format sent to Meta. Please verify phone number ID and try again.";
      }

      console.error("[WhatsApp Register Error]:", {
        phoneId: conn.phoneNumberId,
        status: response.status,
        code,
        subcode,
        message: metaErr.message,
      });

      return {
        success: false,
        error: userMessage,
        errorCode: code,
        errorSubcode: subcode,
      };
    }

    if (data.success === true) {
      try {
        await prisma.whatsAppConnection.update({
          where: {
            organizationId_environment: {
              organizationId,
              environment: "production",
            },
          },
          data: {
            status: "connected",
            lastError: null,
            lastCheckedAt: new Date(),
          },
        });
      } catch (dbErr) {
        console.warn("[WhatsApp Register] Non-critical DB status update error:", dbErr);
      }

      return {
        success: true,
        message: "WhatsApp phone number successfully registered with Meta Cloud API! You can now send and receive production messages.",
      };
    }

    return {
      success: false,
      error: "Meta did not return a successful registration confirmation.",
    };
  } catch (networkErr: unknown) {
    const errorMsg = networkErr instanceof Error ? networkErr.message : "Network error contacting Meta";
    return {
      success: false,
      error: `Network error connecting to Meta Graph API: ${errorMsg}`,
    };
  }
}

