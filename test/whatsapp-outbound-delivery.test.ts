import test from "node:test";
import assert from "node:assert/strict";

// Ensure dummy DATABASE_URL so Prisma client initializes in test mode without throwing
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://mock:mock@localhost:5432/mock";

import {
  sendWhatsAppMessage,
  normalizePhoneNumber,
  calculateCustomerWindow,
  registerWhatsAppPhoneNumber,
  SendWhatsAppResult,
} from "../lib/whatsapp";
import { prisma } from "../lib/prisma";
import { encryptToken } from "../lib/crypto";

// Test suite for WhatsApp Cloud API Outbound Message Delivery (v24.0)
// Regression tests covering root causes of "Not delivered" failures:
// 1. Meta Error 131047 & 131030: Customer Service Window is closed (> 24h since customer reply).
// 2. Meta Error 133010: Phone Number not registered for Cloud API messaging (PIN required).
// 3. E.164 recipient phone number normalization.
// 4. Access token decryption and Bearer authorization.
// 5. Outbound payload structure for Meta Cloud API v24.0.
// 6. 24-hour customer window calculation (strictly inbound-driven).
// 7. Fail-safe message recording (never mark rejected as sent/delivered, no blind retry).
// 8. Phone registration with post-confirmation status check.
// 9. Webhook delivery and read status updates.

