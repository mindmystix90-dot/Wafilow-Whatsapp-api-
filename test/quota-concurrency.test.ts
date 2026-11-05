/* eslint-disable @typescript-eslint/no-explicit-any */
import test from "node:test";
import assert from "node:assert/strict";

// Ensure dummy DATABASE_URL so Prisma client initializes in test mode without throwing
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://mock:mock@localhost:5432/mock";

import {
  checkOrganizationQuota,
  checkAndReserveQuota,
  acquireQuotaReservation,
  getActiveInFlightCount,
  clearInFlightReservations,
  listAllQuotas,
  setOrganizationQuotaOverride,
  PLAN_LIMITS,
} from "../lib/quota";
import { sendWhatsAppMessage } from "../lib/whatsapp";
import { prisma } from "../lib/prisma";
import { encryptToken } from "../lib/crypto";

// Regression test suite for Wafilow Quota Verification & Baseline Schema Compatibility
// Covers all 9 required verification points:
// 1. Organization with available quota.
// 2. Organization with exhausted quota.
// 3. Baseline schema without monthlyLimit.
// 4. Baseline schema without status or planTier.
// 5. Database connection timeout.
// 6. Missing-column errors vs missing-table errors.
// 7. Concurrent message reservations.
// 8. Reservation release after Meta API failure.
// 9. Isolation between two organizations.

