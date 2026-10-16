import test from "node:test";
import assert from "node:assert/strict";

// Ensure dummy DATABASE_URL so Prisma client initializes in test mode without throwing
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://mock:mock@localhost:5432/mock";

import { registerWhatsAppPhoneNumber } from "../lib/whatsapp";
import { prisma } from "../lib/prisma";
import { encryptToken } from "../lib/crypto";

// Test suite for WhatsApp Cloud API Phone Number Registration (v24.0)
// Guarantees: Zero real live Meta calls, zero real PINs, strict tenant isolation.

test("1. PIN Validation - Strict 6-Digit Numeric Enforcement", async (t) => {
  await t.test("rejects empty, null, or undefined PIN", async () => {
    const res1 = await registerWhatsAppPhoneNumber({ organizationId: "test-org", pin: "" });
    assert.equal(res1.success, false);
    assert.match(res1.error || "", /must be exactly 6 numeric digits/i);

    // @ts-expect-error testing invalid type
    const res2 = await registerWhatsAppPhoneNumber({ organizationId: "test-org", pin: null });
    assert.equal(res2.success, false);
  });

  await t.test("rejects PIN with incorrect length", async () => {
    const resShort = await registerWhatsAppPhoneNumber({ organizationId: "test-org", pin: "12345" });
    assert.equal(resShort.success, false);
    assert.match(resShort.error || "", /must be exactly 6 numeric digits/i);

    const resLong = await registerWhatsAppPhoneNumber({ organizationId: "test-org", pin: "1234567" });
    assert.equal(resLong.success, false);
    assert.match(resLong.error || "", /must be exactly 6 numeric digits/i);
  });

  await t.test("rejects PIN with alphabetic or non-digit characters", async () => {
    const resAlpha = await registerWhatsAppPhoneNumber({ organizationId: "test-org", pin: "12345a" });
    assert.equal(resAlpha.success, false);
    assert.match(resAlpha.error || "", /must be exactly 6 numeric digits/i);

    const resSpecial = await registerWhatsAppPhoneNumber({ organizationId: "test-org", pin: "12-456" });
    assert.equal(resSpecial.success, false);
  });
});

test("2. Unconfigured Connection Handling", async () => {
  // Mock findUnique to return null for unconfigured organization
  const origFindUnique = prisma.whatsAppConnection.findUnique;
  const origOrgFindUnique = prisma.organization.findUnique;

  // @ts-expect-error mock assignment
  prisma.whatsAppConnection.findUnique = async () => null;
  // @ts-expect-error mock assignment
  prisma.organization.findUnique = async () => null;

  try {
    const res = await registerWhatsAppPhoneNumber({
      organizationId: "non-existent-org-99999",
      pin: "123456",
    });

    assert.equal(res.success, false);
    assert.match(res.error || "", /credentials are not configured/i);
  } finally {
    prisma.whatsAppConnection.findUnique = origFindUnique;
    prisma.organization.findUnique = origOrgFindUnique;
  }
});

