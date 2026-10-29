/* eslint-disable @typescript-eslint/no-explicit-any */
import test from "node:test";
import assert from "node:assert/strict";
import {
  checkOrganizationQuota,
  checkAndReserveQuota,
  acquireQuotaReservation,
  getActiveInFlightCount,
  clearInFlightReservations,
} from "../lib/quota";

test("Wafilow Quota & Concurrency Enforcement Suite", async (t) => {
  t.beforeEach(() => {
    clearInFlightReservations();
  });

  t.afterEach(() => {
    clearInFlightReservations();
  });

  await t.test("1. Concurrent request bursts cannot exceed monthly limit", async () => {
    const orgId = "org_burst_test";
    const monthlyLimit = 5;
    let committedDbRows = 3; // 2 slots remaining

    const mockDb = {
      organization: {
        findUnique: async () => ({
          id: orgId,
          name: "Burst Test Workspace",
          status: "active",
          planTier: "starter",
          monthlyLimit,
        }),
      },
      message: {
        count: async () => committedDbRows,
      },
    };

    // Simulate 10 simultaneous concurrent outbound requests
    const concurrentRequests = Array.from({ length: 10 }, async (_, index) => {
      // 1. Atomically check and reserve quota
      const check = await checkAndReserveQuota(orgId, mockDb, 1);
      if (!check.allowed || !check.reservation) {
        return { index, allowed: false, reason: check.reason };
      }

      // Simulate network latency (10ms)
      await new Promise((resolve) => setTimeout(resolve, 10));

      // 2. Simulate message committed to DB and reservation released
      committedDbRows++;
      check.reservation.release();

      return { index, allowed: true };
    });

    const results = await Promise.all(concurrentRequests);

    const allowedCount = results.filter((r) => r.allowed).length;
    const rejectedCount = results.filter((r) => !r.allowed).length;

    assert.equal(
      allowedCount,
      2,
      `Exactly 2 concurrent requests must be allowed (limit: ${monthlyLimit}, initial: 3). Got: ${allowedCount}`
    );
    assert.equal(
      rejectedCount,
      8,
      `Exactly 8 concurrent requests must be rejected. Got: ${rejectedCount}`
    );

    // Verify all reservations are cleanly released
    const inFlightRemaining = getActiveInFlightCount(orgId);
    assert.equal(inFlightRemaining, 0, "In-flight reservations must return to 0 after completion");
  });

  await t.test("2. Suspended organizations are blocked immediately without counting", async () => {
    const orgId = "org_suspended";
    let messageCountCalled = false;

    const mockDb = {
      organization: {
        findUnique: async () => ({
          id: orgId,
          name: "Suspended Org",
          status: "suspended",
          planTier: "pro",
          monthlyLimit: 50000,
        }),
      },
      message: {
        count: async () => {
          messageCountCalled = true;
          return 0;
        },
      },
    };

    const check = await checkOrganizationQuota(orgId, mockDb);

    assert.equal(check.allowed, false, "Suspended organization must not be allowed to send");
    assert.equal(check.reason, "ORGANIZATION_SUSPENDED");
    assert.equal(messageCountCalled, false, "Database count must not be invoked for suspended org");
  });

  await t.test("3. Fail closed on database failure during quota check", async () => {
    const orgId = "org_db_fail";

    const mockDb = {
      organization: {
        findUnique: async () => ({
          id: orgId,
          name: "DB Fail Org",
          status: "active",
          planTier: "starter",
          monthlyLimit: 5000,
        }),
      },
      message: {
        count: async () => {
          throw new Error("Neon connection pool timeout (simulated)");
        },
      },
    };

    const check = await checkOrganizationQuota(orgId, mockDb);

    assert.equal(check.allowed, false, "Database count error must fail closed");
    assert.equal(check.reason, "DATABASE_ERROR");
  });

  await t.test("4. Tenant isolation: reservations in Org A do not affect Org B", async () => {
    const orgA = "org_alpha";
    const orgB = "org_beta";

    const mockDb = {
      organization: {
        findUnique: async ({ where }: any) => ({
          id: where.id,
          name: where.id === orgA ? "Alpha Org" : "Beta Org",
          status: "active",
          planTier: "starter",
          monthlyLimit: 5,
        }),
      },
      message: {
        count: async () => 4, // 1 slot remaining each
      },
    };

    // Org A acquires its remaining slot
    const checkA1 = await checkOrganizationQuota(orgA, mockDb);
    assert.equal(checkA1.allowed, true, "Org A first request allowed");
    const resA = acquireQuotaReservation(orgA);

    // Org A tries another request -> blocked
    const checkA2 = await checkOrganizationQuota(orgA, mockDb);
    assert.equal(checkA2.allowed, false, "Org A second request blocked by in-flight reservation");

    // Org B should still have its 1 slot available (unaffected by Org A)
    const checkB1 = await checkOrganizationQuota(orgB, mockDb);
    assert.equal(checkB1.allowed, true, "Org B must not be affected by Org A's reservations");

    resA.release();
  });

  await t.test("5. Auto-expiration: expired reservations do not permanently consume quota", async () => {
    const orgId = "org_ttl_test";
    const mockDb = {
      organization: {
        findUnique: async () => ({
          id: orgId,
          name: "TTL Test Org",
          status: "active",
          planTier: "starter",
          monthlyLimit: 5,
        }),
      },
      message: {
        count: async () => 4, // 1 slot remaining
      },
    };

    // Acquire reservation with 20ms TTL
    acquireQuotaReservation(orgId, 1, 20);

    // Immediately check: should be blocked
    const checkImmediate = await checkOrganizationQuota(orgId, mockDb);
    assert.equal(checkImmediate.allowed, false, "Active reservation must consume slot");

    // Wait 30ms for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 30));

    // Check again: expired reservation is purged automatically
    const checkAfterExpiry = await checkOrganizationQuota(orgId, mockDb);
    assert.equal(checkAfterExpiry.allowed, true, "Expired reservation must be purged and slot restored");
  });
});
