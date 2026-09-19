import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWhatsAppConfig, resolveOrganizationForWebhook } from "@/lib/whatsapp";

/**
 * Meta WhatsApp Webhook Verification (GET)
 * Meta calls this with hub.mode, hub.verify_token, and hub.challenge
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const config = await getWhatsAppConfig();
  const expectedToken = config.webhookVerifyToken;

  if (mode === "subscribe" && token && token === expectedToken) {
    console.log("[Meta Webhook] Successfully verified webhook subscription challenge.");
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.warn("[Meta Webhook] Verification token mismatch. Received:", token, "Expected:", expectedToken);
  return new NextResponse("Forbidden", { status: 403 });
}

interface MetaWebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  button?: { text: string; payload?: string };
  interactive?: {
    button_reply?: { title: string; id: string };
    list_reply?: { title: string; id: string };
  };
  image?: { caption?: string; id?: string };
  audio?: { id?: string };
  document?: { filename?: string; id?: string };
}

interface MetaWebhookStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string; message: string }>;
}

interface MetaWebhookContact {
  profile?: { name: string };
  wa_id: string;
}

interface MetaWebhookChangeValue {
  messaging_product: string;
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: MetaWebhookContact[];
  messages?: MetaWebhookMessage[];
  statuses?: MetaWebhookStatus[];
}

/**
 * Meta WhatsApp Webhook Event Ingestion (POST)
 * Handles incoming messages and message delivery/read/failed statuses.
 * Deduplicates events and isolates organizations.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    if (!rawBody) {
      return NextResponse.json({ status: "empty_payload" }, { status: 200 });
    }

    const body = JSON.parse(rawBody);

    // Meta sends whatsapp_business_account object events
    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ status: "ignored_non_waba_event" }, { status: 200 });
    }

    const entries = body.entry || [];

    for (const entry of entries) {
      const wabaId: string | undefined = entry.id;
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field !== "messages") continue;

        const val: MetaWebhookChangeValue = change.value || {};
        const phoneNumberId = val.metadata?.phone_number_id;

        // 1. Resolve Organization: NEVER attach to arbitrary first organization
        const org = await resolveOrganizationForWebhook(phoneNumberId, wabaId);

        if (!org) {
          console.warn(
            `[Meta Webhook] Received webhook for unconfigured WABA/Phone number (${phoneNumberId} / ${wabaId}). Skipping processing to maintain tenant isolation.`
          );
          continue;
        }

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
                // Tenant check: ensure message belongs to the verified organization
                if (existingMsg.organizationId && existingMsg.organizationId !== org.id) {
                  console.warn(`[Meta Webhook] Tenant isolation violation: status update for message ${wamId} does not belong to Org ${org.id}`);
                  continue;
                }

                await prisma.message.update({
                  where: { id: existingMsg.id },
                  data: {
                    status: newStatus,
                    ...(errorMessage ? { errorMessage } : {}),
                  },
                });
                console.log(`[Meta Webhook] Updated message ${wamId} status to '${newStatus}'`);
              }
            } catch (statusErr) {
              console.error(`[Meta Webhook] Error updating status for message ${wamId}:`, statusErr);
            }
          }
        }

        // 3. Process Incoming WhatsApp Messages
        if (val.messages && Array.isArray(val.messages)) {
          for (const msg of val.messages) {
            const wamId = msg.id;

            // Deduplication: prevent processing duplicate webhook events
            const existingMsg = await prisma.message.findUnique({
              where: { wamId },
            });

            if (existingMsg) {
              console.log(`[Meta Webhook] Duplicate message ${wamId} received. Skipping.`);
              continue;
            }

            const senderPhone = msg.from;
            if (!senderPhone) continue;

            // Resolve contact name from Meta contacts payload
            const contactProfile = val.contacts?.find((c) => c.wa_id === senderPhone);
            const contactName = contactProfile?.profile?.name || `+${senderPhone}`;

            // Identify or create Contact
            let contact;
            try {
              contact = await prisma.contact.upsert({
                where: { phoneNumber: senderPhone },
                update: {
                  name: contactProfile?.profile?.name ? contactProfile.profile.name : undefined,
                  waId: senderPhone,
                  organizationId: org.id,
                  updatedAt: new Date(),
                },
                create: {
                  name: contactName,
                  phoneNumber: senderPhone,
                  waId: senderPhone,
                  status: "active",
                  organizationId: org.id,
                  tags: "WhatsApp Inbound",
                },
              });
            } catch (contactErr) {
              console.error("[Meta Webhook] Error upserting contact:", contactErr);
              continue;
            }

            // Extract message content based on type
            let contentText = "";
            if (msg.type === "text") {
              contentText = msg.text?.body || "";
            } else if (msg.type === "button") {
              contentText = msg.button?.text || "[Button reply]";
            } else if (msg.type === "interactive") {
              contentText =
                msg.interactive?.button_reply?.title ||
                msg.interactive?.list_reply?.title ||
                "[Interactive reply]";
            } else if (msg.type === "image") {
              contentText = msg.image?.caption || "[Image]";
            } else if (msg.type === "audio") {
              contentText = "[Voice / Audio message]";
            } else if (msg.type === "document") {
              contentText = msg.document?.filename || "[Document]";
            } else {
              contentText = `[${msg.type || "WhatsApp message"}]`;
            }

            const msgTimestamp = msg.timestamp
              ? new Date(Number(msg.timestamp) * 1000)
              : new Date();

            try {
              await prisma.message.create({
                data: {
                  contactId: contact.id,
                  organizationId: org.id,
                  wamId,
                  direction: "inbound",
                  content: contentText,
                  type: msg.type || "text",
                  status: "delivered",
                  timestamp: msgTimestamp,
                },
              });

              // Keep Conversation record in sync
              const existingConv = await prisma.conversation.findFirst({
                where: { contactId: contact.id, organizationId: org.id },
              });
              if (existingConv) {
                await prisma.conversation.update({
                  where: { id: existingConv.id },
                  data: { lastMessageAt: msgTimestamp, status: "open" },
                });
              } else {
                await prisma.conversation.create({
                  data: {
                    contactId: contact.id,
                    organizationId: org.id,
                    lastMessageAt: msgTimestamp,
                    status: "open",
                  },
                });
              }

              console.log(
                `[Meta Webhook] Stored inbound message ${wamId} from ${contactName} (${senderPhone}) for Org ${org.name}`
              );
            } catch (saveErr) {
              console.error("[Meta Webhook] Error persisting message:", saveErr);
            }
          }
        }
      }
    }

    // Always acknowledge 200 OK fast to Meta
    return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
  } catch (error) {
    console.error("[Meta Webhook Processing Error]:", error);
    // Returning 200 prevents Meta from disabling the webhook endpoint during transient errors
    return NextResponse.json({ status: "ERROR_LOGGED" }, { status: 200 });
  }
}