test("3. Meta API Dispatch & Error Handling (Mocked)", async (t) => {
  const originalFetch = global.fetch;
  const origConnFindUnique = prisma.whatsAppConnection.findUnique;
  const origConnUpdate = prisma.whatsAppConnection.update;

  const testOrgId = "test-org-registration-suite";
  const mockPhoneId = "109876543210987";
  const mockRawToken = "EAAGmockAccessTokenForTesting123";

  const mockConnectionRecord = {
    id: "conn-test-1",
    organizationId: testOrgId,
    environment: "production",
    phoneNumberId: mockPhoneId,
    wabaId: "293847561029384",
    displayPhoneNumber: "+1 555-0199",
    verifiedName: "Test Verified Business",
    accessToken: encryptToken(mockRawToken),
    status: "error",
    lastError: "Meta Error (Code 133010): Account not registered.",
    lastCheckedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    organization: {
      id: testOrgId,
      name: "Test Organization",
      webhookVerifyToken: "token_123",
    },
  };

  let updatedDbData: Record<string, unknown> = {};

  // @ts-expect-error mock assignment
  prisma.whatsAppConnection.findUnique = async ({ where }: { where: { organizationId_environment?: { organizationId: string } } }) => {
    if (where.organizationId_environment?.organizationId === testOrgId) {
      return mockConnectionRecord;
    }
    return null;
  };

  // @ts-expect-error mock assignment
  prisma.whatsAppConnection.update = async ({ data }: { data: Record<string, unknown> }) => {
    updatedDbData = data;
    return { ...mockConnectionRecord, ...data };
  };

  try {
    await t.test("dispatches request with correct v24.0 endpoint, headers, and body", async () => {
      let capturedUrl = "";
      let capturedMethod = "";
      let capturedHeaders: Record<string, string> = {};
      let capturedBody: Record<string, unknown> = {};

      global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
        capturedUrl = url.toString();
        capturedMethod = init?.method || "";
        capturedHeaders = (init?.headers as Record<string, string>) || {};
        capturedBody = JSON.parse((init?.body as string) || "{}");

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      const result = await registerWhatsAppPhoneNumber({
        organizationId: testOrgId,
        pin: "654321",
      });

      assert.equal(result.success, true);
      assert.equal(capturedMethod, "POST");
      assert.equal(
        capturedUrl,
        `https://graph.facebook.com/v24.0/${mockPhoneId}/register`
      );
      assert.equal(capturedHeaders["Authorization"], `Bearer ${mockRawToken}`);
      assert.equal(capturedHeaders["Content-Type"], "application/json");
      assert.equal(capturedBody["messaging_product"], "whatsapp");
      assert.equal(capturedBody["pin"], "654321");
    });

    await t.test("handles Meta Error 133005 (PIN mismatch) safely without leaking secrets", async () => {
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: {
              message: "(#133005) Two-step verification PIN mismatch.",
              type: "OAuthException",
              code: 133005,
              error_subcode: 2494005,
            },
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      };

      const result = await registerWhatsAppPhoneNumber({
        organizationId: testOrgId,
        pin: "111111",
      });

      assert.equal(result.success, false);
      assert.equal(result.errorCode, 133005);
      assert.match(result.error || "", /PIN mismatch/i);
      // Ensure raw token or PIN is never exposed in error message
      assert.equal(result.error?.includes(mockRawToken), false);
      assert.equal(result.error?.includes("111111"), false);
    });

    await t.test("handles Meta Error 133015 (Rate limited) without retrying", async () => {
      let callCount = 0;
      global.fetch = async () => {
        callCount++;
        return new Response(
          JSON.stringify({
            error: {
              message: "(#133015) Rate limit hit for registration attempts.",
              type: "OAuthException",
              code: 133015,
            },
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      };

      const result = await registerWhatsAppPhoneNumber({
        organizationId: testOrgId,
        pin: "222222",
      });

      assert.equal(result.success, false);
      assert.equal(result.errorCode, 133015);
      assert.match(result.error || "", /rate limit/i);
      assert.equal(callCount, 1, "Must never automatically retry registration requests");
    });

    await t.test("handles Meta Error 190 (Token expired)", async () => {
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: {
              message: "Error validating access token: Session has expired.",
              type: "OAuthException",
              code: 190,
            },
          }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      };

      const result = await registerWhatsAppPhoneNumber({
        organizationId: testOrgId,
        pin: "333333",
      });

      assert.equal(result.success, false);
      assert.equal(result.errorCode, 190);
      assert.match(result.error || "", /token/i);
    });

    await t.test("updates DB status to connected and clears lastError only on Meta success", async () => {
      global.fetch = async () => {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      const result = await registerWhatsAppPhoneNumber({
        organizationId: testOrgId,
        pin: "998877",
      });

      assert.equal(result.success, true);
      assert.match(result.message || "", /successfully registered/i);

      assert.equal(updatedDbData.status, "connected");
      assert.equal(updatedDbData.lastError, null);
    });
  } finally {
    global.fetch = originalFetch;
    prisma.whatsAppConnection.findUnique = origConnFindUnique;
    prisma.whatsAppConnection.update = origConnUpdate;
  }
});

test("4. API Route Auth Protection", async (t) => {
  const { POST: registerPost, GET: registerGet } = await import("../app/api/whatsapp/register/route");

  await t.test("POST /api/whatsapp/register returns 401 without authenticated session", async () => {
    const req = new Request("http://localhost:3000/api/whatsapp/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: "123456" }),
    });

    // @ts-expect-error NextRequest type simulation
    const response = await registerPost(req);
    assert.equal(response.status, 401);
    const data = await response.json();
    assert.equal(data.success, false);
    assert.match(data.error, /unauthorized/i);
  });

  await t.test("GET /api/whatsapp/register returns 401 without authenticated session", async () => {
    const req = new Request("http://localhost:3000/api/whatsapp/register", {
      method: "GET",
    });

    // @ts-expect-error NextRequest type simulation
    const response = await registerGet(req);
    assert.equal(response.status, 401);
  });
});

