/**
 * Wafilow v5 Embedded Signup, Admin Edits, Manual Billing & Maintenance Release Gate Tests
 *
 * Validates:
 * 1. Embedded Signup v5 + v4 parser & strict verified Coexistence detection.
 * 2. Database error classification (P2021/42P01 vs P2022/42703).
 * 3. CLI bootstrap owner allowlist resolution (SUPER_ADMIN_EMAILS + SUPER_ADMIN_EMAIL).
 * 4. Owner-only user edits, temporary password resets, organization WhatsApp ID edits,
 *    and manual TenantBilling persistence + pre-migration fallback.
 * 5. Platform Maintenance Mode & Feature Rollout Gate enforcement with super_admin bypass.
 */

import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { parseEmbeddedSignupSession } from "../lib/embedded-signup";
import { buildEmbeddedSignupLoginOptions } from "../lib/facebook-sdk";
import { getServerWhatsAppEnv } from "../lib/env";
import {
  getWhatsAppConnection,
  sendWhatsAppMessage,
  testWhatsAppConnectionDiagnostic,
  registerWhatsAppPhoneNumber,
} from "../lib/whatsapp";
import { encryptToken } from "../lib/crypto";
import { prisma } from "../lib/prisma";
import { isMissingColumnError, isMissingTableOrColumnError } from "../lib/db-errors";
import { resolveBootstrapOwnerEmails } from "../scripts/bootstrap-super-admin";
import {
  updateUserAdmin,
  setUserTemporaryPassword,
  updateOrganization,
  listSubscriptionsWithBilling,
  upsertTenantBilling,
} from "../lib/admin-store";
import {
  evaluateReleaseGate,
  getPlatformMaintenanceStatus,
  isFeatureEnabled,
  listFeatureGates,
  updateMaintenanceSettings,
  upsertFeatureGate,
} from "../lib/release-gate";

// ==========================================
// 1. EMBEDDED SIGNUP V5 + COEXISTENCE PARSER & SDK / GRAPH API CONFIG
// ==========================================

test("Embedded Signup v5 & Coexistence Parser Suite", async (t) => {
  await t.test("parses normal v5 payload with separate phone_number_id and primary_waac_ids", () => {
    const parsed = parseEmbeddedSignupSession({
      type: "WA_EMBEDDED_SIGNUP",
      event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
      data: {
        messaging_account_ids: ["998877665544"],
        primary_waac_ids: ["112233445566"],
        phone_number_id: "776655443322",
        business_id: "5544332211",
        is_on_biz_app: true,
      },
    });

    assert.equal(parsed.isVerifiedMetaPayload, true);
    assert.equal(parsed.wabaId, "998877665544");
    assert.equal(parsed.phoneNumberId, "776655443322");
    assert.equal(parsed.primaryWaacId, "112233445566");
    assert.equal(parsed.businessId, "5544332211");
    assert.deepEqual(parsed.messagingAccountIds, ["998877665544"]);
    assert.deepEqual(parsed.primaryWaacIds, ["112233445566"]);
    assert.equal(parsed.isOnBizApp, true);
    assert.equal(parsed.isCoexistenceSession, true);
  });

  await t.test("regression: missing phone_number_id with populated primary_waac_ids NEVER maps WAAC ID to phoneNumberId", () => {
    const parsed = parseEmbeddedSignupSession({
      type: "WA_EMBEDDED_SIGNUP",
      event: "FINISH",
      data: {
        messaging_account_ids: ["998877665544"],
        primary_waac_ids: ["112233445566"],
        business_id: "5544332211",
        is_on_biz_app: false,
      },
    });

    assert.equal(parsed.isVerifiedMetaPayload, true);
    assert.equal(parsed.wabaId, "998877665544");
    assert.equal(
      parsed.phoneNumberId,
      undefined,
      "primary_waac_ids[0] must NEVER be mapped to phoneNumberId"
    );
    assert.equal(parsed.primaryWaacId, "112233445566");
    assert.deepEqual(parsed.primaryWaacIds, ["112233445566"]);
    assert.equal(parsed.isOnBizApp, false);
    assert.equal(parsed.isCoexistenceSession, false);
  });

  await t.test("preserves legacy v4 waba_id/phone_number_id fallback and coexistence event detection", () => {
    const parsed = parseEmbeddedSignupSession({
      type: "WA_EMBEDDED_SIGNUP",
      event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
      data: {
        waba_id: "3356483501181888",
        phone_number_id: "987654321098",
      },
    });

    assert.equal(parsed.isVerifiedMetaPayload, true);
    assert.equal(parsed.wabaId, "3356483501181888");
    assert.equal(parsed.phoneNumberId, "987654321098");
    assert.equal(parsed.primaryWaacId, undefined);
    assert.equal(parsed.isOnBizApp, false);
    assert.equal(parsed.isCoexistenceSession, true);
  });

  await t.test("rejects untrusted client booleans or forged non-WA_EMBEDDED_SIGNUP payloads", () => {
    const forgedPayload = parseEmbeddedSignupSession(
      {
        type: "CLIENT_SPOOF",
        event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
        data: {
          is_on_biz_app: true,
          messaging_account_ids: ["12345"],
        },
      },
      "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
    );

    assert.equal(forgedPayload.isVerifiedMetaPayload, false);
    assert.equal(forgedPayload.isOnBizApp, false);
    assert.equal(forgedPayload.isCoexistenceSession, false);

    const emptyPayload = parseEmbeddedSignupSession(null, "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING");
    assert.equal(emptyPayload.isVerifiedMetaPayload, false);
    assert.equal(emptyPayload.isCoexistenceSession, false);
  });

  await t.test("buildEmbeddedSignupLoginOptions emits clean v5 extras without legacy sessionInfoVersion or featureType", () => {
    const opts = buildEmbeddedSignupLoginOptions(" 9876543210123456 ");
    assert.equal(opts.config_id, "9876543210123456");
    assert.equal(opts.response_type, "code");
    assert.equal(opts.override_default_response_type, true);
    assert.deepEqual(opts.extras, {
      version: "v5",
      setup: {},
    });
    assert.equal("sessionInfoVersion" in (opts.extras || {}), false);
    assert.equal("featureType" in (opts.extras || {}), false);
  });
});

