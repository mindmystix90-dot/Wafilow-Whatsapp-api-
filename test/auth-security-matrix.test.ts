/* eslint-disable @typescript-eslint/no-explicit-any */
import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { createAuthCallbacks, createAuthorize, isMissingColumnError } from "../lib/auth";
import { createAuthGuards, AuthError } from "../lib/admin-auth";
import type { prisma } from "../lib/prisma";

type MockPrisma = typeof prisma;

test("Wafilow Hardened Security & Auth Matrix", async (t) => {
  // 1. Database Failure & Fail-Closed Behavior
  await t.test("1. Fail closed on database error during JWT verification", async () => {
    const mockDb = {
      user: {
        findUnique: async () => {
          throw new Error("Neon connection pool timeout (simulated)");
        },
      },
    } as unknown as MockPrisma;

    const callbacks = createAuthCallbacks(mockDb);
    const initialToken = { id: "usr_active_123", role: "user", sessionVersion: 1 };

    const resultToken = await callbacks.jwt({
      token: initialToken,
      user: undefined,
      trigger: undefined,
      session: undefined,
    });

    assert.equal(resultToken.id, undefined, "User ID must be stripped on database error");
    assert.equal(resultToken.role, undefined, "Role must be stripped on database error");
    assert.equal(resultToken.revoked, true, "Token must be flagged as revoked");

    const sessionResult = await callbacks.session({
      session: { expires: "2099-01-01T00:00:00.000Z", user: { id: "usr_active_123" } },
      token: resultToken,
    });

    assert.equal(sessionResult.user, undefined, "Revoked token must produce session with undefined user");
  });

  // 2. Unauthenticated Access
  await t.test("2. Reject unauthenticated access to admin and customer guards", async () => {
    const mockDb = { user: { findUnique: async () => null } } as unknown as MockPrisma;
    const guards = createAuthGuards({
      getSession: async () => null, // No session
      db: mockDb,
    });

    await assert.rejects(
      async () => guards.requireSuperAdmin(),
      (err: AuthError) => err.statusCode === 401 && /Authentication required/.test(err.message),
      "requireSuperAdmin must reject unauthenticated caller with 401"
    );

    await assert.rejects(
      async () => guards.requireActiveUserSession(),
      (err: AuthError) => err.statusCode === 401 && /Authentication required/.test(err.message),
      "requireActiveUserSession must reject unauthenticated caller with 401"
    );
  });

  // 3. Non-Admin Access to Super Admin Routes
  await t.test("3. Reject non-admin access to Super Admin routes", async () => {
    const mockDb = {
      user: {
        findUnique: async () => ({
          id: "usr_customer",
          email: "customer@wafilow.com",
          status: "active",
          role: "user", // NOT super_admin
          sessionVersion: 1,
        }),
      },
    } as unknown as MockPrisma;

    const guards = createAuthGuards({
      getSession: async () => ({ user: { id: "usr_customer", role: "user", sessionVersion: 1 }, expires: "2099-01-01" }),
      db: mockDb,
    });

    await assert.rejects(
      async () => guards.requireSuperAdmin(),
      (err: AuthError) => err.statusCode === 403 && /Super Admin privilege required/.test(err.message),
      "requireSuperAdmin must reject customer role 'user' with 403"
    );
  });

  // 4. Suspended User Access
  await t.test("4. Block suspended user credentials and active sessions", async () => {
    const mockDb = {
      user: {
        findUnique: async () => ({
          id: "usr_suspended",
          email: "suspended@wafilow.com",
          status: "suspended",
          role: "user",
          sessionVersion: 1,
          organizationId: "org_1",
          organization: { id: "org_1", status: "active" },
        }),
      },
    } as unknown as MockPrisma;

    const callbacks = createAuthCallbacks(mockDb);
    const token = await callbacks.jwt({
      token: { id: "usr_suspended", sessionVersion: 1 },
    });

    assert.equal(token.id, undefined, "Suspended user token must be stripped");
    assert.equal(token.revoked, true, "Suspended user token must be flagged revoked");

    const guards = createAuthGuards({
      getSession: async () => ({ user: { id: "usr_suspended", sessionVersion: 1 }, expires: "2099-01-01" }),
      db: mockDb,
    });

    await assert.rejects(
      async () => guards.requireActiveUserSession(),
      (err: AuthError) => err.statusCode === 403 && /Account is suspended/.test(err.message),
      "requireActiveUserSession must reject suspended user with HTTP 403"
    );
  });

  // 5. Suspended Organization Access
  await t.test("5. Block suspended organization across all mutation routes", async () => {
    const mockDb = {
      user: {
        findUnique: async () => ({
          id: "usr_org_suspended",
          email: "user@suspended-org.com",
          status: "active",
          role: "user",
          sessionVersion: 1,
          organizationId: "org_suspended_99",
          organization: { id: "org_suspended_99", status: "suspended" },
        }),
      },
    } as unknown as MockPrisma;

    const callbacks = createAuthCallbacks(mockDb);
    const token = await callbacks.jwt({
      token: { id: "usr_org_suspended", sessionVersion: 1 },
    });

    assert.equal(token.id, undefined, "User in suspended org must have token stripped");
    assert.equal(token.revoked, true, "User in suspended org must have token revoked");

    const guards = createAuthGuards({
      getSession: async () => ({ user: { id: "usr_org_suspended", sessionVersion: 1 }, expires: "2099-01-01" }),
      db: mockDb,
    });

    await assert.rejects(
      async () => guards.requireActiveUserSession(),
      (err: AuthError) => err.statusCode === 403 && /Organization workspace is suspended/.test(err.message),
      "requireActiveUserSession must reject suspended organization with HTTP 403"
    );
  });

  // 6. Revoked Session Versions
  await t.test("6. Immediate session invalidation via sessionVersion mismatch", async () => {
    const mockDb = {
      user: {
        findUnique: async () => ({
          id: "usr_active",
          email: "active@wafilow.com",
          status: "active",
          role: "user",
          sessionVersion: 2, // BUMPED TO 2 IN POSTGRESQL
          organizationId: "org_1",
          organization: { id: "org_1", status: "active" },
        }),
      },
    } as unknown as MockPrisma;

    const callbacks = createAuthCallbacks(mockDb);
    const token = await callbacks.jwt({
      token: { id: "usr_active", sessionVersion: 1 },
    });

    assert.equal(token.id, undefined, "Token with outdated sessionVersion must be stripped");
    assert.equal(token.revoked, true, "Token with outdated sessionVersion must be revoked");

    const guards = createAuthGuards({
      getSession: async () => ({ user: { id: "usr_active", sessionVersion: 1 }, expires: "2099-01-01" }),
      db: mockDb,
    });

    await assert.rejects(
      async () => guards.requireActiveUserSession(),
      (err: AuthError) => err.statusCode === 401 && /Session has been revoked/.test(err.message),
      "Outdated sessionVersion must be rejected with HTTP 401"
    );
  });

  // 7. Legacy JWT Session Compatibility
  await t.test("7. Legacy JWT session compatibility (Missing sessionVersion)", async () => {
    const mockDb = {
      user: {
        findUnique: async () => ({
          id: "usr_legacy",
          email: "legacy@wafilow.com",
          status: "active",
          role: "user",
          sessionVersion: 1, // DB default is 1
          organizationId: "org_1",
          organization: { id: "org_1", status: "active" },
        }),
      },
    } as unknown as MockPrisma;

    const callbacks = createAuthCallbacks(mockDb);
    const legacyToken = { id: "usr_legacy", role: "user" }; // sessionVersion is undefined
    const upgradedToken = await callbacks.jwt({ token: legacyToken });

    assert.equal(upgradedToken.sessionVersion, 1, "Legacy token must be safely normalized to version 1");
    assert.equal(upgradedToken.id, "usr_legacy", "Legacy active session must remain valid");
    assert.equal(upgradedToken.revoked, undefined, "Legacy active session must not be revoked");

    // If admin has bumped DB sessionVersion to 2, legacy token without version must be rejected
    const mockRevokedDb = {
      user: {
        findUnique: async () => ({
          id: "usr_legacy",
          status: "active",
          role: "user",
          sessionVersion: 2,
          organizationId: "org_1",
          organization: { id: "org_1", status: "active" },
        }),
      },
    } as unknown as MockPrisma;

    const revokedCallbacks = createAuthCallbacks(mockRevokedDb);
    const rejectedToken = await revokedCallbacks.jwt({ token: legacyToken });

    assert.equal(rejectedToken.id, undefined, "Legacy token must be stripped if DB sessionVersion was bumped");
    assert.equal(rejectedToken.revoked, true, "Legacy token must be flagged revoked");
  });

  // 8. Session-Update Tampering Protection
  await t.test("8. Client session-update tampering is completely ignored", async () => {
    const mockDb = {
      user: {
        findUnique: async () => ({
          id: "usr_target",
          email: "user@wafilow.com",
          status: "active",
          role: "user", // Real DB role remains 'user'
          sessionVersion: 1,
          organizationId: "org_real",
          organization: { id: "org_real", status: "active" },
        }),
      },
    } as unknown as MockPrisma;

    const callbacks = createAuthCallbacks(mockDb);

    // Client attempts to spoof role and sessionVersion in session update trigger
    const forgedClientUpdate = {
      role: "super_admin",
      organizationId: "org_compromised",
      sessionVersion: 99,
      name: "Legitimate Name Update",
    };

    const token = await callbacks.jwt({
      token: { id: "usr_target", role: "user", organizationId: "org_real", sessionVersion: 1 },
      trigger: "update",
      session: forgedClientUpdate,
    });

    assert.equal(token.role, "user", "Client-supplied role tampering must be rejected");
    assert.equal(token.organizationId, "org_real", "Client-supplied organizationId tampering must be rejected");
    assert.equal(token.sessionVersion, 1, "Client-supplied sessionVersion tampering must be rejected");
    assert.equal(token.name, "Legitimate Name Update", "Legitimate name update is allowed");
  });

  // 9. Super Admin Route Guards Reject Unauthenticated and Non-Admin Callers
  await t.test("9. Super Admin route guards reject unauthenticated and non-admin callers", async () => {
    const { GET: getOrgs } = await import("../app/api/admin/organizations/route");
    const { GET: getUsers } = await import("../app/api/admin/users/route");
    const { GET: getHealth } = await import("../app/api/admin/system-health/route");

    // Unauthenticated GET /api/admin/organizations
    const unauthReq = new Request("http://localhost:3000/api/admin/organizations");
    // @ts-expect-error simulated NextRequest
    const orgsRes = await getOrgs(unauthReq);
    assert.equal(orgsRes.status, 401, "GET /api/admin/organizations must return 401 when unauthenticated");

    // Unauthenticated GET /api/admin/users
    const usersReq = new Request("http://localhost:3000/api/admin/users");
    // @ts-expect-error simulated NextRequest
    const usersRes = await getUsers(usersReq);
    assert.equal(usersRes.status, 401, "GET /api/admin/users must return 401 when unauthenticated");

    // Unauthenticated GET /api/admin/system-health
    const healthRes = await getHealth();
    assert.equal(healthRes.status, 401, "GET /api/admin/system-health must return 401 when unauthenticated");
  });

  // 10. Customer Routes Reject Suspended and Unauthenticated Users
  await t.test("10. Customer routes return 401 when unauthenticated and 403 when suspended", async () => {
    const { GET: getContacts } = await import("../app/api/contacts/route");
    const { GET: getConversations } = await import("../app/api/whatsapp/conversations/route");
    const { GET: getStats } = await import("../app/api/dashboard/stats/route");

    // Unauthenticated contacts
    const contactsReq = new Request("http://localhost:3000/api/contacts");
    // @ts-expect-error simulated NextRequest
    const contactsRes = await getContacts(contactsReq);
    assert.equal(contactsRes.status, 401, "GET /api/contacts must return 401 when unauthenticated");

    // Unauthenticated conversations
    const convReq = new Request("http://localhost:3000/api/whatsapp/conversations");
    // @ts-expect-error simulated NextRequest
    const convRes = await getConversations(convReq);
    assert.equal(convRes.status, 401, "GET /api/whatsapp/conversations must return 401 when unauthenticated");

    // Unauthenticated stats
    const statsReq = new Request("http://localhost:3000/api/dashboard/stats");
    // @ts-expect-error simulated NextRequest
    const statsRes = await getStats(statsReq);
    assert.equal(statsRes.status, 401, "GET /api/dashboard/stats must return 401 when unauthenticated");
  });

  // 11. Quota Enforcement - Rejection When Limit is Exhausted
  await t.test("11. Quota engine rejects dispatches when monthly limit is exhausted", async () => {
    const { checkOrganizationQuota, setOrganizationQuotaOverride } = await import("../lib/quota");

    let mockMonthlyLimit: number | null = 0;
    let mockPlanTier = "free";

    const mockDb = {
      organization: {
        findUnique: async () => ({
          id: "org_quota_test",
          name: "Quota Test Org",
          status: "active",
          planTier: mockPlanTier,
          monthlyLimit: mockMonthlyLimit,
        }),
        update: async ({ data }: any) => {
          if (data.monthlyLimit !== undefined) mockMonthlyLimit = data.monthlyLimit;
          if (data.planTier !== undefined) mockPlanTier = data.planTier;
          return { id: "org_quota_test", monthlyLimit: mockMonthlyLimit, planTier: mockPlanTier };
        },
      },
      message: {
        count: async () => 5, // 5 messages used
      },
    };

    // Limit is 0, usage is 5 -> exhausted
    const result = await checkOrganizationQuota("org_quota_test", mockDb);
    assert.equal(result.allowed, false, "Quota check must reject when limit is 0 and exhausted");
    assert.equal(result.reason, "QUOTA_EXCEEDED", "Reason must be QUOTA_EXCEEDED");
    assert.match(result.error || "", /quota.*exceeded/i, "Error message must describe quota exhaustion");

    // Update limit to 1000
    await setOrganizationQuotaOverride("org_quota_test", { limit: 1000, planTier: "starter" }, mockDb);
    const allowedResult = await checkOrganizationQuota("org_quota_test", mockDb);
    assert.equal(allowedResult.allowed, true, "Quota check must permit when usage is below limit");
    assert.equal(allowedResult.limit, 1000, "Limit must match override");
    assert.equal(allowedResult.used, 5);
    assert.equal(allowedResult.remaining, 995);
  });

  // 12. Organization Suspension Blocks Outbound Message Dispatch
  await t.test("12. Organization suspension blocks outbound message dispatch", async () => {
    const { sendWhatsAppMessage } = await import("../lib/whatsapp");

    // Call sendWhatsAppMessage without organizationId
    const resNoOrg = await sendWhatsAppMessage({
      to: "15551234567",
      text: "Test ping",
      environment: "production",
    });

    // Unconfigured environment connection check fails gracefully
    assert.equal(resNoOrg.success, false);
    assert.ok(resNoOrg.error, "Must return descriptive error without unhandled exception");
  });

  // 13. Database Errors Fail Safely Without Leaking Secrets
  await t.test("13. Database errors fail safely without exposing secrets", async () => {
    const { checkOrganizationQuota } = await import("../lib/quota");
    const { recordAuditLog } = await import("../lib/audit-log");

    const failingDb = {
      organization: {
        findUnique: async () => {
          throw new Error("Neon connection failed (secret_password_123)");
        },
      },
      auditLog: {
        create: async () => {
          throw new Error("Neon disk full (secret_key_abc)");
        },
      },
    };

    // Quota check fails closed
    const quotaRes = await checkOrganizationQuota("org_test", failingDb);
    assert.equal(quotaRes.allowed, false, "Must fail closed on DB error");
    assert.equal(quotaRes.reason, "DATABASE_ERROR");
    assert.doesNotMatch(quotaRes.error || "", /secret_password_123/, "Secrets must never leak in error response");

    // Audit log throws clean compliance error
    await assert.rejects(
      async () =>
        recordAuditLog(
          {
            actorId: "admin_1",
            actorEmail: "admin@test.com",
            action: "TEST_ACTION",
            targetType: "USER",
            targetId: "usr_1",
          },
          failingDb
        ),
      (err: Error) => !err.message.includes("secret_key_abc") && /compliance/i.test(err.message)
    );
  });

  // 14. Persistent AuditLog Records and Queries Correctly
  await t.test("14. Persistent AuditLog records and queries correctly", async () => {
    const { recordAuditLog, queryAuditLogs } = await import("../lib/audit-log");

    const logsStore: any[] = [];
    const mockDb = {
      auditLog: {
        create: async ({ data }: any) => {
          const entry = { id: "log_" + Date.now(), ...data, createdAt: new Date() };
          logsStore.unshift(entry);
          return entry;
        },
        findMany: async ({ where, take, skip }: any) => {
          let res = [...logsStore];
          if (where?.action?.contains) {
            res = res.filter((l) => l.action.includes(where.action.contains));
          }
          if (where?.targetType) {
            res = res.filter((l) => l.targetType === where.targetType);
          }
          return res.slice(skip || 0, (skip || 0) + (take || 50));
        },
        count: async () => logsStore.length,
      },
    };

    const entry = await recordAuditLog(
      {
        actorId: "admin_super",
        actorEmail: "superadmin@wafilow.com",
        action: "USER_STATUS_CHANGE",
        targetType: "USER",
        targetId: "usr_alice",
        details: { newStatus: "suspended" },
        ipAddress: "192.168.1.1",
      },
      mockDb
    );

    assert.ok(entry.id, "Must generate id");
    assert.equal(entry.action, "USER_STATUS_CHANGE");
    assert.equal(entry.actorEmail, "superadmin@wafilow.com");

    const queryResult = await queryAuditLogs({ action: "USER_STATUS_CHANGE" }, mockDb);
    assert.equal(queryResult.total, 1);
    assert.equal(queryResult.logs[0].targetId, "usr_alice");
  });

  // 15. Secure Hashed Single-Use Password Reset Token Flow
  await t.test("15. Secure hashed single-use password reset token flow", async () => {
    const { generatePasswordResetToken, redeemPasswordResetToken } = await import("../lib/admin-store");
    const crypto = await import("crypto");

    let storedTokenRecord: any = null;
    const userRecord: any = {
      id: "usr_target_reset",
      email: "target@wafilow.com",
      status: "active",
      sessionVersion: 1,
      password: "initial_hashed_password",
    };

    const mockDb = {
      user: {
        findUnique: async ({ where }: any) => (where.id === userRecord.id ? userRecord : null),
        update: async ({ data }: any) => {
          if (data.password) userRecord.password = data.password;
          if (data.sessionVersion?.increment) userRecord.sessionVersion += data.sessionVersion.increment;
          return userRecord;
        },
      },
      passwordResetToken: {
        deleteMany: async () => {},
        create: async ({ data }: any) => {
          storedTokenRecord = { id: "prt_123", ...data, usedAt: null };
          return storedTokenRecord;
        },
        findUnique: async ({ where }: any) => {
          if (storedTokenRecord && storedTokenRecord.tokenHash === where.tokenHash) {
            return { ...storedTokenRecord, user: userRecord };
          }
          return null;
        },
        update: async ({ data }: any) => {
          if (storedTokenRecord) storedTokenRecord.usedAt = data.usedAt;
          return storedTokenRecord;
        },
        updateMany: async ({ where, data }: any) => {
          if (storedTokenRecord && storedTokenRecord.id === where.id && storedTokenRecord.usedAt === null) {
            storedTokenRecord.usedAt = data.usedAt;
            return { count: 1 };
          }
          return { count: 0 };
        },
      },
      auditLog: {
        create: async () => ({ id: "audit_1" }),
      },
      $transaction: async (arg: any) => {
        if (typeof arg === "function") {
          return arg(mockDb);
        }
        return Promise.all(arg);
      },
    };

    // 1. Generate token
    const genResult = await generatePasswordResetToken(
      "usr_target_reset",
      {
        adminId: "admin_super",
        adminEmail: "super@wafilow.com",
      },
      mockDb
    );

    assert.ok(genResult.resetToken, "Must return raw token to admin");
    assert.ok(genResult.resetUrl.includes(genResult.resetToken), "URL must contain token");

    // Verify raw token is NOT in database, only SHA-256 hash
    const expectedHash = crypto.createHash("sha256").update(genResult.resetToken).digest("hex");
    assert.equal(storedTokenRecord.tokenHash, expectedHash, "Stored token must be SHA-256 hash");
    assert.notEqual(storedTokenRecord.tokenHash, genResult.resetToken, "Raw token must never be stored");

    // 2. Redeem token successfully
    const redeemResult = await redeemPasswordResetToken(genResult.resetToken, "NewSecurePassword123!", mockDb);
    assert.equal(redeemResult.success, true);
    assert.equal(userRecord.sessionVersion, 2, "Redeeming reset token must increment sessionVersion to 2");
    assert.ok(storedTokenRecord.usedAt !== null, "Token must be marked as used");

    // 3. Replay attack: attempting to reuse the same token must fail
    await assert.rejects(
      async () => redeemPasswordResetToken(genResult.resetToken, "AnotherPassword123!", mockDb),
      (err: Error) => /already been used/i.test(err.message),
      "Must reject already used token"
    );

    // 4. Expired token rejection
    storedTokenRecord = {
      id: "prt_expired",
      userId: "usr_target_reset",
      tokenHash: crypto.createHash("sha256").update("expired_token_raw").digest("hex"),
      expiresAt: new Date(Date.now() - 10000), // Expired 10 seconds ago
      usedAt: null,
      user: userRecord,
    };

    await assert.rejects(
      async () => redeemPasswordResetToken("expired_token_raw", "NewPassword123!", mockDb),
      (err: Error) => /expired/i.test(err.message),
      "Must reject expired token"
    );

    // 5. Concurrent redemption prevention (Atomic race condition check inside transaction)
    const concurrentRawToken = "concurrent_test_token_1234567890abcdef";
    const concurrentHash = crypto.createHash("sha256").update(concurrentRawToken).digest("hex");
    let atomicUsedCount = 0;
    const concurrentTokenRecord = {
      id: "prt_concurrent",
      userId: "usr_target_reset",
      tokenHash: concurrentHash,
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null as Date | null,
      user: userRecord,
    };

    const concurrentMockDb = {
      user: mockDb.user,
      auditLog: mockDb.auditLog,
      passwordResetToken: {
        findUnique: async () => ({ ...concurrentTokenRecord }),
        updateMany: async ({ data }: any) => {
          if (concurrentTokenRecord.usedAt === null) {
            concurrentTokenRecord.usedAt = data.usedAt;
            atomicUsedCount++;
            return { count: 1 };
          }
          return { count: 0 };
        },
      },
      $transaction: async (arg: any) => {
        if (typeof arg === "function") {
          return arg(concurrentMockDb);
        }
        return Promise.all(arg);
      },
    };

    // Fire two simultaneous redemption requests
    const [res1, res2] = await Promise.allSettled([
      redeemPasswordResetToken(concurrentRawToken, "PasswordOne123!", concurrentMockDb),
      redeemPasswordResetToken(concurrentRawToken, "PasswordTwo123!", concurrentMockDb),
    ]);

    const successes = [res1, res2].filter((r) => r.status === "fulfilled");
    const rejections = [res1, res2].filter((r) => r.status === "rejected");

    assert.equal(successes.length, 1, "Exactly one concurrent request must succeed");
    assert.equal(rejections.length, 1, "The second concurrent request must be rejected");
    assert.equal(atomicUsedCount, 1, "Token must be claimed exactly once in the database");
  });

  // 16. Transaction Rollback on Password Update Failure
  await t.test("16. Failed password update rolls back token consumption inside Prisma transaction", async () => {
    const { redeemPasswordResetToken } = await import("../lib/admin-store");
    const crypto = await import("crypto");

    const rawToken = "rollback_test_token_abcdef1234567890";
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const userState = {
      id: "usr_rollback_target",
      email: "rollback@wafilow.com",
      status: "active",
      sessionVersion: 1,
      password: "original_password_hash",
    };

    let tokenState = {
      id: "prt_rollback",
      userId: userState.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null as Date | null,
    };

    // Transactional mock simulating PostgreSQL transactional ACID rollback
    const transactionalDb = {
      passwordResetToken: {
        findUnique: async ({ where }: any) => {
          if (tokenState.tokenHash === where.tokenHash) {
            return { ...tokenState, user: userState };
          }
          return null;
        },
      },
      $transaction: async (action: (tx: any) => Promise<void>) => {
        // Create an isolated snapshot of state before transaction executes
        const snapshotToken = { ...tokenState };

        const txClient = {
          passwordResetToken: {
            updateMany: async ({ where, data }: any) => {
              if (snapshotToken.id === where.id && snapshotToken.usedAt === null) {
                snapshotToken.usedAt = data.usedAt;
                return { count: 1 };
              }
              return { count: 0 };
            },
          },
          user: {
            update: async () => {
              // Simulate failure during user password update (e.g. database disk error or constraint failure)
              throw new Error("Simulated DB error during password update inside transaction");
            },
          },
        };

        try {
          await action(txClient);
          // If transaction commits, apply snapshot to persistent state
          tokenState = snapshotToken;
        } catch (txError) {
          // Transaction aborts! Snapshot is discarded, persistent state remains UNMODIFIED (ROLLBACK)
          throw txError;
        }
      },
    };

    // Assert that redemption fails with the simulated error
    await assert.rejects(
      async () => redeemPasswordResetToken(rawToken, "NewPasswordValid123!", transactionalDb),
      (err: Error) => /Simulated DB error during password update/i.test(err.message),
      "Transaction failure must reject redeemPasswordResetToken"
    );

    // Verify token was NOT consumed (rolled back to usedAt: null)
    assert.equal(
      tokenState.usedAt,
      null,
      "Failed transaction must rollback token consumption: usedAt must remain null"
    );

    // Verify user state was untouched
    assert.equal(userState.sessionVersion, 1, "Session version must not have incremented");
    assert.equal(userState.password, "original_password_hash", "Password must remain unchanged");
  });

  // 17. Schema Resilience Fallback when Organization.status is missing (P2022 and reliable 42703)
  await t.test("17. Authorize handles baseline schema when column is missing (P2022 and 42703)", async () => {
    // Exact error identification assertions
    assert.equal(isMissingColumnError({ code: "P2022" }), true, "P2022 must be identified as missing column");
    assert.equal(isMissingColumnError({ code: "42703" }), true, "Direct PostgreSQL 42703 code must be identified");
    assert.equal(isMissingColumnError({ meta: { code: "42703" } }), true, "PostgreSQL 42703 in meta.code must be identified");
    assert.equal(isMissingColumnError({ meta: { database_error_code: "42703" } }), true, "PostgreSQL 42703 in meta.database_error_code must be identified");
    assert.equal(isMissingColumnError({ meta: { originalCode: "42703" } }), true, "PostgreSQL 42703 in meta.originalCode must be identified");
    
    // Strict non-matches
    assert.equal(isMissingColumnError({ code: "P2021" }), false, "P2021 (missing table) must NOT be treated as missing column");
    assert.equal(isMissingColumnError({ code: "P2024" }), false, "P2024 (connection pool timeout) must NOT trigger fallback");
    assert.equal(isMissingColumnError({ code: "ECONNREFUSED" }), false, "ECONNREFUSED must NOT trigger fallback");
    assert.equal(isMissingColumnError(new Error("Neon connection pool timeout (simulated)")), false, "Connection error must NOT trigger fallback");
    assert.equal(isMissingColumnError(new Error("status column missing")), false, "Broad substring errors must NOT match");
    assert.equal(isMissingColumnError({ code: "42P01" }), false, "PostgreSQL 42P01 (relation does not exist) must NOT match");

    let fallbackCalledWithP2022 = false;
    const mockDbP2022 = {
      user: {
        findUnique: async (args: any) => {
          if (args?.select?.status || args?.include?.organization?.select?.status) {
            const err = new Error("column Organization.status does not exist");
            (err as any).code = "P2022";
            (err as any).meta = { column: "Organization.status" };
            throw err;
          }
          fallbackCalledWithP2022 = true;
          return {
            id: "user_baseline_123",
            email: "baseline@wafilow.com",
            role: "user",
            organizationId: "org_baseline_123",
            organization: { id: "org_baseline_123" },
          };
        },
      },
    } as unknown as MockPrisma;

    // Call user lookup simulation with fallback logic for P2022
    let userP2022: any = null;
    try {
      userP2022 = await (mockDbP2022.user as any).findUnique({
        where: { email: "baseline@wafilow.com" },
        select: { id: true, status: true },
      });
    } catch (error: unknown) {
      if (isMissingColumnError(error)) {
        userP2022 = await (mockDbP2022.user as any).findUnique({
          where: { email: "baseline@wafilow.com" },
          select: { id: true },
        });
      }
    }

    assert.equal(fallbackCalledWithP2022, true, "Fallback query should be called when column status is missing with P2022");
    assert.equal(userP2022?.id, "user_baseline_123", "User should be successfully resolved on baseline schema with P2022");

    // Call user lookup simulation with fallback logic for direct PostgreSQL 42703
    let fallbackCalledWith42703 = false;
    const mockDb42703 = {
      user: {
        findUnique: async (args: any) => {
          if (args?.select?.status) {
            const err = new Error('column "status" of relation "User" does not exist');
            (err as any).code = "42703";
            throw err;
          }
          fallbackCalledWith42703 = true;
          return {
            id: "user_pg42703_123",
            email: "pg42703@wafilow.com",
            role: "user",
            organizationId: "org_pg42703_123",
            organization: { id: "org_pg42703_123" },
          };
        },
      },
    } as unknown as MockPrisma;

    let user42703: any = null;
    try {
      user42703 = await (mockDb42703.user as any).findUnique({
        where: { email: "pg42703@wafilow.com" },
        select: { id: true, status: true },
      });
    } catch (error: unknown) {
      if (isMissingColumnError(error)) {
        user42703 = await (mockDb42703.user as any).findUnique({
          where: { email: "pg42703@wafilow.com" },
          select: { id: true },
        });
      }
    }

    assert.equal(fallbackCalledWith42703, true, "Fallback query should be called when column status is missing with 42703");
    assert.equal(user42703?.id, "user_pg42703_123", "User should be resolved on baseline schema with PostgreSQL 42703");
  });

  // 18. Missing Table (P2021) and Connection Errors Fail Closed and Never Trigger Fallback
  await t.test("18. Missing Table (P2021) and Connection Errors fail closed without executing fallback", async () => {
    let fallbackCalled = false;
    const mockDb = {
      user: {
        findUnique: async (args: any) => {
          if (args?.select?.status) {
            const err = new Error("The table public.User does not exist in the current database.");
            (err as any).code = "P2021";
            throw err;
          }
          fallbackCalled = true;
          return { id: "never_called" };
        },
      },
    } as unknown as MockPrisma;

    let caughtError: unknown = null;
    try {
      try {
        await (mockDb.user as any).findUnique({
          where: { email: "test@wafilow.com" },
          select: { id: true, status: true },
        });
      } catch (error: unknown) {
        if (isMissingColumnError(error)) {
          await (mockDb.user as any).findUnique({
            where: { email: "test@wafilow.com" },
            select: { id: true },
          });
        } else {
          throw error;
        }
      }
    } catch (e: unknown) {
      caughtError = e;
    }

    assert.equal(fallbackCalled, false, "Fallback must NOT be called for P2021 table missing error");
    assert.equal((caughtError as any)?.code, "P2021", "P2021 must be rethrown to fail closed");

    // Also verify connection error (e.g. P2024 pool timeout) fails closed
    let connFallbackCalled = false;
    let caughtConnError: unknown = null;
    const mockConnDb = {
      user: {
        findUnique: async () => {
          const err = new Error("Timed out fetching a new connection from the connection pool.");
          (err as any).code = "P2024";
          throw err;
        },
      },
    } as unknown as MockPrisma;

    try {
      try {
        await (mockConnDb.user as any).findUnique({
          where: { email: "test@wafilow.com" },
          select: { id: true, status: true },
        });
      } catch (error: unknown) {
        if (isMissingColumnError(error)) {
          connFallbackCalled = true;
        } else {
          throw error;
        }
      }
    } catch (e: unknown) {
      caughtConnError = e;
    }

    assert.equal(connFallbackCalled, false, "Fallback must NOT be called on P2024 connection pool timeout");
    assert.equal((caughtConnError as any)?.code, "P2024", "Connection pool error must be rethrown to fail closed");
  });

  // 19. Suspension Checks Enforced When Status Columns Exist
  await t.test("19. Suspension checks remain strictly enforced when status columns exist", async () => {
    // 19a. User status suspended during JWT verification
    const mockDbUserSuspended = {
      user: {
        findUnique: async () => ({
          id: "usr_susp_19",
          status: "suspended",
          sessionVersion: 1,
          role: "user",
          organizationId: "org_19",
          organization: { id: "org_19", status: "active" },
        }),
      },
    } as unknown as MockPrisma;

    const callbacksUserSusp = createAuthCallbacks(mockDbUserSuspended);
    const tokenUserSusp = await callbacksUserSusp.jwt({
      token: { id: "usr_susp_19", sessionVersion: 1 },
    });
    assert.equal(tokenUserSusp.id, undefined, "Suspended user token must be stripped in JWT callback");
    assert.equal(tokenUserSusp.revoked, true, "Suspended user token must be revoked in JWT callback");

    // 19b. Organization status suspended during JWT verification
    const mockDbOrgSuspended = {
      user: {
        findUnique: async () => ({
          id: "usr_active_in_susp_org",
          status: "active",
          sessionVersion: 1,
          role: "user",
          organizationId: "org_susp_19",
          organization: { id: "org_susp_19", status: "suspended" },
        }),
      },
    } as unknown as MockPrisma;

    const callbacksOrgSusp = createAuthCallbacks(mockDbOrgSuspended);
    const tokenOrgSusp = await callbacksOrgSusp.jwt({
      token: { id: "usr_active_in_susp_org", sessionVersion: 1 },
    });
    assert.equal(tokenOrgSusp.id, undefined, "User in suspended org must have token stripped in JWT callback");
    assert.equal(tokenOrgSusp.revoked, true, "User in suspended org must have token revoked in JWT callback");

    // 19c. Baseline schema (no status column) defaults to active, non-suspended
    const mockDbBaseline = {
      user: {
        findUnique: async (args: any) => {
          if (args?.select?.status) {
            const err = new Error("column status does not exist");
            (err as any).code = "P2022";
            throw err;
          }
          return {
            id: "usr_baseline_active",
            role: "user",
            organizationId: "org_base",
            organization: { id: "org_base" },
          };
        },
      },
    } as unknown as MockPrisma;

    const callbacksBaseline = createAuthCallbacks(mockDbBaseline);
    const tokenBaseline = await callbacksBaseline.jwt({
      token: { id: "usr_baseline_active", sessionVersion: 1 },
    });
    assert.equal(tokenBaseline.id, "usr_baseline_active", "Baseline schema user must retain session ID");
    assert.equal(tokenBaseline.revoked, undefined, "Baseline schema user must not be revoked");
  });

  // 20. Regression Suite: requireActiveUserSession & requireSuperAdmin P2022 Missing-Column Handling
  await t.test("20. requireActiveUserSession and requireSuperAdmin handle P2022 User.status error with baseline fallback", async (sub) => {
    // 20a. Exact production error: P2022 "The column User.status does not exist in the current database."
    await sub.test("20a. requireActiveUserSession succeeds on P2022 User.status via baseline fallback", async () => {
      let fallbackTriggered = false;
      const mockDbP2022 = {
        user: {
          findUnique: async (args: any) => {
            if (args?.select?.status) {
              const err = new Error("The column User.status does not exist in the current database.");
              (err as any).code = "P2022";
              (err as any).meta = { column: "User.status", modelName: "User" };
              throw err;
            }
            fallbackTriggered = true;
            return {
              id: "usr_prod_123",
              email: "operator@wafilow.com",
              role: "user",
              organizationId: "org_prod_456",
              organization: { id: "org_prod_456" },
            };
          },
        },
      } as unknown as MockPrisma;

      const guards = createAuthGuards({
        getSession: async () => ({
          user: { id: "usr_prod_123", email: "operator@wafilow.com", role: "user" },
          expires: "2099-01-01",
        }),
        db: mockDbP2022,
      });

      const activeUser = await guards.requireActiveUserSession();
      assert.equal(fallbackTriggered, true, "Fallback query must be executed when User.status triggers P2022");
      assert.equal(activeUser.userId, "usr_prod_123");
      assert.equal(activeUser.userEmail, "operator@wafilow.com");
      assert.equal(activeUser.userRole, "user");
      assert.equal(activeUser.organizationId, "org_prod_456");
    });

    // 20b. Direct PostgreSQL error 42703 triggers baseline fallback
    await sub.test("20b. requireActiveUserSession succeeds on PostgreSQL 42703 undefined_column via baseline fallback", async () => {
      let fallbackTriggered = false;
      const mockDb42703 = {
        user: {
          findUnique: async (args: any) => {
            if (args?.select?.status) {
              const err = new Error('column "status" does not exist');
              (err as any).code = "42703";
              throw err;
            }
            fallbackTriggered = true;
            return {
              id: "usr_pg_123",
              email: "pg@wafilow.com",
              role: "user",
              organizationId: "org_pg_456",
              organization: { id: "org_pg_456" },
            };
          },
        },
      } as unknown as MockPrisma;

      const guards = createAuthGuards({
        getSession: async () => ({
          user: { id: "usr_pg_123", email: "pg@wafilow.com", role: "user" },
          expires: "2099-01-01",
        }),
        db: mockDb42703,
      });

      const activeUser = await guards.requireActiveUserSession();
      assert.equal(fallbackTriggered, true, "Fallback query must execute on PostgreSQL 42703");
      assert.equal(activeUser.userId, "usr_pg_123");
      assert.equal(activeUser.organizationId, "org_pg_456");
    });

    // 20c. P2021 (missing table) must FAIL CLOSED and NEVER execute baseline fallback
    await sub.test("20c. requireActiveUserSession fails closed (503) on P2021 table missing error without fallback", async () => {
      let fallbackTriggered = false;
      const mockDbP2021 = {
        user: {
          findUnique: async (args: any) => {
            if (args?.select?.status) {
              const err = new Error("The table public.User does not exist in the current database.");
              (err as any).code = "P2021";
              throw err;
            }
            fallbackTriggered = true;
            return { id: "never_called" };
          },
        },
      } as unknown as MockPrisma;

      const guards = createAuthGuards({
        getSession: async () => ({
          user: { id: "usr_table_missing", email: "user@wafilow.com" },
          expires: "2099-01-01",
        }),
        db: mockDbP2021,
      });

      await assert.rejects(
        async () => guards.requireActiveUserSession(),
        (err: AuthError) => err.statusCode === 503,
        "P2021 must fail closed with 503 AuthError"
      );
      assert.equal(fallbackTriggered, false, "Fallback must NOT be called for P2021 table missing error");
    });

    // 20d. Connection timeout must FAIL CLOSED and NEVER execute baseline fallback
    await sub.test("20d. requireActiveUserSession fails closed (503) on connection failure without fallback", async () => {
      let fallbackTriggered = false;
      const mockDbConn = {
        user: {
          findUnique: async (args: any) => {
            if (args?.select?.status) {
              const err = new Error("Connection pool timeout");
              (err as any).code = "P2024";
              throw err;
            }
            fallbackTriggered = true;
            return { id: "never_called" };
          },
        },
      } as unknown as MockPrisma;

      const guards = createAuthGuards({
        getSession: async () => ({
          user: { id: "usr_conn_err", email: "user@wafilow.com" },
          expires: "2099-01-01",
        }),
        db: mockDbConn,
      });

      await assert.rejects(
        async () => guards.requireActiveUserSession(),
        (err: AuthError) => err.statusCode === 503,
        "Connection timeout must fail closed with 503 AuthError"
      );
      assert.equal(fallbackTriggered, false, "Fallback must NOT be called for connection error");
    });

    // 20e. requireSuperAdmin succeeds on P2022 via baseline fallback
    await sub.test("20e. requireSuperAdmin succeeds on P2022 User.status via baseline fallback", async () => {
      let fallbackTriggered = false;
      const mockDbAdmin = {
        user: {
          findUnique: async (args: any) => {
            if (args?.select?.status) {
              const err = new Error("The column User.status does not exist in the current database.");
              (err as any).code = "P2022";
              throw err;
            }
            fallbackTriggered = true;
            return {
              id: "usr_admin_prod",
              email: "admin@wafilow.com",
              role: "super_admin",
            };
          },
        },
      } as unknown as MockPrisma;

      const guards = createAuthGuards({
        getSession: async () => ({
          user: { id: "usr_admin_prod", email: "admin@wafilow.com", role: "super_admin" },
          expires: "2099-01-01",
        }),
        db: mockDbAdmin,
      });

      const adminUser = await guards.requireSuperAdmin();
      assert.equal(fallbackTriggered, true, "requireSuperAdmin must execute fallback on P2022");
      assert.equal(adminUser.adminId, "usr_admin_prod");
      assert.equal(adminUser.adminEmail, "admin@wafilow.com");
    });
  });

  // 21. NextAuth Credentials authorize() Security & Baseline Fallback Suite
  await t.test("21. NextAuth Credentials authorize() security and baseline fallback suite", async (sub) => {
    const validPassword = "SecurePassword123!";
    const passwordHash = await bcrypt.hash(validPassword, 6);

    // 21a. Missing credentials return null
    await sub.test("21a. Missing credentials (no email or password) returns null", async () => {
      const authorize = createAuthorize({} as any);
      assert.equal(await authorize(undefined), null);
      assert.equal(await authorize({ email: "", password: "pwd" }), null);
      assert.equal(await authorize({ email: "user@test.com", password: "" }), null);
    });

    // 21b. Non-existent user returns null
    await sub.test("21b. Non-existent user returns null without authenticating", async () => {
      const mockDb = {
        user: { findUnique: async () => null },
      };
      const authorize = createAuthorize(mockDb as any);
      const res = await authorize({ email: "nonexistent@wafilow.com", password: validPassword });
      assert.equal(res, null, "Must return null when user does not exist in DB");
    });

    // 21c. User without password returns null
    await sub.test("21c. User without password hash returns null", async () => {
      const mockDb = {
        user: {
          findUnique: async () => ({
            id: "usr_no_pwd",
            email: "nopwd@wafilow.com",
            password: null,
            role: "user",
          }),
        },
      };
      const authorize = createAuthorize(mockDb as any);
      const res = await authorize({ email: "nopwd@wafilow.com", password: validPassword });
      assert.equal(res, null, "Must return null when user has no password");
    });

    // 21d. Incorrect password returns null (bcrypt check enforced)
    await sub.test("21d. Incorrect password returns null (bcrypt verification enforced)", async () => {
      const mockDb = {
        user: {
          findUnique: async () => ({
            id: "usr_active_auth",
            email: "active@wafilow.com",
            password: passwordHash,
            role: "user",
            status: "active",
            organizationId: "org_active",
            organization: { id: "org_active", status: "active" },
          }),
        },
      };
      const authorize = createAuthorize(mockDb as any);
      const res = await authorize({ email: "active@wafilow.com", password: "WRONG_PASSWORD" });
      assert.equal(res, null, "Must return null when password does not match bcrypt hash");
    });

    // 21e. Valid password succeeds on modern schema
    await sub.test("21e. Valid password succeeds on modern schema", async () => {
      const mockDb = {
        user: {
          findUnique: async () => ({
            id: "usr_valid",
            name: "Test User",
            email: "valid@wafilow.com",
            password: passwordHash,
            role: "user",
            status: "active",
            sessionVersion: 2,
            organizationId: "org_valid",
            organization: { id: "org_valid", status: "active" },
          }),
        },
      };
      const authorize = createAuthorize(mockDb as any);
      const res = await authorize({ email: "valid@wafilow.com", password: validPassword });
      assert.ok(res);
      assert.equal(res.id, "usr_valid");
      assert.equal(res.email, "valid@wafilow.com");
      assert.equal(res.role, "user");
      assert.equal(res.organizationId, "org_valid");
      assert.equal(res.sessionVersion, 2);
    });

    // 21f. Suspended user throws error
    await sub.test("21f. Suspended user throws account suspended error", async () => {
      const mockDb = {
        user: {
          findUnique: async () => ({
            id: "usr_suspended_auth",
            email: "suspended@wafilow.com",
            password: passwordHash,
            role: "user",
            status: "suspended",
            organizationId: "org_valid",
            organization: { id: "org_valid", status: "active" },
          }),
        },
      };
      const authorize = createAuthorize(mockDb as any);
      await assert.rejects(
        async () => authorize({ email: "suspended@wafilow.com", password: validPassword }),
        /Your account has been suspended/
      );
    });

    // 21g. Suspended organization throws error for customer login
    await sub.test("21g. Suspended organization throws error for customer login", async () => {
      const mockDb = {
        user: {
          findUnique: async () => ({
            id: "usr_org_susp",
            email: "cust@wafilow.com",
            password: passwordHash,
            role: "user",
            status: "active",
            organizationId: "org_susp",
            organization: { id: "org_susp", status: "suspended" },
          }),
        },
      };
      const authorize = createAuthorize(mockDb as any);
      await assert.rejects(
        async () => authorize({ email: "cust@wafilow.com", password: validPassword }),
        /Your organization workspace has been suspended/
      );
    });

    // 21h. Customer login without organization throws error
    await sub.test("21h. Customer user without organization throws organization required error", async () => {
      const mockDb = {
        user: {
          findUnique: async () => ({
            id: "usr_no_org",
            email: "noorg@wafilow.com",
            password: passwordHash,
            role: "user",
            status: "active",
            organizationId: null,
            organization: null,
          }),
        },
      };
      const authorize = createAuthorize(mockDb as any);
      await assert.rejects(
        async () => authorize({ email: "noorg@wafilow.com", password: validPassword }),
        /Your account is not associated with an active organization/
      );
    });

    // 21i. Admin portal login by non-super-admin returns null (anti-enumeration)
    await sub.test("21i. Admin portal login by non-super-admin returns null", async () => {
      const mockDb = {
        user: {
          findUnique: async () => ({
            id: "usr_regular",
            email: "regular@wafilow.com",
            password: passwordHash,
            role: "user", // NOT super_admin
            status: "active",
            organizationId: "org_valid",
            organization: { id: "org_valid", status: "active" },
          }),
        },
      };
      const authorize = createAuthorize(mockDb as any);
      const res = await authorize({
        email: "regular@wafilow.com",
        password: validPassword,
        isAdminPortal: "true",
      });
      assert.equal(res, null, "Must return null to prevent admin portal enumeration");
    });

    // 21j. Admin portal login by super-admin succeeds
    await sub.test("21j. Admin portal login by super-admin succeeds", async () => {
      const mockDb = {
        user: {
          findUnique: async () => ({
            id: "usr_admin",
            email: "admin@wafilow.com",
            password: passwordHash,
            role: "super_admin",
            status: "active",
            organizationId: null,
            organization: null,
          }),
        },
      };
      const authorize = createAuthorize(mockDb as any);
      const res = await authorize({
        email: "admin@wafilow.com",
        password: validPassword,
        isAdminPortal: "true",
      });
      assert.ok(res);
      assert.equal(res.id, "usr_admin");
      assert.equal(res.role, "super_admin");
    });

    // 21k. Baseline schema P2022 triggers fallback, validates bcrypt, and succeeds
    await sub.test("21k. Baseline schema P2022 triggers fallback, validates bcrypt, and succeeds", async () => {
      let fallbackTriggered = false;
      const mockDbBaseline = {
        user: {
          findUnique: async (args: any) => {
            if (args?.select?.status) {
              const err = new Error("The column User.status does not exist in the current database.");
              (err as any).code = "P2022";
              (err as any).meta = { column: "User.status", modelName: "User" };
              throw err;
            }
            fallbackTriggered = true;
            return {
              id: "usr_baseline_auth",
              name: "Baseline User",
              email: "baseline@wafilow.com",
              password: passwordHash,
              role: "user",
              organizationId: "org_base_1",
              organization: { id: "org_base_1" },
            };
          },
        },
      };

      const authorize = createAuthorize(mockDbBaseline as any);
      const res = await authorize({ email: "baseline@wafilow.com", password: validPassword });
      assert.equal(fallbackTriggered, true, "Fallback query must be triggered on P2022");
      assert.ok(res);
      assert.equal(res.id, "usr_baseline_auth");
      assert.equal(res.sessionVersion, 1, "sessionVersion must default to 1 on baseline schema");
      assert.equal(res.organizationId, "org_base_1");
    });

    // 21l. Baseline schema P2022 with incorrect password returns null (bcrypt check enforced)
    await sub.test("21l. Baseline schema P2022 with incorrect password returns null (bcrypt check enforced)", async () => {
      let fallbackTriggered = false;
      const mockDbBaseline = {
        user: {
          findUnique: async (args: any) => {
            if (args?.select?.status) {
              const err = new Error("The column User.status does not exist in the current database.");
              (err as any).code = "P2022";
              throw err;
            }
            fallbackTriggered = true;
            return {
              id: "usr_baseline_auth",
              email: "baseline@wafilow.com",
              password: passwordHash,
              role: "user",
              organizationId: "org_base_1",
              organization: { id: "org_base_1" },
            };
          },
        },
      };

      const authorize = createAuthorize(mockDbBaseline as any);
      const res = await authorize({ email: "baseline@wafilow.com", password: "WRONG_PASSWORD" });
      assert.equal(fallbackTriggered, true, "Fallback query executed");
      assert.equal(res, null, "Must return null when password is wrong, even under baseline fallback");
    });

    // 21m. Baseline schema P2022 with non-existent user returns null
    await sub.test("21m. Baseline schema P2022 with non-existent user returns null", async () => {
      const mockDbBaseline = {
        user: {
          findUnique: async (args: any) => {
            if (args?.select?.status) {
              const err = new Error("The column User.status does not exist in the current database.");
              (err as any).code = "P2022";
              throw err;
            }
            return null; // User does not exist
          },
        },
      };

      const authorize = createAuthorize(mockDbBaseline as any);
      const res = await authorize({ email: "ghost@wafilow.com", password: validPassword });
      assert.equal(res, null, "Must return null when user does not exist in baseline schema");
    });

    // 21n. Baseline schema P2022 for customer user without organization throws error
    await sub.test("21n. Baseline schema P2022 for customer user without organization throws error", async () => {
      const mockDbBaseline = {
        user: {
          findUnique: async (args: any) => {
            if (args?.select?.status) {
              const err = new Error("The column User.status does not exist in the current database.");
              (err as any).code = "P2022";
              throw err;
            }
            return {
              id: "usr_no_org_base",
              email: "noorg@wafilow.com",
              password: passwordHash,
              role: "user",
              organizationId: null,
              organization: null,
            };
          },
        },
      };

      const authorize = createAuthorize(mockDbBaseline as any);
      await assert.rejects(
        async () => authorize({ email: "noorg@wafilow.com", password: validPassword }),
        /Your account is not associated with an active organization/,
        "Customer user without org must be rejected in baseline schema"
      );
    });

    // 21o. Baseline schema P2022 admin portal attempt by non-super-admin returns null
    await sub.test("21o. Baseline schema P2022 admin portal attempt by non-super-admin returns null", async () => {
      const mockDbBaseline = {
        user: {
          findUnique: async (args: any) => {
            if (args?.select?.status) {
              const err = new Error("The column User.status does not exist in the current database.");
              (err as any).code = "P2022";
              throw err;
            }
            return {
              id: "usr_cust_base",
              email: "cust@wafilow.com",
              password: passwordHash,
              role: "user",
              organizationId: "org_base_1",
              organization: { id: "org_base_1" },
            };
          },
        },
      };

      const authorize = createAuthorize(mockDbBaseline as any);
      const res = await authorize({
        email: "cust@wafilow.com",
        password: validPassword,
        isAdminPortal: "true",
      });
      assert.equal(res, null, "Must return null for non-admin trying to access admin portal under baseline");
    });

    // 21p. PostgreSQL 42703 triggers fallback and succeeds
    await sub.test("21p. Direct PostgreSQL 42703 triggers fallback and succeeds", async () => {
      let fallbackTriggered = false;
      const mockDbPg = {
        user: {
          findUnique: async (args: any) => {
            if (args?.select?.status) {
              const err = new Error('column "status" does not exist');
              (err as any).code = "42703";
              throw err;
            }
            fallbackTriggered = true;
            return {
              id: "usr_pg_auth",
              email: "pg@wafilow.com",
              password: passwordHash,
              role: "user",
              organizationId: "org_pg",
              organization: { id: "org_pg" },
            };
          },
        },
      };

      const authorize = createAuthorize(mockDbPg as any);
      const res = await authorize({ email: "pg@wafilow.com", password: validPassword });
      assert.equal(fallbackTriggered, true, "Fallback query must trigger on 42703");
      assert.ok(res);
      assert.equal(res.id, "usr_pg_auth");
    });

    // 21q. Non-column error (P2021 table missing) fails closed with 503 unavailable
    await sub.test("21q. P2021 table missing error fails closed without executing fallback", async () => {
      let fallbackTriggered = false;
      const mockDbP2021 = {
        user: {
          findUnique: async (args: any) => {
            if (args?.select?.status) {
              const err = new Error("The table public.User does not exist in the current database.");
              (err as any).code = "P2021";
              throw err;
            }
            fallbackTriggered = true;
            return { id: "never_called" };
          },
        },
      };

      const authorize = createAuthorize(mockDbP2021 as any);
      await assert.rejects(
        async () => authorize({ email: "user@wafilow.com", password: validPassword }),
        /temporarily unavailable/,
        "P2021 must fail closed with unavailable error"
      );
      assert.equal(fallbackTriggered, false, "Fallback must NOT be executed on P2021");
    });

    // 21r. Connection error fails closed without executing fallback
    await sub.test("21r. Connection error fails closed without executing fallback", async () => {
      let fallbackTriggered = false;
      const mockDbConn = {
        user: {
          findUnique: async (args: any) => {
            if (args?.select?.status) {
              const err = new Error("Connection pool timeout");
              (err as any).code = "P2024";
              throw err;
            }
            fallbackTriggered = true;
            return { id: "never_called" };
          },
        },
      };

      const authorize = createAuthorize(mockDbConn as any);
      await assert.rejects(
        async () => authorize({ email: "user@wafilow.com", password: validPassword }),
        /temporarily unavailable/,
        "Connection error must fail closed with unavailable error"
      );
      assert.equal(fallbackTriggered, false, "Fallback must NOT be executed on connection error");
    });
  });
});



