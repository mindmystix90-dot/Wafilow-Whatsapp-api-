import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/crypto";

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
 * Resolves Meta WhatsApp Cloud API credentials strictly for the specified organization.
 * Strictly isolates customer credentials: never leaks one tenant's credentials to another.
 * Never leaks access tokens to client-side.
 */
export async function getWhatsAppConfig(organizationId?: string): Promise<WhatsAppConfig> {
  const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || "3356483501181888";
  const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || "";

  if (organizationId) {
    let org = null;
    try {
      org = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          wabaAccounts: {
            include: { phoneNumbers: true },
          },
        },
      });
    } catch (err) {
      console.warn("[WhatsApp Config] DB query error for org:", organizationId, err);
    }

    if (!org) {
      return {
        accessToken: "",
        phoneNumberId: "",
        wabaId: "",
        webhookVerifyToken: "",
        appId,
        appSecret,
        organizationId,
        isConfigured: false,
      };
    }

    // Decrypt access token if stored encrypted
    const rawToken = org.accessToken || "";
    const accessToken = decryptToken(rawToken);
    const phoneNumberId = org.phoneNumberId || "";
    const wabaId = org.wabaId || "";
    const webhookVerifyToken =
      org.webhookVerifyToken ||
      process.env.META_WEBHOOK_VERIFY_TOKEN ||
      "wafilow_webhook_token_secure_9921";
    const isConfigured = Boolean(accessToken && phoneNumberId);

    return {
      accessToken,
      phoneNumberId,
      wabaId,
      webhookVerifyToken,
      appId,
      appSecret,
      organizationId: org.id,
      isConfigured,
    };
  }

  // When no organizationId is supplied (unauthenticated or unattached), do NOT expose any tenant's credentials.
  return {
    accessToken: "",
    phoneNumberId: "",
    wabaId: "",
    webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || "wafilow_webhook_token_secure_9921",
    appId,
    appSecret,
    isConfigured: false,
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
    // 1. Direct match on Organization
    const conditions: Array<Record<string, unknown>> = [];
    if (phoneNumberId) conditions.push({ phoneNumberId });
    if (wabaId) conditions.push({ wabaId });

    if (conditions.length > 0) {
      const existingOrg = await prisma.organization.findFirst({
        where: { OR: conditions },
      });
      if (existingOrg) {
        return { id: existingOrg.id, name: existingOrg.name };
      }
    }

    // 2. Check WABA account or phone number child records
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
        };
      }
    }

    if (wabaId) {
      const wabaRecord = await prisma.whatsAppBusinessAccount.findUnique({
        where: { wabaId },
        include: { organization: true },
      });
      if (wabaRecord?.organization) {
        return {
          id: wabaRecord.organization.id,
          name: wabaRecord.organization.name,
        };
      }
    }
  } catch (err) {
    console.error("[WhatsApp] Error resolving organization for webhook:", err);
  }

  // Not recognized — strictly return null to prevent cross-tenant data leakage
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
 * Sends a real message or template through Meta WhatsApp Cloud API v24.0
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
