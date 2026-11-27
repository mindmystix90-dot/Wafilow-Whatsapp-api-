import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveOrganizationAndConnectionForWebhook } from "@/lib/whatsapp";
import crypto from "crypto";

export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret?: string,
  nodeEnv: string | undefined = process.env.NODE_ENV
): boolean {
  if (!appSecret || appSecret.trim() === "") {
    if (nodeEnv === "production") {
      console.error(
        "[Meta Webhook] FATAL: META_APP_SECRET is missing in production. Rejecting webhook request (fail-closed)."
      );
      return false;
    }
    return true; // Pass through if app secret not configured in local/dev environment
  }
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }
  const signature = signatureHeader.substring(7);
  const expectedSignature = crypto
    .createHmac("sha256", appSecret.trim())
    .update(rawBody)
    .digest("hex");
  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expectedSignature, "hex");
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

/**
 * Meta WhatsApp Webhook Verification (GET)
 * Meta calls this with hub.mode, hub.verify_token, and hub.challenge
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const envVerifyToken =
    process.env.META_WEBHOOK_VERIFY_TOKEN ||
    process.env.META_VERIFY_TOKEN ||
    "wafilow_webhook_token_secure_9921";

  let tokenValid = token === envVerifyToken;
  if (!tokenValid && token) {
    const org = await prisma.organization.findFirst({
      where: { webhookVerifyToken: token },
      select: { id: true },
    });
    if (org) tokenValid = true;
  }

  if (mode === "subscribe" && token && tokenValid) {
    console.log("[Meta Webhook] Successfully verified webhook subscription challenge.");
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.warn("[Meta Webhook] Verification token mismatch.");
  return new NextResponse("Forbidden", { status: 403 });
}

interface MetaWebhookMessage {
  from?: string;
  id: string;
  timestamp?: string;
  type?: string;
  recipient_id?: string;
  to?: string;
  text?: { body: string };
  button?: { text: string; payload?: string };
  interactive?: {
    button_reply?: { title: string; id: string };
    list_reply?: { title: string; id: string };
  };
  image?: { id?: string; mime_type?: string; sha256?: string; caption?: string };
  audio?: { id?: string; mime_type?: string };
  video?: { id?: string; caption?: string };
  document?: { id?: string; filename?: string; mime_type?: string };
  history_context?: { status?: string };
}

interface MetaWebhookContact {
  profile?: { name?: string };
  wa_id: string;
}

interface MetaWebhookStatus {
  id: string; // wamId
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string; message?: string }>;
}

interface MetaHistoryThread {
  id?: string;
  messages?: MetaWebhookMessage[];
}

interface MetaHistoryChunk {
  metadata?: { phase?: number; chunk_order?: number; progress?: number };
  threads?: MetaHistoryThread[];
  errors?: Array<{ code?: number; title?: string; message?: string }>;
}

interface MetaAppStateSyncEntry {
  type?: string;
  contact?: {
    full_name?: string;
    first_name?: string;
    phone_number?: string;
    wa_id?: string;
  };
  action?: "add" | "remove" | "edit" | string;
  metadata?: { timestamp?: string };
}

interface MetaWebhookChangeValue {
  messaging_product?: string;
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: MetaWebhookContact[];
  messages?: MetaWebhookMessage[];
  message_echoes?: MetaWebhookMessage[];
  statuses?: MetaWebhookStatus[];
  history?: MetaHistoryChunk[];
  state_sync?: MetaAppStateSyncEntry[];
}

const SUPPORTED_WEBHOOK_FIELDS = new Set([
  "messages",
  "smb_message_echoes",
  "history",
  "smb_app_state_sync",
]);

function extractMessageContent(msg: MetaWebhookMessage): string {
  if (msg.type === "text") {
    return msg.text?.body || "";
  }
  if (msg.type === "button") {
    return msg.button?.text || "[Button reply]";
  }
  if (msg.type === "interactive") {
    return (
      msg.interactive?.button_reply?.title ||
      msg.interactive?.list_reply?.title ||
      "[Interactive reply]"
    );
  }
  if (msg.type === "image") {
    return msg.image?.caption || "[Image]";
  }
  if (msg.type === "video") {
    return msg.video?.caption || "[Video]";
  }
  if (msg.type === "audio") {
    return "[Voice / Audio message]";
  }
  if (msg.type === "document") {
    return msg.document?.filename || "[Document]";
  }
  return `[${msg.type || "WhatsApp message"}]`;
}

function normalizeWaDigits(raw?: string): string {
  if (!raw) return "";
  return raw.replace(/\D/g, "").trim();
}

/**
 * Persists a single normalized message with deduplication and tenant/environment isolation.
 */