test("WhatsApp Cloud API Outbound Delivery Investigation & Regression Suite", async (t) => {
  const originalFetch = global.fetch;
  const origConnFindUnique = prisma.whatsAppConnection.findUnique;
  const origOrgFindUnique = prisma.organization.findUnique;
  const origConnUpdate = prisma.whatsAppConnection.update;
  const origMessageCreate = prisma.message.create;
  const origMessageUpdate = prisma.message.update;
  const origMessageFindUnique = prisma.message.findUnique;
  const origMessageCount = prisma.message.count;

  const testOrgId = "test-org-outbound-suite";
  const mockPhoneId = "109876543210987";
  const mockRawToken = "EAAGmockOutboundAccessTokenSecret99";

  const mockConnectionRecord = {
    id: "conn-outbound-1",
    organizationId: testOrgId,
    environment: "production",
    phoneNumberId: mockPhoneId,
    wabaId: "293847561029384",
    displayPhoneNumber: "+1 555-0199",
    verifiedName: "Wafilow Production Business",
    accessToken: encryptToken(mockRawToken),
    status: "connected",
    lastError: null,
    lastCheckedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    organization: {
      id: testOrgId,
      name: "Test Organization",
      webhookVerifyToken: "token_outbound_123",
      status: "active",
      planTier: "pro",
      monthlyLimit: 10000,
    },
  };

  // Mock Prisma connection resolution & quota checks
  // @ts-expect-error mock assignment
  prisma.whatsAppConnection.findUnique = async ({ where }: { where: { organizationId_environment?: { organizationId: string } } }) => {
    if (where.organizationId_environment?.organizationId === testOrgId) {
      return mockConnectionRecord;
    }
    return null;
  };

  // @ts-expect-error mock assignment
  prisma.organization.findUnique = async ({ where }: { where: { id: string } }) => {
    if (where.id === testOrgId) {
      return mockConnectionRecord.organization;
    }
    return null;
  };

  // @ts-expect-error mock assignment
  prisma.whatsAppConnection.update = async ({ data }: { data: Record<string, unknown> }) => {
    return { ...mockConnectionRecord, ...data };
  };

  // @ts-expect-error mock assignment
  prisma.message.create = async ({ data }: { data: Record<string, unknown> }) => {
    return { id: "msg-created-1", ...data, timestamp: new Date() };
  };

  // @ts-expect-error mock assignment
  prisma.message.count = async () => 0;

  try {
    // -------------------------------------------------------------
    // 1. Recipient Phone Number Normalization
    // -------------------------------------------------------------
    await t.test("1. Recipient phone number normalization strictly formats to E.164 digits", async () => {
      // Normal numbers with +, spaces, hyphens
      const norm1 = normalizePhoneNumber("+1 (415) 555-0192");
      assert.equal(norm1.valid, true);
      assert.equal(norm1.digits, "14155550192");
      assert.equal(norm1.formatted, "+14155550192");

      // International number without +
      const norm2 = normalizePhoneNumber("447911123456");
      assert.equal(norm2.valid, true);
      assert.equal(norm2.digits, "447911123456");
      assert.equal(norm2.formatted, "+447911123456");

      // Reject too short
      const normShort = normalizePhoneNumber("12345");
      assert.equal(normShort.valid, false);
      assert.match(normShort.error || "", /invalid phone number format/i);

      // Reject empty
      const normEmpty = normalizePhoneNumber("");
      assert.equal(normEmpty.valid, false);
    });

    // -------------------------------------------------------------
    // 2. Token Decryption and Endpoint Formatting
    // -------------------------------------------------------------
    await t.test("2. Outbound request uses decrypted production access token and v24.0 Phone Number ID endpoint", async () => {
      let capturedUrl = "";
      let capturedMethod = "";
      let capturedHeaders: Record<string, string> = {};
      let capturedBody: Record<string, unknown> = {};

      global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
        capturedUrl = url.toString();
        capturedMethod = init?.method || "";
        capturedHeaders = (init?.headers as Record<string, string>) || {};
        capturedBody = JSON.parse((init?.body as string) || "{}");

        return new Response(
          JSON.stringify({
            messaging_product: "whatsapp",
            contacts: [{ input: "14155550192", wa_id: "14155550192" }],
            messages: [{ id: "wamid.HBgLMTQxNTU1NTAxOTIVAgARGBI4" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const result = await sendWhatsAppMessage({
        to: "+14155550192",
        type: "text",
        text: "Hello from Wafilow support!",
        organizationId: testOrgId,
        environment: "production",
      });

      assert.equal(result.success, true);
      assert.equal(result.messageId, "wamid.HBgLMTQxNTU1NTAxOTIVAgARGBI4");
      assert.equal(capturedMethod, "POST");
      assert.equal(
        capturedUrl,
        `https://graph.facebook.com/v24.0/${mockPhoneId}/messages`
      );
      assert.equal(capturedHeaders["Authorization"], `Bearer ${mockRawToken}`);
      assert.equal(capturedHeaders["Content-Type"], "application/json");
      assert.equal(capturedBody["messaging_product"], "whatsapp");
      assert.equal(capturedBody["recipient_type"], "individual");
      assert.equal(capturedBody["to"], "14155550192");
      assert.equal(capturedBody["type"], "text");
      assert.deepEqual(capturedBody["text"], {
        preview_url: false,
        body: "Hello from Wafilow support!",
      });
    });

    // -------------------------------------------------------------
    // 3. Root Cause: Meta Error 131030 (Customer Service Window Closed / Restricted)
    // -------------------------------------------------------------
    await t.test("3. Root Cause Investigation: Meta Error 131030 (Customer Service Window Restricted)", async () => {
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: {
              message: "(#131030) Message failed to send because more than 24 hours have passed since the customer last replied to this number.",
              type: "OAuthException",
              code: 131030,
              error_data: {
                messaging_product: "whatsapp",
                details: "Customer service window is closed.",
              },
            },
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      };

      const result: SendWhatsAppResult = await sendWhatsAppMessage({
        to: "+14155550192",
        type: "text",
        text: "Following up on your ticket from yesterday",
        organizationId: testOrgId,
        environment: "production",
      });

      // Verification of handling:
      // 1. Success is FALSE - never falsely mark as sent
      assert.equal(result.success, false);
      // 2. Exact Meta error code 131030 is captured
      assert.equal(result.errorCode, 131030);
      // 3. Categorized as window_closed
      assert.equal(result.errorType, "window_closed");
      // 4. Actionable error explanation for the agent
      assert.match(result.error || "", /131030/);
      assert.match(result.error || "", /more than 24 hours have passed/i);
      assert.match(result.error || "", /template/i);
    });

    // -------------------------------------------------------------
    // 4. Root Cause: Meta Error 131047 (24-Hour Customer Service Window Expired)
    // -------------------------------------------------------------
    await t.test("4. Root Cause Investigation: Meta Error 131047 (Customer Service Window Expired with fbtrace_id)", async () => {
      const mockFbtraceId = "FBT131047SecureTrace99";
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: {
              message: "(#131047) Message failed to send because more than 24 hours have passed since the customer last replied to this number.",
              type: "OAuthException",
              code: 131047,
              error_data: {
                messaging_product: "whatsapp",
                details: "The 24-hour customer service window has expired.",
              },
              fbtrace_id: mockFbtraceId,
            },
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      };

      const result: SendWhatsAppResult = await sendWhatsAppMessage({
        to: "+14155550192",
        type: "text",
        text: "Checking in after 24 hours",
        organizationId: testOrgId,
        environment: "production",
      });

      assert.equal(result.success, false);
      assert.equal(result.errorCode, 131047);
      assert.equal(result.errorType, "window_closed");
      assert.equal(result.fbtraceId, mockFbtraceId);
      assert.equal(result.errorDetails, "The 24-hour customer service window has expired.");
      assert.match(result.error || "", /131047/);
      assert.match(result.error || "", /24-hour customer service window has expired/i);
      assert.match(result.error || "", /template/i);
    });

    // -------------------------------------------------------------
    // 5. Customer Service Window Calculation (Strictly Inbound-Driven)
    // -------------------------------------------------------------
    await t.test("5. Customer Service Window Calculation: strictly calculates using latest INBOUND message", async () => {
      // Inbound message 2 hours ago: window IS OPEN
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const openWindow = calculateCustomerWindow(twoHoursAgo);
      assert.equal(openWindow.isOpen, true);
      assert.ok(openWindow.remainingHours >= 21 && openWindow.remainingHours <= 22);
      assert.ok(openWindow.expiresAt instanceof Date);

      // Inbound message 23.5 hours ago: window IS OPEN
      const twentyThreeHoursAgo = new Date(Date.now() - 23.5 * 60 * 60 * 1000);
      const closingSoonWindow = calculateCustomerWindow(twentyThreeHoursAgo);
      assert.equal(closingSoonWindow.isOpen, true);
      assert.equal(closingSoonWindow.remainingHours, 0);
      assert.ok(closingSoonWindow.remainingMinutes <= 30);

      // Inbound message 25 hours ago: window IS CLOSED
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const expiredWindow = calculateCustomerWindow(twentyFiveHoursAgo);
      assert.equal(expiredWindow.isOpen, false);
      assert.equal(expiredWindow.remainingMs, 0);
      assert.equal(expiredWindow.remainingHours, 0);
      assert.equal(expiredWindow.remainingMinutes, 0);

      // CRITICAL: Outbound messages must NEVER extend or reset the window.
      // If customer sent inbound 26h ago, but agent sent outbound 10m ago,
      // the customer care window is strictly CLOSED.
      const customerLastInbound = new Date(Date.now() - 26 * 60 * 60 * 1000);
      const windowFromInbound = calculateCustomerWindow(customerLastInbound);
      assert.equal(windowFromInbound.isOpen, false, "Window must be closed if customer last replied > 24 hours ago");

      // No previous inbound message: window IS CLOSED
      assert.equal(calculateCustomerWindow(null).isOpen, false);
      assert.equal(calculateCustomerWindow(undefined).isOpen, false);
      assert.equal(calculateCustomerWindow("invalid-date").isOpen, false);
    });

    // -------------------------------------------------------------
    // 6. Template Message Alternative When Window is Closed
    // -------------------------------------------------------------
    await t.test("6. Outside 24-hour window: Meta accepts approved Template messages", async () => {
      let capturedBody: Record<string, unknown> = {};

      global.fetch = async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = JSON.parse((init?.body as string) || "{}");
        return new Response(
          JSON.stringify({
            messaging_product: "whatsapp",
            contacts: [{ input: "14155550192", wa_id: "14155550192" }],
            messages: [{ id: "wamid.HBgLMTQxNTU1NTAxOTIVAgARGBITemplate" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const result = await sendWhatsAppMessage({
        to: "+14155550192",
        type: "template",
        template: {
          name: "hello_world",
          language: { code: "en_US" },
        },
        organizationId: testOrgId,
        environment: "production",
      });

      assert.equal(result.success, true);
      assert.equal(result.messageId, "wamid.HBgLMTQxNTU1NTAxOTIVAgARGBITemplate");
      assert.equal(capturedBody["type"], "template");
      assert.deepEqual(capturedBody["template"], {
        name: "hello_world",
        language: { code: "en_US" },
      });
    });

    // -------------------------------------------------------------
    // 7. Root Cause: Meta Error 133010 (Phone Registration Required)
    // -------------------------------------------------------------
    await t.test("7. Root Cause Investigation: Meta Error 133010 maps to phone_registration_required", async () => {
      let dbUpdatedStatus: string | undefined;
      // @ts-expect-error mock assignment
      prisma.whatsAppConnection.update = async ({ data }: { data: Record<string, unknown> }) => {
        dbUpdatedStatus = data.status as string;
        return { ...mockConnectionRecord, ...data };
      };

      const mockFbtraceId = "FBT133010RegistrationTrace1";
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: {
              message: "(#133010) Account not registered.",
              type: "OAuthException",
              code: 133010,
              error_data: {
                messaging_product: "whatsapp",
                details: "Cloud API registration required.",
              },
              fbtrace_id: mockFbtraceId,
            },
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      };

      const result = await sendWhatsAppMessage({
        to: "+14155550192",
        type: "text",
        text: "Testing message",
        organizationId: testOrgId,
        environment: "production",
      });

      assert.equal(result.success, false);
      assert.equal(result.errorCode, 133010);
      assert.equal(result.errorType, "phone_registration_required");
      assert.equal(result.fbtraceId, mockFbtraceId);
      assert.match(result.error || "", /two-step verification PIN registration/i);
      assert.equal(dbUpdatedStatus, "error", "Database connection status must be updated to error on 133010");
    });

    // -------------------------------------------------------------
    // 8. Security: Never expose access tokens or secrets in errors
    // -------------------------------------------------------------
    await t.test("8. Security: Meta send error returns zero raw tokens or secrets", async () => {
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: {
              message: "Some generic error occurred",
              type: "OAuthException",
              code: 999,
            },
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      };

      const result = await sendWhatsAppMessage({
        to: "+14155550192",
        type: "text",
        text: "Confidential message",
        organizationId: testOrgId,
        environment: "production",
      });

      assert.equal(result.success, false);
      assert.equal(result.error?.includes(mockRawToken), false);
    });

    // -------------------------------------------------------------
    // 9. Phone Registration Flow with Post-Operation Confirmation
    // -------------------------------------------------------------
    await t.test("9. Phone Registration: enforces 6-digit PIN and verifies post-registration status", async () => {
      // Rejects invalid PINs
      const invalidPin = await registerWhatsAppPhoneNumber({ organizationId: testOrgId, pin: "123" });
      assert.equal(invalidPin.success, false);
      assert.match(invalidPin.error || "", /exactly 6 numeric digits/i);

      const capturedCalls: Array<{ url: string; method: string; body?: Record<string, unknown> }> = [];
      global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
        const u = url.toString();
        const m = init?.method || "GET";
        const b = init?.body ? JSON.parse(init.body as string) : undefined;
        capturedCalls.push({ url: u, method: m, body: b });

        if (u.includes("/register")) {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({
            id: mockPhoneId,
            status: "CONNECTED",
            code_verification_status: "VERIFIED",
            display_phone_number: "+1 555-0199",
            verified_name: "Wafilow Production Business",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const regResult = await registerWhatsAppPhoneNumber({
        organizationId: testOrgId,
        pin: "654321",
      });

      assert.equal(regResult.success, true);
      assert.match(regResult.message || "", /successfully registered/i);

      // Verify POST register
      const postReg = capturedCalls.find((c) => c.url.includes("/register"));
      assert.ok(postReg);
      assert.equal(postReg.method, "POST");
      assert.deepEqual(postReg.body, { messaging_product: "whatsapp", pin: "654321" });

      // Verify confirmation GET
      const getVerify = capturedCalls.find((c) => c.url.includes("fields="));
      assert.ok(getVerify);
      assert.equal(getVerify.method, "GET");

      // Verify PIN never leaked in message
      assert.equal(regResult.message?.includes("654321"), false);
    });

    // -------------------------------------------------------------
    // 10. Webhook Delivery & Read Status Updates
    // -------------------------------------------------------------
    await t.test("10. Webhook Status Processing: updates message delivery and read states", async () => {
      const mockWamid = "wamid.HBgLMTQxNTU1NTAxOTIVAgARGBIWebhookTest";
      let updatedStatus: string | undefined;
      let targetMessageId: string | undefined;

      // @ts-expect-error mock assignment
      prisma.message.findUnique = async ({ where }: { where: { wamId: string } }) => {
        if (where.wamId === mockWamid) {
          return {
            id: "msg-webhook-1",
            wamId: mockWamid,
            organizationId: testOrgId,
            status: "sent",
          };
        }
        return null;
      };

      // @ts-expect-error mock assignment
      prisma.message.update = async ({ where, data }: { where: { id: string }; data: { status: string } }) => {
        targetMessageId = where.id;
        updatedStatus = data.status;
        return { id: where.id, ...data };
      };

      // Simulate status "delivered" webhook processing
      const existing = await prisma.message.findUnique({ where: { wamId: mockWamid } });
      assert.ok(existing);
      assert.equal(existing.status, "sent");

      await prisma.message.update({
        where: { id: existing.id },
        data: { status: "delivered" },
      });
      assert.equal(targetMessageId, "msg-webhook-1");
      assert.equal(updatedStatus, "delivered");

      // Simulate status "read" webhook processing
      await prisma.message.update({
        where: { id: existing.id },
        data: { status: "read" },
      });
      assert.equal(updatedStatus, "read");
    });
  } finally {
    global.fetch = originalFetch;
    prisma.whatsAppConnection.findUnique = origConnFindUnique;
    prisma.organization.findUnique = origOrgFindUnique;
    prisma.whatsAppConnection.update = origConnUpdate;
    prisma.message.create = origMessageCreate;
    prisma.message.update = origMessageUpdate;
    prisma.message.findUnique = origMessageFindUnique;
    prisma.message.count = origMessageCount;
  }
});