test("Graph API Version Configuration & Existing WhatsApp Connection Compatibility", async (t) => {
  await t.test("META_API_VERSION defaults to v24.0 and propagates to WhatsApp Cloud API calls", async () => {
    const prevApiVersion = process.env.META_API_VERSION;
    const originalFetch = global.fetch;
    const origFindUnique = prisma.whatsAppConnection.findUnique;
    const origUpdate = prisma.whatsAppConnection.update;
    const origOrgFindUnique = prisma.organization.findUnique;
    const origMessageCount = prisma.message.count;

    const capturedUrls: string[] = [];

    try {
      delete process.env.META_API_VERSION;
      assert.equal(getServerWhatsAppEnv().apiVersion, "v24.0");

      process.env.META_API_VERSION = "v25.0";
      assert.equal(getServerWhatsAppEnv().apiVersion, "v25.0");

      const mockEncryptedToken = encryptToken("EAAG_EXISTING_CUSTOMER_TOKEN_12345");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.whatsAppConnection as any).findUnique = async () => ({
        id: "conn_existing_1",
        organizationId: "org_existing_1",
        environment: "production",
        wabaId: "waba_existing_1",
        phoneNumberId: "phone_existing_1",
        displayPhoneNumber: "+14155550199",
        verifiedName: "Existing Biz",
        accessToken: mockEncryptedToken,
        status: "connected",
        lastCheckedAt: new Date(),
        lastError: null,
        organization: { webhookVerifyToken: "verify_tok_1" },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.whatsAppConnection as any).update = async () => ({ id: "conn_existing_1" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.organization as any).findUnique = async () => ({
        id: "org_existing_1",
        status: "active",
        planTier: "pro",
        monthlyLimit: 10000,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.message as any).count = async () => 0;

      global.fetch = (async (input: string | URL | Request) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        capturedUrls.push(url);

        if (url.includes("/messages")) {
          return new Response(JSON.stringify({ messages: [{ id: "wamid.v25.ok" }] }), { status: 200 });
        }
        if (url.includes("/register")) {
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        return new Response(
          JSON.stringify({
            id: "phone_existing_1",
            display_phone_number: "+1 415-555-0199",
            verified_name: "Existing Biz",
            code_verification_status: "VERIFIED",
            quality_rating: "GREEN",
          }),
          { status: 200 }
        );
      }) as typeof fetch;

      // 1. Existing connected customer decrypts stored enc:v1: token cleanly
      const conn = await getWhatsAppConnection("org_existing_1", "production");
      assert.equal(conn.isConfigured, true);
      assert.equal(conn.accessToken, "EAAG_EXISTING_CUSTOMER_TOKEN_12345");
      assert.equal(conn.phoneNumberId, "phone_existing_1");
      assert.equal(conn.wabaId, "waba_existing_1");

      // 2. testWhatsAppConnectionDiagnostic uses configured META_API_VERSION (v25.0)
      const diag = await testWhatsAppConnectionDiagnostic("org_existing_1", "production");
      assert.equal(diag.success, true);

      // 3. sendWhatsAppMessage uses configured META_API_VERSION (v25.0)
      const sendRes = await sendWhatsAppMessage({
        to: "+14155550100",
        text: "Hello existing customer",
        organizationId: "org_existing_1",
        environment: "production",
      });
      assert.equal(sendRes.success, true);
      assert.equal(sendRes.messageId, "wamid.v25.ok");

      // 4. registerWhatsAppPhoneNumber uses configured META_API_VERSION (v25.0)
      const regRes = await registerWhatsAppPhoneNumber({
        organizationId: "org_existing_1",
        pin: "123456",
      });
      assert.equal(regRes.success, true);

      assert.ok(
        capturedUrls.some((u) => u.startsWith("https://graph.facebook.com/v25.0/phone_existing_1?")),
        "testWhatsAppConnectionDiagnostic must use META_API_VERSION"
      );
      assert.ok(
        capturedUrls.some((u) => u.startsWith("https://graph.facebook.com/v25.0/waba_existing_1?")),
        "WABA diagnostic query must use META_API_VERSION"
      );
      assert.ok(
        capturedUrls.includes("https://graph.facebook.com/v25.0/phone_existing_1/messages"),
        "sendWhatsAppMessage must use META_API_VERSION"
      );
      assert.ok(
        capturedUrls.includes("https://graph.facebook.com/v25.0/phone_existing_1/register"),
        "registerWhatsAppPhoneNumber must use META_API_VERSION"
      );
      assert.equal(
        capturedUrls.some((u) => u.includes("/v24.0/")),
        false,
        "No Graph API call should remain hardcoded to v24.0 when META_API_VERSION=v25.0"
      );
    } finally {
      if (prevApiVersion === undefined) {
        delete process.env.META_API_VERSION;
      } else {
        process.env.META_API_VERSION = prevApiVersion;
      }
      global.fetch = originalFetch;
      prisma.whatsAppConnection.findUnique = origFindUnique;
      prisma.whatsAppConnection.update = origUpdate;
      prisma.organization.findUnique = origOrgFindUnique;
      prisma.message.count = origMessageCount;
    }
  });

  await t.test("preserves legacy Organization fallback for pre-migration connected customers", async () => {
    const origConnFind = prisma.whatsAppConnection.findUnique;
    const origConnUpsert = prisma.whatsAppConnection.upsert;
    const origOrgFind = prisma.organization.findUnique;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.whatsAppConnection as any).findUnique = async () => null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.whatsAppConnection as any).upsert = async () => ({ id: "conn_backfilled" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.organization as any).findUnique = async () => ({
        id: "org_legacy_1",
        accessToken: "EAAG_LEGACY_PLAINTEXT_TOKEN",
        phoneNumberId: "phone_legacy_1",
        wabaId: "waba_legacy_1",
        displayPhoneNumber: "+14155550111",
        webhookVerifyToken: "legacy_verify_tok",
      });

      const conn = await getWhatsAppConnection("org_legacy_1", "production");
      assert.equal(conn.isConfigured, true);
      assert.equal(conn.accessToken, "EAAG_LEGACY_PLAINTEXT_TOKEN");
      assert.equal(conn.phoneNumberId, "phone_legacy_1");
      assert.equal(conn.wabaId, "waba_legacy_1");
      assert.equal(conn.status, "connected");
    } finally {
      prisma.whatsAppConnection.findUnique = origConnFind;
      prisma.whatsAppConnection.upsert = origConnUpsert;
      prisma.organization.findUnique = origOrgFind;
    }
  });
});

