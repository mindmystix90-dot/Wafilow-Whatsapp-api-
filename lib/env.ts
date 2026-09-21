/**
 * Server-side environment variable validation and retrieval utility.
 * NEVER imports or exports secrets to client components or the browser.
 */

export interface ServerWhatsAppEnv {
  accessToken?: string;
  phoneNumberId?: string;
  wabaId?: string;
  apiVersion: string;
  verifyToken: string;
  appId?: string;
  appSecret?: string;
  configId?: string;
  isConfigured: boolean;
}

/**
 * Validates that required base server environment variables exist.
 * Does not expose raw secrets in error messages.
 */
export function validateRequiredEnv(key: string, customMessage?: string): string {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    throw new Error(customMessage || `Environment variable ${key} is not configured.`);
  }
  return value.trim();
}

/**
 * Safely resolves WhatsApp Cloud API environment configuration on the server.
 * Supports canonical names as well as Meta legacy prefixes.
 */
export function getServerWhatsAppEnv(): ServerWhatsAppEnv {
  const accessToken =
    process.env.WHATSAPP_ACCESS_TOKEN ||
    process.env.META_ACCESS_TOKEN ||
    undefined;

  const phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    process.env.META_PHONE_NUMBER_ID ||
    undefined;

  const wabaId =
    process.env.WHATSAPP_WABA_ID ||
    process.env.META_WABA_ID ||
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ||
    undefined;

  const apiVersion =
    process.env.META_API_VERSION ||
    "v21.0";

  const verifyToken =
    process.env.META_VERIFY_TOKEN ||
    process.env.META_WEBHOOK_VERIFY_TOKEN ||
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
    "wafilow_webhook_token_secure_9921";

  const appId =
    process.env.META_APP_ID ||
    process.env.FACEBOOK_APP_ID ||
    undefined;

  const appSecret =
    process.env.META_APP_SECRET ||
    process.env.FACEBOOK_APP_SECRET ||
    undefined;

  const configId =
    process.env.META_CONFIG_ID ||
    process.env.META_EMBEDDED_SIGNUP_CONFIG_ID ||
    "293484983375100";

  const isConfigured = Boolean(accessToken && phoneNumberId);

  return {
    accessToken: accessToken?.trim(),
    phoneNumberId: phoneNumberId?.trim(),
    wabaId: wabaId?.trim(),
    apiVersion: apiVersion.trim(),
    verifyToken: verifyToken.trim(),
    appId: appId?.trim() || "3356483501181888",
    appSecret: appSecret?.trim(),
    configId: configId.trim(),
    isConfigured,
  };
}

/**
 * Validates WhatsApp Cloud API readiness for sending or querying.
 * Returns a human-friendly error string if missing, without leaking secrets.
 */
export function validateWhatsAppReady(): { valid: boolean; error?: string } {
  const env = getServerWhatsAppEnv();

  if (!env.phoneNumberId) {
    return {
      valid: false,
      error: "WHATSAPP_PHONE_NUMBER_ID is not configured.",
    };
  }

  if (!env.accessToken) {
    return {
      valid: false,
      error: "WHATSAPP_ACCESS_TOKEN is not configured.",
    };
  }

  return { valid: true };
}

/**
 * Safely masks an access token or secret for display/status reporting.
 */
export function maskSecret(secret?: string | null): string | null {
  if (!secret) return null;
  const str = secret.trim();
  if (str.length <= 8) return "••••••••";
  return `${str.slice(0, 4)}••••${str.slice(-4)}`;
}