async function persistWebhookMessage(params: {
  wamId: string;
  orgId: string;
  orgName: string;
  environment: string;
  targetCustomerPhone: string;
  contactName: string;
  direction: "inbound" | "outbound";
  contentText: string;
  msgType: string;
  status: string;
  msgTimestamp: Date;
  contactTag: string;
}) {
  const {
    wamId,
    orgId,
    orgName,
    environment,
    targetCustomerPhone,
    contactName,
    direction,
    contentText,
    msgType,
    status,
    msgTimestamp,
    contactTag,
  } = params;

  const existingMsg = await prisma.message.findUnique({
    where: { wamId },
    select: { id: true },
  });
  if (existingMsg) {
    return { skipped: true };
  }

  // Respect existing contact ownership to prevent cross-tenant overwrite
  const existingContact = await prisma.contact.findUnique({
    where: { phoneNumber: targetCustomerPhone },
    select: { id: true, organizationId: true, name: true },
  });

  if (existingContact?.organizationId && existingContact.organizationId !== orgId) {
    console.warn(
      `[Meta Webhook] Skipping contact ${targetCustomerPhone} owned by a different organization.`
    );
    return { skipped: true };
  }

  let contact;
  if (existingContact) {
    contact = await prisma.contact.update({
      where: { id: existingContact.id },
      data: {
        name:
          contactName && !contactName.startsWith("+")
            ? contactName
            : existingContact.name,
        waId: targetCustomerPhone,
        organizationId: orgId,
        environment,
        updatedAt: new Date(),
      },
    });
  } else {
    contact = await prisma.contact.create({
      data: {
        name: contactName,
        phoneNumber: targetCustomerPhone,
        waId: targetCustomerPhone,
        status: "active",
        organizationId: orgId,
        environment,
        tags: contactTag,
      },
    });
  }

  await prisma.message.create({
    data: {
      contactId: contact.id,
      organizationId: orgId,
      environment,
      wamId,
      direction,
      content: contentText,
      type: msgType || "text",
      status,
      timestamp: msgTimestamp,
    },
  });

  const existingConv = await prisma.conversation.findFirst({
    where: { contactId: contact.id, organizationId: orgId, environment },
  });

  if (existingConv) {
    const latestTimestamp =
      existingConv.lastMessageAt && existingConv.lastMessageAt > msgTimestamp
        ? existingConv.lastMessageAt
        : msgTimestamp;

    await prisma.conversation.update({
      where: { id: existingConv.id },
      data: { lastMessageAt: latestTimestamp, status: "open" },
    });
  } else {
    await prisma.conversation.create({
      data: {
        contactId: contact.id,
        organizationId: orgId,
        environment,
        lastMessageAt: msgTimestamp,
        status: "open",
      },
    });
  }

  console.log(
    `[Meta Webhook] Stored ${direction} message ${wamId} [${environment.toUpperCase()}] in Org ${orgName}`
  );
  return { skipped: false };
}