// ==========================================
// 2. DATABASE ERROR CLASSIFICATION
// ==========================================

test("Database Error Classification Suite", async (t) => {
  await t.test("distinguishes missing table (P2021/42P01) from missing column (P2022/42703)", () => {
    const p2021 = { code: "P2021", message: "The table `public.TenantBilling` does not exist in the current database." };
    const pg42P01 = { code: "42P01", message: 'relation "PlatformSetting" does not exist' };
    const p2022 = { code: "P2022", message: "The column `Organization.planTier` does not exist in the current database." };
    const pg42703 = { code: "42703", message: "column does not exist" };
    const unrelated = { code: "P2002", message: "Unique constraint failed" };

    assert.equal(isMissingColumnError(p2021), false);
    assert.equal(isMissingColumnError(pg42P01), false);
    assert.equal(isMissingColumnError(p2022), true);
    assert.equal(isMissingColumnError(pg42703), true);

    assert.equal(isMissingTableOrColumnError(p2021), true);
    assert.equal(isMissingTableOrColumnError(pg42P01), true);
    assert.equal(isMissingTableOrColumnError(p2022), true);
    assert.equal(isMissingTableOrColumnError(pg42703), true);
    assert.equal(isMissingTableOrColumnError(unrelated), false);
  });
});

// ==========================================
// 3. BOOTSTRAP OWNER ALLOWLIST RESOLUTION
// ==========================================

