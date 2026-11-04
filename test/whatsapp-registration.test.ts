/* eslint-disable @typescript-eslint/no-explicit-any */
import test from "node:test";
import assert from "node:assert/strict";

// Ensure dummy DATABASE_URL so Prisma client initializes in test mode without throwing
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://mock:mock@localhost:5432/mock";

import {
  registerWhatsAppPhoneNumber,
  saveWhatsAppConnection,
  getWhatsAppConnection,
} from "../lib/whatsapp";
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
      const capturedRequests: Array<{ url: string; method: string; headers: Record<string, string>; body: Record<string, unknown> }> = [];

      global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
        const u = url.toString();
        const m = init?.method || "GET";
        const h = (init?.headers as Record<string, string>) || {};
        const b = init?.body ? JSON.parse(init.body as string) : {};
        capturedRequests.push({ url: u, method: m, headers: h, body: b });

        if (u.includes("/register")) {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({
            id: mockPhoneId,
            display_phone_number: "+1 555-0199",
            verified_name: "Test Verified Business",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const result = await registerWhatsAppPhoneNumber({
        organizationId: testOrgId,
        pin: "654321",
      });

      assert.equal(result.success, true);
      assert.ok(capturedRequests.length >= 2, "Expected at least 2 requests (register POST + verify GET)");

      const registerReq = capturedRequests.find((r) => r.url.includes("/register"));
      assert.ok(registerReq, "Must have dispatched POST to register endpoint");
      assert.equal(registerReq.method, "POST");
      assert.equal(
        registerReq.url,
        `https://graph.facebook.com/v24.0/${mockPhoneId}/register`
      );
      assert.equal(registerReq.headers["Authorization"], `Bearer ${mockRawToken}`);
      assert.equal(registerReq.headers["Content-Type"], "application/json");
      assert.equal(registerReq.body["messaging_product"], "whatsapp");
      assert.equal(registerReq.body["pin"], "654321");

      const verifyReq = capturedRequests.find((r) => r.url.includes("fields="));
      assert.ok(verifyReq, "Must have dispatched GET to verify registration status");
      assert.equal(verifyReq.method, "GET");
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

test("5. WhatsApp Connection & Embedded Signup Baseline Schema Resilience", async (t) => {
  await t.test("saveWhatsAppConnection succeeds on baseline schema with explicit select", async () => {
    const origOrgUpdate = prisma.organization.update;
    const origConnUpsert = prisma.whatsAppConnection.upsert;
    const origConnFindUnique = prisma.whatsAppConnection.findUnique;
    const origOrgFindUnique = prisma.organization.findUnique;

    let orgUpdateArgs: any = null;
    // @ts-expect-error mock assignment
    prisma.organization.update = async (args: any) => {
      orgUpdateArgs = args;
      if (!args.select || args.select.status) {
        throw new Error("The column Organization.status does not exist in the current database.");
      }
      return { id: args.where.id };
    };

    // Simulate WhatsAppConnection upsert succeeding or falling back
    // @ts-expect-error mock assignment
    prisma.whatsAppConnection.upsert = async (args: any) => ({ id: "mock-conn", ...args.create });
    // @ts-expect-error mock assignment
    prisma.whatsAppConnection.findUnique = async () => null;
    // @ts-expect-error mock assignment
    prisma.organization.findUnique = async () => ({
      id: "org-base-test",
      accessToken: encryptToken("mock-token"),
      phoneNumberId: "1234567890",
      wabaId: "987654321",
      displayPhoneNumber: "+15550199",
      webhookVerifyToken: "token_abc",
    });

    try {
      const config = await saveWhatsAppConnection({
        organizationId: "org-base-test",
        environment: "production",
        phoneNumberId: "1234567890",
        wabaId: "987654321",
        accessToken: "mock-token",
        displayPhoneNumber: "+15550199",
      });

      assert.equal(config.isConfigured, true);
      assert.equal(config.phoneNumberId, "1234567890");
      assert.equal(config.wabaId, "987654321");
      assert.equal(orgUpdateArgs?.select?.id, true, "Must have select: { id: true } to prevent querying Organization.status");
    } finally {
      prisma.organization.update = origOrgUpdate;
      prisma.whatsAppConnection.upsert = origConnUpsert;
      prisma.whatsAppConnection.findUnique = origConnFindUnique;
      prisma.organization.findUnique = origOrgFindUnique;
    }
  });

  await t.test("getWhatsAppConnection falls back to Organization when WhatsAppConnection table is absent", async () => {
    const origConnFindUnique = prisma.whatsAppConnection.findUnique;
    const origConnUpsert = prisma.whatsAppConnection.upsert;
    const origOrgFindUnique = prisma.organization.findUnique;

    // Simulate P2021 table missing error on whatsAppConnection
    // @ts-expect-error mock assignment
    prisma.whatsAppConnection.findUnique = async () => {
      const err = new Error("The table public.WhatsAppConnection does not exist in the current database.");
      (err as any).code = "P2021";
      throw err;
    };

    // @ts-expect-error mock assignment
    prisma.whatsAppConnection.upsert = async () => ({ id: "mock-conn" });

    // @ts-expect-error mock assignment
    prisma.organization.findUnique = async (args: any) => {
      assert.ok(args.select, "Query must specify select block");
      assert.equal(args.select.status, undefined, "Query must not request Organization.status");
      return {
        id: "org-fallback-1",
        accessToken: encryptToken("fallback-token-secret"),
        phoneNumberId: "9988776655",
        wabaId: "1122334455",
        displayPhoneNumber: "+15550123",
        webhookVerifyToken: "token_xyz",
      };
    };

    try {
      const conn = await getWhatsAppConnection("org-fallback-1", "production");
      assert.equal(conn.isConfigured, true);
      assert.equal(conn.status, "connected");
      assert.equal(conn.phoneNumberId, "9988776655");
      assert.equal(conn.accessToken, "fallback-token-secret");
    } finally {
      prisma.whatsAppConnection.findUnique = origConnFindUnique;
      prisma.whatsAppConnection.upsert = origConnUpsert;
      prisma.organization.findUnique = origOrgFindUnique;
    }
  });
});


