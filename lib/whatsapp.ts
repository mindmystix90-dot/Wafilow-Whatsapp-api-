import { prisma } from "@/lib/prisma";

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
  webhookVerifyToken: string;
  appId?: string;
  appSecret?: string;
  organizationId?: string;
  isConfigured: boolean;
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
 * Resolves Meta WhatsApp Cloud API credentials
 * Checks Database organization configuration first, then falls back to server-side environment variables.
 * Never leaks access tokens to client side.
 */
export async function getWhatsAppConfig(organizationId?: string): Promise<WhatsAppConfig> {
  // Check for organization-specific config if organizationId provided or if one exists in DB
  let org = null;
  try {
    if (organizationId) {
      org = await prisma.organization.findUnique({ where: { id: organizationId } });
    } else {
      org = await prisma.organization.findFirst({
        where: {
          accessToken: { not: null },
          phoneNumberId: { not: null },
        },
      });
    }
  } catch (err) {
    console.warn("[WhatsApp Config] DB query error, falling back to env:", err);
  }

  const accessToken =
    org?.accessToken ||
    process.env.META_ACCESS_TOKEN ||
    process.env.WHATSAPP_ACCESS_TOKEN ||
    "";

  const phoneNumberId =
    org?.phoneNumberId ||
    process.env.META_PHONE_NUMBER_ID ||
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    "";

  const wabaId =
    org?.wabaId ||
    process.env.META_WABA_ID ||
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ||
    "";

  const webhookVerifyToken =
    org?.webhookVerifyToken ||
    process.env.META_WEBHOOK_VERIFY_TOKEN ||
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
    "wafilow_webhook_token_secure_9921";

  const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || "";
  const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || "";

  const isConfigured = Boolean(accessToken && phoneNumberId);

  return {
    accessToken,
    phoneNumberId,
    wabaId,
    webhookVerifyToken,
    appId,
    appSecret,
    organizationId: org?.id,
    isConfigured,
  };
}

/**
 * Matches an incoming webhook to an organization strictly.
 * NEVER attaches a message to an arbitrary first organization.
 */
export async function resolveOrganizationForWebhook(
  phoneNumberId?: string,
  wabaId?: string
): Promise<{ id: string; name: string } | null> {
  if (!phoneNumberId && !wabaId) {
    return null;
  }

  try {
    // 1. Check exact match in database by phoneNumberId or wabaId
    const existingOrg = await prisma.organization.findFirst({
      where: {
        OR: [
          phoneNumberId ? { phoneNumberId } : {},
          wabaId ? { wabaId } : {},
        ].filter((cond) => Object.keys(cond).length > 0),
      },
    });

    if (existingOrg) {
      return { id: existingOrg.id, name: existingOrg.name };
    }

    // 2. Check if it matches the configured environment variables
    const envPhoneNumberId = process.env.META_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const envWabaId = process.env.META_WABA_ID || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

    const matchesEnv =
      (phoneNumberId && envPhoneNumberId && phoneNumberId === envPhoneNumberId) ||
      (wabaId && envWabaId && wabaId === envWabaId);

    if (matchesEnv) {
      // Upsert default organization for this verified environment credentials
      const createdOrg = await prisma.organization.upsert({
        where: { phoneNumberId: phoneNumberId || envPhoneNumberId || "default_phone" },
        update: {
          wabaId: wabaId || envWabaId,
          phoneNumberId: phoneNumberId || envPhoneNumberId,
        },
        create: {
          name: "Primary WhatsApp Business",
          phoneNumberId: phoneNumberId || envPhoneNumberId,
          wabaId: wabaId || envWabaId,
          webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || "wafilow_webhook_token_secure_9921",
        },
      });
      return { id: createdOrg.id, name: createdOrg.name };
    }
  } catch (err) {
    console.error("[WhatsApp] Error resolving organization for webhook:", err);
  }

  // Not recognized — do NOT attach to arbitrary organization
  return null;
}

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  rawMetaError?: unknown;
  status?: number;
}

/**
 * Sends a real message or template through Meta WhatsApp Cloud API v21.0
 */
export async function sendWhatsAppMessage({
  to,
  type = "text",
  text,
  template,
  organizationId,
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
}): Promise<SendWhatsAppResult> {
  const norm = normalizePhoneNumber(to);
  if (!norm.valid) {
    return {
      success: false,
      error: norm.error,
    };
  }

  const config = await getWhatsAppConfig(organizationId);

  if (!config.isConfigured) {
    return {
      success: false,
      error:
        "Meta WhatsApp Cloud API credentials are not configured. Please supply META_PHONE_NUMBER_ID and META_ACCESS_TOKEN in server environment or Settings.",
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

  const endpoint = `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`;

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
      const code = metaErr.code;
      const subcode = metaErr.error_subcode;
      let userFriendlyMessage = metaErr.message || "Failed to send message via Meta Cloud API";

      if (code === 131030) {
        userFriendlyMessage =
          "Meta Error (Code 131030): Customer service window is closed (more than 24 hours have passed since customer last replied). Outside this 24-hour window, you must send an approved Meta WhatsApp Template (e.g. hello_world).";
      } else if (code === 190) {
        userFriendlyMessage =
          "Meta Error (Code 190): Invalid or expired Meta Access Token. Please refresh your Permanent System User Token in Meta Business Manager and update Settings.";
      } else if (code === 131026) {
        userFriendlyMessage =
          "Meta Error (Code 131026): Message undeliverable. The recipient number may not have a WhatsApp account or is unable to receive messages from this business number.";
      } else if (code === 100) {
        userFriendlyMessage = `Meta Error (Code 100): Invalid request parameter: ${metaErr.error_data?.details || metaErr.message}`;
      } else if (code === 132000) {
        userFriendlyMessage = `Meta Error (Code 132000): Template does not exist or has not been approved in language ${template?.language?.code || "en_US"}.`;
      }

      console.error("[WhatsApp Cloud API Send Error]:", {
        status: response.status,
        code,
        subcode,
        message: metaErr.message,
        details: metaErr.error_data?.details,
      });

      return {
        success: false,
        error: userFriendlyMessage,
        rawMetaError: metaErr,
        status: response.status,
      };
    }

    const messageId = data.messages?.[0]?.id;
    return {
      success: true,
      messageId,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Network error contacting Meta Cloud API";
    console.error("[WhatsApp Send Network Exception]:", err);
    return {
      success: false,
      error: `Network error reaching Meta Cloud API: ${errorMsg}`,
    };
  }
}