test("CLI Bootstrap Owner Email Resolution", async (t) => {
  await t.test("resolves primary email from SUPER_ADMIN_EMAILS and normalizes case", () => {
    const res = resolveBootstrapOwnerEmails({
      email: "",
      emails: "  Owner@Wafilow.com , backup@wafilow.com , invalid ",
    });

    assert.equal(res.primaryEmail, "owner@wafilow.com");
    assert.deepEqual(res.allowlist, ["owner@wafilow.com", "backup@wafilow.com"]);
  });

  await t.test("prioritizes explicit email and prepends it to allowlist", () => {
    const res = resolveBootstrapOwnerEmails({
      email: "Founder@Wafilow.com",
      emails: "owner@wafilow.com",
    });

    assert.equal(res.primaryEmail, "founder@wafilow.com");
    assert.deepEqual(res.allowlist, ["founder@wafilow.com", "owner@wafilow.com"]);
  });
});

// ==========================================
// 4. OWNER-ONLY ADMIN EDITS & MANUAL BILLING
// ==========================================

test("Admin User Edits, Temporary Password & Manual Billing Suite", async (t) => {
  const adminActor = { adminId: "owner_1", adminEmail: "owner@wafilow.com" };

  await t.test("enforces single-owner guard on user updates and bumps sessionVersion on sensitive changes", async () => {
    const auditEntries: Array<Record<string, unknown>> = [];
    let lastUpdateData: Record<string, unknown> | null = null;

    const mockDb = {
      user: {
        findUnique: async ({ where }: { where: { id?: string; email?: string } }) => {
          if (where.id === "user_1") {
            return {
              id: "user_1",
              name: "Alice",
              email: "alice@acme.com",
              role: "customer",
              status: "active",
              sessionVersion: 2,
              organizationId: "org_1",
            };
          }
          if (where.id === "owner_1") {
            return {
              id: "owner_1",
              name: "Platform Owner",
              email: "owner@wafilow.com",
              role: "super_admin",
              status: "active",
              sessionVersion: 1,
              organizationId: "org_hq",
            };
          }
          return null;
        },
        update: async ({ data }: { data: Record<string, unknown> }) => {
          lastUpdateData = data;
          return {
            id: "user_1",
            name: (data.name as string) ?? "Alice",
            email: (data.email as string) ?? "alice@acme.com",
            role: (data.role as string) ?? "customer",
            status: (data.status as string) ?? "active",
            sessionVersion: 3,
            organizationId: (data.organizationId as string) ?? "org_1",
            organization: { id: "org_2", name: "Acme Enterprise" },
          };
        },
      },
      organization: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          where.id === "org_2" ? { id: "org_2" } : null,
      },
      auditLog: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          auditEntries.push(data);
          return data;
        },
      },
    };

    // Promoting a customer to super_admin must be blocked
    await assert.rejects(
      async () => {
        await updateUserAdmin("user_1", { role: "super_admin" }, adminActor, mockDb);
      },
      { message: /Single-owner policy/ }
    );

    // Demoting or suspending the platform owner must be blocked
    await assert.rejects(
      async () => {
        await updateUserAdmin("owner_1", { role: "admin" }, adminActor, mockDb);
      },
      { message: /Cannot demote the designated platform owner/ }
    );

    await assert.rejects(
      async () => {
        await updateUserAdmin("owner_1", { status: "suspended" }, adminActor, mockDb);
      },
      { message: /Cannot suspend the designated platform owner/ }
    );

    // Legitimate edit updates role, org, status and increments sessionVersion
    const result = await updateUserAdmin(
      "user_1",
      {
        name: "Alice Manager",
        email: "alice.manager@acme.com",
        role: "admin",
        organizationId: "org_2",
      },
      adminActor,
      mockDb
    );

    assert.equal(result.sessionsRevoked, true);
    assert.equal(result.user.role, "admin");
    assert.deepEqual((lastUpdateData as Record<string, unknown> | null)?.sessionVersion, {
      increment: 1,
    });
    assert.equal(auditEntries.length, 1);
    assert.equal(auditEntries[0].action, "USER_ADMIN_UPDATE");
  });

  await t.test("hashes temporary password with bcrypt and increments sessionVersion", async () => {
    let storedHash = "";
    let sessionIncremented = false;

    const mockDb = {
      user: {
        findUnique: async () => ({ id: "user_1", email: "alice@acme.com" }),
        update: async ({ data }: { data: { password: string; sessionVersion?: { increment: number } } }) => {
          storedHash = data.password;
          sessionIncremented = data.sessionVersion?.increment === 1;
          return { id: "user_1", email: "alice@acme.com", sessionVersion: 4 };
        },
      },
      auditLog: {
        create: async ({ data }: { data: Record<string, unknown> }) => data,
      },
    };

    await assert.rejects(
      async () => {
        await setUserTemporaryPassword("user_1", "short", adminActor, mockDb);
      },
      { message: /at least 8 characters/ }
    );

    const res = await setUserTemporaryPassword("user_1", "TempPass#2026!", adminActor, mockDb);
    assert.equal(res.success, true);
    assert.equal(res.sessionsRevoked, true);
    assert.equal(sessionIncremented, true);
    assert.notEqual(storedHash, "TempPass#2026!");
    assert.equal(await bcrypt.compare("TempPass#2026!", storedHash), true);
  });

  await t.test("persists manual TenantBilling and degrades cleanly when TenantBilling table is missing", async () => {
    let orgUpdatePayload: Record<string, unknown> | null = null;
    let billingUpsertPayload: Record<string, unknown> | null = null;

    const fullDb = {
      organization: {
        findUnique: async () => ({
          id: "org_1",
          name: "Acme Corp",
          status: "active",
          planTier: "starter",
          monthlyLimit: 5000,
        }),
        update: async ({ data }: { data: Record<string, unknown> }) => {
          orgUpdatePayload = data;
          return {
            id: "org_1",
            name: (data.name as string) || "Acme Corp",
            status: (data.status as string) || "active",
            planTier: (data.planTier as string) || "pro",
            monthlyLimit: (data.monthlyLimit as number) ?? 50000,
            displayPhoneNumber: (data.displayPhoneNumber as string) ?? "+15550001234",
            phoneNumberId: (data.phoneNumberId as string) ?? "pn_123",
            wabaId: (data.wabaId as string) ?? "waba_123",
          };
        },
        findMany: async () => [
          {
            id: "org_1",
            name: "Acme Corp",
            status: "active",
            planTier: "pro",
            monthlyLimit: 50000,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            _count: { users: 3, contacts: 40, conversations: 12 },
          },
        ],
      },
      tenantBilling: {
        upsert: async ({ create }: { create: Record<string, unknown> }) => {
          billingUpsertPayload = create;
          return {
            ...create,
            currentPeriodEnd: new Date("2026-12-31T00:00:00.000Z"),
          };
        },
        findMany: async () => [
          {
            organizationId: "org_1",
            billingCycle: "annual",
            amountCents: 199000,
            currency: "USD",
            paymentStatus: "paid",
            paymentMethod: "wire_transfer",
            invoiceRef: "INV-2026-042",
            notes: "Paid via annual bank wire",
            currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
            currentPeriodEnd: new Date("2026-12-31T00:00:00.000Z"),
            lastPaidAt: new Date("2026-01-02T00:00:00.000Z"),
          },
        ],
      },
      message: {
        groupBy: async () => [],
      },
      auditLog: {
        create: async ({ data }: { data: Record<string, unknown> }) => data,
      },
    };

    // Test organization WhatsApp ID update
    const updatedOrg = await updateOrganization(
      "org_1",
      {
        name: "Acme Global",
        displayPhoneNumber: "+15550001234",
        phoneNumberId: "pn_123",
        wabaId: "waba_123",
      },
      adminActor,
      fullDb
    );
    assert.equal(updatedOrg.phoneNumberId, "pn_123");
    assert.equal((orgUpdatePayload as Record<string, unknown> | null)?.wabaId, "waba_123");

    // Test manual TenantBilling persistence
    const billed = await upsertTenantBilling(
      "org_1",
      {
        planTier: "pro",
        monthlyLimit: 50000,
        billingCycle: "annual",
        amountCents: 199000,
        currency: "usd",
        paymentStatus: "paid",
        paymentMethod: "wire_transfer",
        invoiceRef: "INV-2026-042",
        notes: "Paid via annual bank wire",
      },
      adminActor,
      fullDb
    );

    assert.equal(billed.billingPersisted, true);
    assert.equal(billed.currency, "USD");
    assert.equal(billed.invoiceRef, "INV-2026-042");
    assert.equal((billingUpsertPayload as Record<string, unknown> | null)?.amountCents, 199000);

    // List subscriptions merges TenantBilling cleanly
    const listed = await listSubscriptionsWithBilling(undefined, fullDb);
    assert.equal(listed.billingSchemaReady, true);
    assert.equal(listed.subscriptions[0].invoiceRef, "INV-2026-042");

    // Missing TenantBilling table (P2021) degrades cleanly without crashing
    const preMigrationDb = {
      ...fullDb,
      tenantBilling: {
        findMany: async () => {
          throw { code: "P2021", message: "The table `public.TenantBilling` does not exist in the current database." };
        },
        upsert: async () => {
          throw { code: "P2021", message: "The table `public.TenantBilling` does not exist in the current database." };
        },
      },
    };

    const degradedList = await listSubscriptionsWithBilling(undefined, preMigrationDb);
    assert.equal(degradedList.billingSchemaReady, false);
    assert.equal(degradedList.subscriptions.length, 1);

    const degradedUpsert = await upsertTenantBilling(
      "org_1",
      { planTier: "pro", monthlyLimit: 50000 },
      adminActor,
      preMigrationDb
    );
    assert.equal(degradedUpsert.billingPersisted, false);
  });
});