test("Wafilow Quota Verification & Baseline Compatibility Suite", async (t) => {
  t.beforeEach(() => {
    clearInFlightReservations();
  });

  t.afterEach(() => {
    clearInFlightReservations();
  });

  // -------------------------------------------------------------
  // 1. Organization with available quota
  // -------------------------------------------------------------
  await t.test("1. Organization with available quota allows message sending and computes correct remaining count", async () => {
    const orgId = "org_available_quota";
    const monthlyLimit = 1000;
    const usedMessages = 250;

    const mockDb = {
      organization: {
        findUnique: async () => ({
          id: orgId,
          name: "Active Quota Workspace",
          status: "active",
          planTier: "starter",
          monthlyLimit,
        }),
      },
      message: {
        count: async () => usedMessages,
      },
    };

    const check = await checkOrganizationQuota(orgId, mockDb);

    assert.equal(check.allowed, true, "Organization with available quota must be allowed");
    assert.equal(check.limit, 1000);
    assert.equal(check.used, 250);
    assert.equal(check.remaining, 750);
    assert.equal(check.reason, undefined);
  });

  // -------------------------------------------------------------
  // 2. Organization with exhausted quota
  // -------------------------------------------------------------
  await t.test("2. Organization with exhausted quota blocks message sending with QUOTA_EXCEEDED", async () => {
    const orgId = "org_exhausted_quota";
    const monthlyLimit = 500;
    const usedMessages = 500;

    const mockDb = {
      organization: {
        findUnique: async () => ({
          id: orgId,
          name: "Exhausted Quota Workspace",
          status: "active",
          planTier: "starter",
          monthlyLimit,
        }),
      },
      message: {
        count: async () => usedMessages,
      },
    };

    const check = await checkOrganizationQuota(orgId, mockDb);

    assert.equal(check.allowed, false, "Organization with exhausted quota must be blocked");
    assert.equal(check.reason, "QUOTA_EXCEEDED");
    assert.equal(check.remaining, 0);
    assert.match(check.error || "", /quota of 500 messages reached/i);
  });

  // -------------------------------------------------------------
  // 3. Baseline schema without monthlyLimit
  // -------------------------------------------------------------
  await t.test("3. Baseline schema without monthlyLimit column falls back cleanly to planTier default", async () => {
    const orgId = "org_baseline_no_monthly_limit";
    let fallbackSelectedColumns: Record<string, boolean> | undefined;

    const mockDb = {
      organization: {
        findUnique: async (args: any) => {
          // If query requests monthlyLimit, simulate Prisma P2022 missing column error
          if (args.select?.monthlyLimit) {
            const err = new Error("The column Organization.monthlyLimit does not exist in the current database.");
            (err as any).code = "P2022";
            (err as any).meta = { column: "Organization.monthlyLimit" };
            throw err;
          }

          // Fallback query requesting baseline columns
          fallbackSelectedColumns = args.select;
          return {
            id: orgId,
            name: "Baseline Workspace Without MonthlyLimit",
          };
        },
      },
      message: {
        count: async () => 10,
      },
    };

    const check = await checkOrganizationQuota(orgId, mockDb);

    assert.equal(check.allowed, true, "Must succeed on baseline schema without monthlyLimit");
    // Fallback selects ONLY id and name, avoiding nonexistent columns
    assert.ok(fallbackSelectedColumns);
    assert.equal(fallbackSelectedColumns.id, true);
    assert.equal(fallbackSelectedColumns.name, true);
    assert.equal(fallbackSelectedColumns.monthlyLimit, undefined, "Must NOT query monthlyLimit in fallback");
    assert.equal(fallbackSelectedColumns.status, undefined, "Must NOT query status in fallback");
    assert.equal(fallbackSelectedColumns.planTier, undefined, "Must NOT query planTier in fallback");

    // Default starter plan tier limit is applied (5000)
    assert.equal(check.limit, PLAN_LIMITS["starter"]);
    assert.equal(check.used, 10);
    assert.equal(check.remaining, PLAN_LIMITS["starter"] - 10);
  });

  // -------------------------------------------------------------
  // 4. Baseline schema without status or planTier
  // -------------------------------------------------------------
  await t.test("4. Baseline schema without status or planTier columns defaults to active starter plan", async () => {
    const orgId = "org_baseline_no_status_or_plan";
    let fallbackCalled = false;

    const mockDb = {
      organization: {
        findUnique: async (args: any) => {
          // Primary query requesting status/planTier throws PostgreSQL 42703
          if (args.select?.status || args.select?.planTier) {
            const err = new Error('column "status" of relation "Organization" does not exist');
            (err as any).code = "42703";
            throw err;
          }

          fallbackCalled = true;
          return {
            id: orgId,
            name: "Original Baseline Organization",
          };
        },
      },
      message: {
        count: async () => 50,
      },
    };

    const check = await checkOrganizationQuota(orgId, mockDb);

    assert.equal(check.allowed, true);
    assert.equal(fallbackCalled, true, "Fallback query must be executed");
    assert.equal(check.limit, 5000, "Must default to 5000 starter limit");
    assert.equal(check.used, 50);
    assert.equal(check.remaining, 4950);
  });

  // -------------------------------------------------------------
  // 5. Database connection timeout
  // -------------------------------------------------------------
  await t.test("5. Database connection timeout fails closed with DATABASE_ERROR", async () => {
    const orgId = "org_timeout_fail";

    const mockDbTimeoutOnOrg = {
      organization: {
        findUnique: async () => {
          throw new Error("Neon connection pool timeout: Can't reach database server at neon.tech:5432");
        },
      },
      message: {
        count: async () => 0,
      },
    };

    const check1 = await checkOrganizationQuota(orgId, mockDbTimeoutOnOrg);
    assert.equal(check1.allowed, false, "Must fail closed on organization connection timeout");
    assert.equal(check1.reason, "DATABASE_ERROR");
    assert.match(check1.error || "", /temporarily unavailable/i);

    const mockDbTimeoutOnCount = {
      organization: {
        findUnique: async () => ({
          id: orgId,
          name: "Test Org",
          status: "active",
          planTier: "starter",
          monthlyLimit: 5000,
        }),
      },
      message: {
        count: async () => {
          throw new Error("Neon connection timeout during message count");
        },
      },
    };

    const check2 = await checkOrganizationQuota(orgId, mockDbTimeoutOnCount);
    assert.equal(check2.allowed, false, "Must fail closed on message count connection timeout");
    assert.equal(check2.reason, "DATABASE_ERROR");
    assert.match(check2.error || "", /temporarily unavailable/i);
  });

  // -------------------------------------------------------------
  // 6. Missing-column errors vs missing-table errors
  // -------------------------------------------------------------
  await t.test("6. Missing-column errors (P2022/42703) trigger fallback whereas missing-table (P2021) fails closed", async () => {
    const orgId = "org_missing_table_test";

    // Simulate missing table error (P2021 / 42P01)
    const mockDbMissingTable = {
      organization: {
        findUnique: async () => {
          const err = new Error("The table public.Organization does not exist in the current database.");
          (err as any).code = "P2021";
          throw err;
        },
      },
      message: {
        count: async () => 0,
      },
    };

    const checkMissingTable = await checkOrganizationQuota(orgId, mockDbMissingTable);
    assert.equal(
      checkMissingTable.allowed,
      false,
      "Missing table (P2021) must fail closed without attempting column fallback"
    );
    assert.equal(checkMissingTable.reason, "DATABASE_ERROR");

    // Simulate missing column error (P2022) -> triggers fallback successfully
    const mockDbMissingColumn = {
      organization: {
        findUnique: async (args: any) => {
          if (args.select?.status) {
            const err = new Error("The column Organization.status does not exist in the current database.");
            (err as any).code = "P2022";
            throw err;
          }
          return { id: orgId, name: "Fallback Recovered Org" };
        },
      },
      message: {
        count: async () => 10,
      },
    };

    const checkMissingColumn = await checkOrganizationQuota(orgId, mockDbMissingColumn);
    assert.equal(
      checkMissingColumn.allowed,
      true,
      "Missing column (P2022) must trigger fallback and recover"
    );
    assert.equal(checkMissingColumn.limit, 5000);
  });

  // -------------------------------------------------------------
  // 7. Concurrent message reservations
  // -------------------------------------------------------------
  await t.test("7. Concurrent message reservations prevent burst races from exceeding monthly limit", async () => {
    const orgId = "org_burst_concurrency";
    const monthlyLimit = 5;
    let committedDbRows = 3; // Exactly 2 slots remaining

    const mockDb = {
      organization: {
        findUnique: async () => ({
          id: orgId,
          name: "Burst Concurrency Org",
          status: "active",
          planTier: "starter",
          monthlyLimit,
        }),
      },
      message: {
        count: async () => committedDbRows,
      },
    };

    // Dispatch 10 concurrent message reservation checks
    const requests = Array.from({ length: 10 }, async (_, index) => {
      const check = await checkAndReserveQuota(orgId, mockDb, 1);
      if (!check.allowed || !check.reservation) {
        return { index, allowed: false, reason: check.reason };
      }

      // Simulate asynchronous outbound delivery processing
      await new Promise((resolve) => setTimeout(resolve, 15));

      committedDbRows++;
      check.reservation.release();

      return { index, allowed: true };
    });

    const results = await Promise.all(requests);
    const allowed = results.filter((r) => r.allowed).length;
    const rejected = results.filter((r) => !r.allowed).length;

    assert.equal(allowed, 2, "Only 2 requests must be allowed when only 2 slots remain");
    assert.equal(rejected, 8, "8 requests must be rejected to prevent overage");
    assert.equal(getActiveInFlightCount(orgId), 0, "All reservations must be released cleanly");
  });

  // -------------------------------------------------------------
  // 8. Reservation release after Meta API failure
  // -------------------------------------------------------------
  await t.test("8. Reservation release after Meta API failure prevents quota slot burning", async () => {
    const originalFetch = global.fetch;
    const origConnFindUnique = prisma.whatsAppConnection.findUnique;
    const origOrgFindUnique = prisma.organization.findUnique;
    const origMessageCreate = prisma.message.create;
    const origMessageCount = prisma.message.count;

    const testOrgId = "org_reservation_release_suite";
    const mockRawToken = "EAAGtestMetaTokenSecret999";

    // Setup DB mocks for sendWhatsAppMessage
    // @ts-expect-error mock assignment
    prisma.whatsAppConnection.findUnique = async () => ({
      id: "conn-test",
      organizationId: testOrgId,
      environment: "production",
      phoneNumberId: "1234567890",
      wabaId: "9876543210",
      accessToken: encryptToken(mockRawToken),
      status: "connected",
      organization: { id: testOrgId, webhookVerifyToken: "token" },
    });

    // Organization with baseline schema (simulate P2022 on status)
    // @ts-expect-error mock assignment
    prisma.organization.findUnique = async (args: any) => {
      if (args.select?.status) {
        const err = new Error("The column Organization.status does not exist in the current database.");
        (err as any).code = "P2022";
        throw err;
      }
      return { id: testOrgId, name: "Release Test Workspace" };
    };

    // @ts-expect-error mock assignment
    prisma.message.create = async ({ data }: any) => ({ id: "msg-1", ...data, timestamp: new Date() });
    // @ts-expect-error mock assignment
    prisma.message.count = async () => 10;

    try {
      // Simulate Meta rejecting with 131047 (window closed)
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: {
              message: "(#131047) Customer service window expired",
              code: 131047,
            },
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      };

      assert.equal(getActiveInFlightCount(testOrgId), 0, "Initial in-flight count must be 0");

      const sendResult = await sendWhatsAppMessage({
        to: "+14155550192",
        type: "text",
        text: "Testing reservation release on Meta rejection",
        organizationId: testOrgId,
        environment: "production",
      });

      assert.equal(sendResult.success, false);
      assert.equal(sendResult.errorCode, 131047);

      // Verify reservation was released in the finally block
      assert.equal(
        getActiveInFlightCount(testOrgId),
        0,
        "In-flight quota reservation must be released after Meta rejects message"
      );
    } finally {
      global.fetch = originalFetch;
      prisma.whatsAppConnection.findUnique = origConnFindUnique;
      prisma.organization.findUnique = origOrgFindUnique;
      prisma.message.create = origMessageCreate;
      prisma.message.count = origMessageCount;
    }
  });

  // -------------------------------------------------------------
  // 9. Isolation between two organizations
  // -------------------------------------------------------------
  await t.test("9. Tenant isolation: reservations and usage in Organization A do not affect Organization B", async () => {
    const orgA = "org_isolated_alpha";
    const orgB = "org_isolated_beta";

    const mockDb = {
      organization: {
        findUnique: async ({ where }: any) => ({
          id: where.id,
          name: where.id === orgA ? "Alpha Workspace" : "Beta Workspace",
          status: "active",
          planTier: "starter",
          monthlyLimit: 5,
        }),
      },
      message: {
        count: async ({ where }: any) => {
          // Scoped to calling organization
          return where.organizationId === orgA ? 4 : 2;
        },
      },
    };

    // Org A has 4 used, acquires 1 reservation slot -> Org A is now at capacity (5/5)
    const checkA1 = await checkOrganizationQuota(orgA, mockDb);
    assert.equal(checkA1.allowed, true, "Org A has 1 slot available");
    const resA = acquireQuotaReservation(orgA, 1);

    const checkA2 = await checkOrganizationQuota(orgA, mockDb);
    assert.equal(checkA2.allowed, false, "Org A is now blocked by reservation");
    assert.equal(checkA2.reason, "QUOTA_EXCEEDED");

    // Org B has 2 used of 5 -> Org B must have 3 slots available, completely unaffected by Org A
    const checkB = await checkOrganizationQuota(orgB, mockDb);
    assert.equal(checkB.allowed, true, "Org B must have quota available");
    assert.equal(checkB.used, 2, "Org B used count must be isolated from Org A");
    assert.equal(checkB.remaining, 3, "Org B remaining count must be isolated from Org A");
    assert.equal(getActiveInFlightCount(orgB), 0, "Org B must have 0 in-flight reservations");

    resA.release();
    assert.equal(getActiveInFlightCount(orgA), 0);
  });

  // -------------------------------------------------------------
  // Baseline Schema Resilience for listAllQuotas and setOrganizationQuotaOverride
  // -------------------------------------------------------------
  await t.test("10. listAllQuotas and setOrganizationQuotaOverride succeed on baseline schema", async () => {
    const mockDbBaseline = {
      organization: {
        findMany: async (args: any) => {
          if (args.select?.status) {
            const err = new Error("The column Organization.status does not exist in the current database.");
            (err as any).code = "P2022";
            throw err;
          }
          return [{ id: "org_base_1", name: "Baseline Org 1" }];
        },
        findUnique: async () => ({ id: "org_base_1", name: "Baseline Org 1" }),
        update: async () => {
          const err = new Error("The column Organization.monthlyLimit does not exist in the current database.");
          (err as any).code = "P2022";
          throw err;
        },
      },
      message: {
        count: async () => 5,
      },
    };

    const quotas = await listAllQuotas(mockDbBaseline);
    assert.equal(quotas.length, 1);
    assert.equal(quotas[0].organizationId, "org_base_1");
    assert.equal(quotas[0].status, "active");
    assert.equal(quotas[0].planTier, "starter");
    assert.equal(quotas[0].monthlyLimit, 5000);
    assert.equal(quotas[0].usedThisMonth, 5);

    const override = await setOrganizationQuotaOverride("org_base_1", { limit: 10000 }, mockDbBaseline);
    assert.equal(override.id, "org_base_1");
    assert.equal(override.monthlyLimit, 10000);
  });
});
