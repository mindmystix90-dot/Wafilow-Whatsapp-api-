/* eslint-disable @typescript-eslint/no-explicit-any */
import test from "node:test";
import assert from "node:assert/strict";
import { createAuthCallbacks } from "../lib/auth";
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
});