// ==========================================
// 5. MAINTENANCE MODE & FEATURE ROLLOUT GATES
// ==========================================

test("Maintenance Mode & Feature Rollout Gate Suite", async (t) => {
  const adminActor = { adminId: "owner_1", adminEmail: "owner@wafilow.com" };

  await t.test("blocks customer actions with 503 during maintenance/pauses while super_admin bypasses", async () => {
    const settingsStore = new Map<string, { key: string; value: string; updatedAt: Date }>();
    const gatesStore = new Map<
      string,
      {
        key: string;
        enabled: boolean;
        description: string | null;
        allowedRoles: string | null;
        allowedOrgIds: string | null;
        updatedBy: string | null;
        updatedAt: Date;
      }
    >();

    const mockDb = {
      platformSetting: {
        findMany: async () => Array.from(settingsStore.values()),
        upsert: async ({
          where,
          update,
          create,
        }: {
          where: { key: string };
          update: { value: string };
          create: { key: string; value: string };
        }) => {
          const val = settingsStore.has(where.key) ? update.value : create.value;
          const row = { key: where.key, value: val, updatedAt: new Date() };
          settingsStore.set(where.key, row);
          return row;
        },
      },
      featureGate: {
        findMany: async () => Array.from(gatesStore.values()),
        findUnique: async ({ where }: { where: { key: string } }) => gatesStore.get(where.key) ?? null,
        upsert: async ({
          where,
          update,
          create,
        }: {
          where: { key: string };
          update: Record<string, unknown>;
          create: Record<string, unknown>;
        }) => {
          const prev = gatesStore.get(where.key);
          const merged = prev
            ? { ...prev, ...update, updatedAt: new Date() }
            : {
                key: String(create.key),
                enabled: Boolean(create.enabled),
                description: (create.description as string) || null,
                allowedRoles: (create.allowedRoles as string) || null,
                allowedOrgIds: (create.allowedOrgIds as string) || null,
                updatedBy: (create.updatedBy as string) || null,
                updatedAt: new Date(),
              };
          gatesStore.set(where.key, merged);
          return merged;
        },
      },
      auditLog: {
        create: async ({ data }: { data: Record<string, unknown> }) => data,
      },
    };

    // Enable maintenance mode
    const status = await updateMaintenanceSettings(
      {
        maintenanceMode: true,
        maintenanceMessage: "Scheduled database upgrade in progress.",
      },
      adminActor,
      mockDb
    );
    assert.equal(status.maintenanceMode, true);
    assert.equal(status.schemaReady, true);

    // Regular customer is blocked with 503
    const custReg = await evaluateReleaseGate({ scope: "registration", userRole: "customer" }, mockDb);
    assert.equal(custReg.allowed, false);
    assert.equal(custReg.statusCode, 503);
    assert.match(custReg.reason || "", /Scheduled database upgrade/);

    // Platform owner bypasses maintenance cleanly
    const ownerOut = await evaluateReleaseGate(
      { scope: "outbound", userRole: "super_admin", organizationId: "org_hq" },
      mockDb
    );
    assert.equal(ownerOut.allowed, true);
    assert.equal(ownerOut.bypassed, true);

    // Disable global maintenance, enable targeted feature gate for org_canary only
    await updateMaintenanceSettings({ maintenanceMode: false, outboundPaused: false }, adminActor, mockDb);
    await upsertFeatureGate(
      {
        key: "embedded_signup_v5",
        enabled: false,
        allowedOrgIds: ["org_canary"],
      },
      adminActor,
      mockDb
    );

    const regularEval = await evaluateReleaseGate(
      { scope: "embedded_signup", userRole: "customer", organizationId: "org_regular" },
      mockDb
    );
    assert.equal(regularEval.allowed, false);
    assert.equal(regularEval.statusCode, 503);

    const canaryEval = await evaluateReleaseGate(
      { scope: "embedded_signup", userRole: "customer", organizationId: "org_canary" },
      mockDb
    );
    assert.equal(canaryEval.allowed, true);

    const listedGates = await listFeatureGates(mockDb);
    assert.equal(listedGates.schemaReady, true);
    const v5Gate = listedGates.gates.find((g) => g.key === "embedded_signup_v5");
    assert.equal(v5Gate?.enabled, false);
    assert.deepEqual(v5Gate?.allowedOrgIds, ["org_canary"]);
  });

  await t.test("degrades fail-safe to operational defaults when PlatformSetting/FeatureGate tables do not exist yet", async () => {
    const missingTableErr = {
      code: "P2021",
      message: "The table `public.PlatformSetting` does not exist in the current database.",
    };
    const preMigrationDb = {
      platformSetting: {
        findMany: async () => {
          throw missingTableErr;
        },
      },
      featureGate: {
        findMany: async () => {
          throw missingTableErr;
        },
        findUnique: async () => {
          throw missingTableErr;
        },
      },
    };

    const status = await getPlatformMaintenanceStatus(preMigrationDb);
    assert.equal(status.schemaReady, false);
    assert.equal(status.maintenanceMode, false);

    const gateCheck = await isFeatureEnabled("embedded_signup_v5", { userRole: "customer" }, preMigrationDb);
    assert.equal(gateCheck.enabled, true);

    const evalRes = await evaluateReleaseGate({ scope: "registration", userRole: "customer" }, preMigrationDb);
    assert.equal(evalRes.allowed, true);
    assert.equal(evalRes.statusCode, 200);
  });
});