/**
 * Meta WhatsApp Webhook Event Ingestion (POST)
 * Handles:
 * - `messages` (inbound customer messages + delivery/read/failed statuses)
 * - `smb_message_echoes` (Coexistence outbound echoes sent from WhatsApp Business App)
 * - `history` (Coexistence chat history sync chunks after onboarding)
 * - `smb_app_state_sync` (Coexistence contact/app state synchronization)
 *
 * Strictly enforces HMAC SHA-256 verification, deduplication, and multi-tenant isolation.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    if (!rawBody) {
      return NextResponse.json({ status: "empty_payload" }, { status: 200 });
    }

    const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
    const signature = req.headers.get("x-hub-signature-256");
    if (!verifyMetaSignature(rawBody, signature, appSecret)) {
      console.warn("[Meta Webhook] Invalid or missing X-Hub-Signature-256 header. Rejecting.");
      return new NextResponse("Unauthorized: Invalid Webhook Signature", { status: 401 });
    }

    const body = JSON.parse(rawBody);

    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ status: "ignored_non_waba_event" }, { status: 200 });
    }

    const entries = body.entry || [];

    for (const entry of entries) {
      const wabaId: string | undefined = entry.id;
      const changes = entry.changes || [];

      for (const change of changes) {
        if (!SUPPORTED_WEBHOOK_FIELDS.has(change.field)) continue;

        const val: MetaWebhookChangeValue = change.value || {};
        const phoneNumberId = val.metadata?.phone_number_id;
        const businessDisplayDigits = normalizeWaDigits(val.metadata?.display_phone_number);

        // 1. Resolve Organization & Environment strictly: NEVER attach to arbitrary first organization
        const resolved = await resolveOrganizationAndConnectionForWebhook(phoneNumberId, wabaId);
        if (!resolved) {
          console.warn(
            `[Meta Webhook] Received ${change.field} webhook for unconfigured WABA/Phone (${phoneNumberId} / ${wabaId}). Skipping to preserve tenant isolation.`
          );
          continue;
        }

        const orgId = resolved.id;
        const environment = resolved.environment;

        // 2. Process Status Updates (sent, delivered, read, failed)
        if (val.statuses && Array.isArray(val.statuses)) {
          for (const statusObj of val.statuses) {
            const wamId = statusObj.id;
            const newStatus = statusObj.status;
            const errorMessage = statusObj.errors?.[0]?.message || statusObj.errors?.[0]?.title;

            try {
              const existingMsg = await prisma.message.findUnique({
                where: { wamId },
              });

              if (existingMsg) {
                if (existingMsg.organizationId && existingMsg.organizationId !== orgId) {
                  console.warn(
                    `[Meta Webhook] Tenant isolation violation: status update for message ${wamId} does not belong to Org ${orgId}`
                  );
                  continue;
                }

                await prisma.message.update({
                  where: { id: existingMsg.id },
                  data: {
                    status: newStatus,
                    ...(errorMessage ? { errorMessage } : {}),
                  },
                });
              }
            } catch (statusErr) {
              console.error(`[Meta Webhook] Error updating status for message ${wamId}:`, statusErr);
            }
          }
        }

        // 3. Process `messages` & `smb_message_echoes`
        if (change.field === "messages" || change.field === "smb_message_echoes") {
          const incomingMessages = val.messages || val.message_echoes || [];
          if (Array.isArray(incomingMessages) && incomingMessages.length > 0) {
            for (const msg of incomingMessages) {
              if (!msg?.id) continue;

              const isEcho = change.field === "smb_message_echoes" || Boolean(msg.recipient_id);
              const rawTargetPhone = isEcho
                ? msg.recipient_id || msg.to || msg.from
                : msg.from;
              const targetCustomerPhone = normalizeWaDigits(rawTargetPhone);
              if (!targetCustomerPhone) continue;

              const contactProfile = val.contacts?.find(
                (c) => normalizeWaDigits(c.wa_id) === targetCustomerPhone
              );
              const contactName = contactProfile?.profile?.name || `+${targetCustomerPhone}`;
              const msgTimestamp = msg.timestamp
                ? new Date(Number(msg.timestamp) * 1000)
                : new Date();

              try {
                await persistWebhookMessage({
                  wamId: msg.id,
                  orgId,
                  orgName: resolved.name,
                  environment,
                  targetCustomerPhone,
                  contactName,
                  direction: isEcho ? "outbound" : "inbound",
                  contentText: extractMessageContent(msg),
                  msgType: msg.type || "text",
                  status: "delivered",
                  msgTimestamp,
                  contactTag:
                    environment === "sandbox"
                      ? "Sandbox Inbound"
                      : isEcho
                      ? "WhatsApp Coexistence Echo"
                      : "WhatsApp Inbound",
                });
              } catch (saveErr) {
                console.error("[Meta Webhook] Error persisting message:", saveErr);
              }
            }
          }
        }

        // 4. Process Coexistence `history` synchronization events
        if (change.field === "history" && Array.isArray(val.history)) {
          for (const chunk of val.history) {
            if (!chunk?.threads || !Array.isArray(chunk.threads)) continue;

            for (const thread of chunk.threads) {
              const threadContactDigits = normalizeWaDigits(thread.id);
              const threadMessages = Array.isArray(thread.messages) ? thread.messages : [];

              for (const msg of threadMessages) {
                if (!msg?.id) continue;

                const fromDigits = normalizeWaDigits(msg.from);
                const toDigits = normalizeWaDigits(msg.to || msg.recipient_id);
                const isOutbound =
                  (Boolean(businessDisplayDigits) && fromDigits === businessDisplayDigits) ||
                  (Boolean(threadContactDigits) &&
                    Boolean(fromDigits) &&
                    fromDigits !== threadContactDigits);

                const targetCustomerPhone =
                  threadContactDigits || (isOutbound ? toDigits : fromDigits);
                if (!targetCustomerPhone) continue;

                const rawStatus = msg.history_context?.status?.toLowerCase();
                const normalizedStatus =
                  rawStatus === "read" || rawStatus === "played"
                    ? "read"
                    : rawStatus === "sent"
                    ? "sent"
                    : rawStatus === "error" || rawStatus === "failed"
                    ? "failed"
                    : "delivered";

                const msgTimestamp = msg.timestamp
                  ? new Date(Number(msg.timestamp) * 1000)
                  : new Date();

                try {
                  await persistWebhookMessage({
                    wamId: msg.id,
                    orgId,
                    orgName: resolved.name,
                    environment,
                    targetCustomerPhone,
                    contactName: `+${targetCustomerPhone}`,
                    direction: isOutbound ? "outbound" : "inbound",
                    contentText: extractMessageContent(msg),
                    msgType: msg.type || "text",
                    status: normalizedStatus,
                    msgTimestamp,
                    contactTag: "WhatsApp History Sync",
                  });
                } catch (historyErr) {
                  console.error("[Meta Webhook] Error persisting history message:", historyErr);
                }
              }
            }
          }
        }

        // 5. Process Coexistence `smb_app_state_sync` contact state events
        if (change.field === "smb_app_state_sync" && Array.isArray(val.state_sync)) {
          for (const syncItem of val.state_sync) {
            if (!syncItem?.contact) continue;
            const phoneDigits = normalizeWaDigits(
              syncItem.contact.phone_number || syncItem.contact.wa_id
            );
            if (!phoneDigits) continue;

            const action = (syncItem.action || "add").toLowerCase();
            const syncedName =
              syncItem.contact.full_name?.trim() ||
              syncItem.contact.first_name?.trim() ||
              `+${phoneDigits}`;

            try {
              const existingContact = await prisma.contact.findUnique({
                where: { phoneNumber: phoneDigits },
                select: { id: true, organizationId: true, name: true },
              });

              if (existingContact?.organizationId && existingContact.organizationId !== orgId) {
                console.warn(
                  `[Meta Webhook] Skipping smb_app_state_sync for contact ${phoneDigits} belonging to another org.`
                );
                continue;
              }

              if (action === "remove") {
                if (existingContact) {
                  await prisma.contact.update({
                    where: { id: existingContact.id },
                    data: { status: "archived", updatedAt: new Date() },
                  });
                }
              } else if (existingContact) {
                await prisma.contact.update({
                  where: { id: existingContact.id },
                  data: {
                    name: syncedName,
                    waId: phoneDigits,
                    status: "active",
                    organizationId: orgId,
                    environment,
                    updatedAt: new Date(),
                  },
                });
              } else {
                await prisma.contact.create({
                  data: {
                    name: syncedName,
                    phoneNumber: phoneDigits,
                    waId: phoneDigits,
                    status: "active",
                    organizationId: orgId,
                    environment,
                    tags: "WhatsApp Business App Sync",
                  },
                });
              }
            } catch (syncErr) {
              console.error("[Meta Webhook] Error processing smb_app_state_sync contact:", syncErr);
            }
          }
        }
      }
    }

    // Always acknowledge 200 OK fast to Meta
    return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
  } catch (error) {
    console.error("[Meta Webhook Processing Error]:", error);
    return NextResponse.json({ status: "ERROR_LOGGED" }, { status: 200 });
  }
}
