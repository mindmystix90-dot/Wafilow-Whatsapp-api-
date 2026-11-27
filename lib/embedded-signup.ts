/**
 * Shared Meta WhatsApp Embedded Signup v5 + v4 Payload Parser
 *
 * Pure, isomorphic utility usable in both client SDK listeners and server API routes.
 * Parses v5 fields (messaging_account_ids, primary_waac_ids, is_on_biz_app) while
 * preserving v4 fallback fields (waba_id, phone_number_id).
 *
 * Security invariant: Coexistence mode is strictly derived from verified
 * WA_EMBEDDED_SIGNUP session payload fields—never from a standalone client boolean.
 */

export interface ParsedEmbeddedSignupSession {
  isVerifiedMetaPayload: boolean;
  event?: string;
  wabaId?: string;
  phoneNumberId?: string;
  primaryWaacId?: string;
  businessId?: string;
  messagingAccountIds: string[];
  primaryWaacIds: string[];
  isOnBizApp: boolean;
  isCoexistenceSession: boolean;
}

function extractIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const results: string[] = [];
  for (const item of raw) {
    if (typeof item === "string" || typeof item === "number") {
      const cleaned = String(item).trim();
      if (cleaned) results.push(cleaned);
    } else if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      const candidate =
        obj.id ?? obj.waba_id ?? obj.wabaId ?? obj.phone_number_id ?? obj.phoneNumberId;
      if (typeof candidate === "string" || typeof candidate === "number") {
        const cleaned = String(candidate).trim();
        if (cleaned) results.push(cleaned);
      }
    }
  }
  return results;
}

function toCleanString(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") {
    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

/**
 * Parses a Meta WA_EMBEDDED_SIGNUP postMessage payload (v5 or v4) into normalized identifiers
 * and strictly verified Coexistence state.
 */
export function parseEmbeddedSignupSession(
  rawSessionInfo: unknown,
  fallbackClientEvent?: string
): ParsedEmbeddedSignupSession {
  const payload =
    rawSessionInfo && typeof rawSessionInfo === "object" && !Array.isArray(rawSessionInfo)
      ? (rawSessionInfo as Record<string, unknown>)
      : null;

  const data =
    payload?.data && typeof payload.data === "object" && !Array.isArray(payload.data)
      ? (payload.data as Record<string, unknown>)
      : {};

  const isVerifiedMetaPayload = payload?.type === "WA_EMBEDDED_SIGNUP";

  const payloadEvent = toCleanString(payload?.event);
  const event = payloadEvent || toCleanString(fallbackClientEvent);
  const currentStep = toCleanString(payload?.current_step) || toCleanString(data.current_step);

  // Embedded Signup v5 arrays:
  // - messaging_account_ids: Messaging Account IDs (maps to WABA ID)
  // - primary_waac_ids: Primary WhatsApp Account (WAAC) IDs (distinct from phone_number_id)
  const messagingAccountIds = extractIdList(
    data.messaging_account_ids ?? payload?.messaging_account_ids
  );
  const primaryWaacIds = extractIdList(
    data.primary_waac_ids ?? payload?.primary_waac_ids
  );

  // Explicit WABA ID (v4 scalar fallback)
  const v4WabaId =
    toCleanString(data.waba_id) ||
    toCleanString(data.wabaId) ||
    toCleanString(payload?.waba_id) ||
    toCleanString(payload?.wabaId);

  // Explicit Phone Number ID (returned in both v4 and v5 payloads when present)
  const explicitPhoneNumberId =
    toCleanString(data.phone_number_id) ||
    toCleanString(data.phoneNumberId) ||
    toCleanString(payload?.phone_number_id) ||
    toCleanString(payload?.phoneNumberId);

  const businessId =
    toCleanString(data.business_id) ||
    toCleanString(data.businessId) ||
    toCleanString(payload?.business_id);

  // Prefer explicit v5 messaging_account_ids[0], falling back to v4 waba_id
  const wabaId = messagingAccountIds[0] || v4WabaId;

  // Preserve Primary WAAC ID separately; never conflate it with phone_number_id
  const primaryWaacId = primaryWaacIds[0];

  // Resolve phoneNumberId strictly from explicit phone_number_id only
  const phoneNumberId = explicitPhoneNumberId;

  // Strict Coexistence detection from verified Meta session payload ONLY
  const rawBizAppFlag = data.is_on_biz_app ?? payload?.is_on_biz_app;
  const isOnBizApp = isVerifiedMetaPayload && rawBizAppFlag === true;

  const isCoexistenceEvent =
    payloadEvent === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING" ||
    currentStep?.toLowerCase() === "finish_whatsapp_business_app_onboarding";

  const isCoexistenceSession = isVerifiedMetaPayload && (isOnBizApp || isCoexistenceEvent);

  return {
    isVerifiedMetaPayload,
    event,
    wabaId,
    phoneNumberId,
    primaryWaacId,
    businessId,
    messagingAccountIds,
    primaryWaacIds,
    isOnBizApp,
    isCoexistenceSession,
  };
}
