/**
 * Wafilow Temporary One-Time Vercel Production Owner Activation Tests
 *
 * Verifies all fail-closed safety gates on scripts/activate-owner-once.ts:
 * 1. Dormant no-op when ONE_TIME_OWNER_ACTIVATION is not "true".
 * 2. Refuses non-production VERCEL_ENV (preview / development / empty).
 * 3. Requires CONFIRM_BOOTSTRAP=true and strong SUPER_ADMIN_PASSWORD.
 * 4. Verifies Neon PostgreSQL host (*.neon.tech), database name (neondb),
 *    and Neon branch_name === "production" (rejects staging/preview/backup branches).
 * 5. Enforces single-owner exclusivity and requires existing registered account.
 * 6. Promotes existing owner to super_admin, hashes new password with bcrypt,
 *    preserves all ordinary customers, enables /admin/login auth, and skips
 *    idempotently on a second run once already super_admin.
 * 7. Never leaks raw password or DATABASE_URL in console output or error messages.
 */

import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { activateOwnerOnce, assertNeonProductionDatabaseUrl } from "../scripts/activate-owner-once";
import { createAuthorize, createAuthCallbacks } from "../lib/auth";
import { createAuthGuards } from "../lib/admin-auth";

const MOCK_NEON_PROD_URL =
  "postgresql://neondb_owner:SuperSecretDbPass999@ep-wafilow-prod-123456.us-east-2.aws.neon.tech/neondb?sslmode=require";

test("One-Time Vercel Production Owner Activation Suite", async (t) => {
  await t.test("is a dormant no-op when ONE_TIME_OWNER_ACTIVATION is not true", async () => {
    const res = await activateOwnerOnce({
      enabled: false,
      vercelEnv: "development",
      confirmed: false,
      email: "",
      password: "",
      databaseUrl: "",
    });
    assert.equal(res.executed, false);
    assert.equal(res.skipped, true);
    assert.equal(res.reason, "NOT_ARMED");
  });

  await t.test("aborts if VERCEL_ENV is not production (blocks preview and development)", async () => {
    await assert.rejects(
      async () => {
        await activateOwnerOnce({
          enabled: true,
          vercelEnv: "preview",
          confirmed: true,
          email: "owner@example.com",
          password: "NewStrongOwnerPassword2026!",
          databaseUrl: MOCK_NEON_PROD_URL,
        });
      },
      { message: /only run when VERCEL_ENV=production/ }
    );
  });

  await t.test("aborts if CONFIRM_BOOTSTRAP is not true or SUPER_ADMIN_PASSWORD is missing/weak", async () => {
    await assert.rejects(
      async () => {
        await activateOwnerOnce({
          enabled: true,
          vercelEnv: "production",
          confirmed: false,
          email: "owner@example.com",
          password: "NewStrongOwnerPassword2026!",
          databaseUrl: MOCK_NEON_PROD_URL,
        });
      },
      { message: /CONFIRM_BOOTSTRAP=true is required/ }
    );

    await assert.rejects(
      async () => {
        await activateOwnerOnce({
          enabled: true,
          vercelEnv: "production",
          confirmed: true,
          email: "owner@example.com",
          password: "",
          databaseUrl: MOCK_NEON_PROD_URL,
        });
      },
      { message: /at least 8 characters/ }
    );
  });

  await t.test("rejects non-Neon DATABASE_URL, wrong database name, or non-production Neon branch", async () => {
    assert.throws(
      () => assertNeonProductionDatabaseUrl("postgresql://user:pass@localhost:5432/neondb"),
      { message: /Neon PostgreSQL host/ }
    );

    // Wrong database name
    await assert.rejects(
      async () => {
        await activateOwnerOnce({
          enabled: true,
          vercelEnv: "production",
          confirmed: true,
          email: "owner@example.com",
          password: "NewStrongOwnerPassword2026!",
          databaseUrl: MOCK_NEON_PROD_URL,
          db: {
            $queryRawUnsafe: async () => [
              { database_name: "staging_db", branch_name: "production", user_table: '"User"' },
            ],
          },
        });
      },
      { message: /does not match expected production database/ }
    );

    // Wrong Neon branch (e.g., staging or backup branch)
    await assert.rejects(
      async () => {
        await activateOwnerOnce({
          enabled: true,
          vercelEnv: "production",
          confirmed: true,
          email: "owner@example.com",
          password: "NewStrongOwnerPassword2026!",
          databaseUrl: MOCK_NEON_PROD_URL,
          db: {
            $queryRawUnsafe: async () => [
              {
                database_name: "neondb",
                branch_name: "wafilow-pre-superadmin-20261127",
                user_table: '"User"',
              },
            ],
          },
        });
      },
      { message: /Refusing to run on Neon branch/ }
    );
  });

  await t.test("rejects when another super_admin exists or when target account does not exist", async () => {
    // Another super_admin exists
    await assert.rejects(
      async () => {
        await activateOwnerOnce({
          enabled: true,
          vercelEnv: "production",
          confirmed: true,
          email: "newowner@example.com",
          password: "NewStrongOwnerPassword2026!",
          databaseUrl: MOCK_NEON_PROD_URL,
          db: {
            $queryRawUnsafe: async () => [
              { database_name: "neondb", branch_name: "production", user_table: '"User"' },
            ],
            user: {
              findMany: async () => [
                { id: "owner-0", email: "existing-owner@example.com", role: "super_admin" },
              ],
            },
          },
        });
      },
      { message: /Single-owner policy blocks activation/ }
    );

    // Existing account not found (never creates a rogue user)
    await assert.rejects(
      async () => {
        await activateOwnerOnce({
          enabled: true,
          vercelEnv: "production",
          confirmed: true,
          email: "missing@example.com",
          password: "NewStrongOwnerPassword2026!",
          databaseUrl: MOCK_NEON_PROD_URL,
          db: {
            $queryRawUnsafe: async () => [
              { database_name: "neondb", branch_name: "production", user_table: '"User"' },
            ],
            user: {
              findMany: async () => [],
              findUnique: async () => null,
              findFirst: async () => null,
            },
          },
        });
      },
      { message: /Existing registered account.*was not found/ }
    );
  });

  await t.test(
    "promotes existing owner with new bcrypt password, skips on second run, preserves customers, and leaks zero secrets",
    async () => {
      const oldOwnerHash = await bcrypt.hash("OldPasswordBeforeReset1!", 10);
      const customerHash = await bcrypt.hash("CustomerPasswordKeep1!", 10);
      const newOwnerPassword = "UniqueStrongProdPassword#2026!";

      const users = [
        {
          id: "usr-owner-1",
          name: "Platform Owner",
          email: "owner@example.com",
          password: oldOwnerHash,
          role: "customer",
          status: "active",
          sessionVersion: 1,
          organizationId: "org-owner",
          organization: { id: "org-owner", status: "active" },
        },
        {
          id: "usr-cust-1",
          name: "Customer One",
          email: "customer@example.com",
          password: customerHash,
          role: "customer",
          status: "active",
          sessionVersion: 1,
          organizationId: "org-cust",
          organization: { id: "org-cust", status: "active" },
        },
      ];

      let updateCount = 0;
      const mockDb = {
        $queryRawUnsafe: async () => [
          { database_name: "neondb", branch_name: "", user_table: '"User"' },
        ],
        user: {
          findMany: async ({ where }: { where?: { role?: string } }) =>
            users.filter((u) => !where?.role || u.role === where.role),
          findUnique: async ({ where }: { where: { id?: string; email?: string } }) =>
            users.find((u) => (where.id ? u.id === where.id : u.email === where.email)) || null,
          findFirst: async ({ where }: { where: { email?: { equals?: string } } }) => {
            const target = where.email?.equals?.toLowerCase();
            return users.find((u) => u.email.toLowerCase() === target) || null;
          },
          update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
            updateCount++;
            const target = users.find((u) => u.id === where.id);
            if (!target) throw new Error("Not found");
            if (typeof data.role === "string") target.role = data.role;
            if (typeof data.status === "string") target.status = data.status;
            if (typeof data.password === "string") target.password = data.password;
            if (
              data.sessionVersion &&
              typeof data.sessionVersion === "object" &&
              "increment" in data.sessionVersion
            ) {
              target.sessionVersion += (data.sessionVersion as { increment: number }).increment;
            }
            return { id: target.id, email: target.email, role: target.role };
          },
        },
      };

      const capturedLogs: string[] = [];
      const origLog = console.log;
      const origError = console.error;
      console.log = (...args: unknown[]) => capturedLogs.push(args.map(String).join(" "));
      console.error = (...args: unknown[]) => capturedLogs.push(args.map(String).join(" "));

      try {
        // First run: promotes owner and sets new bcrypt password
        const firstRes = await activateOwnerOnce({
          enabled: true,
          vercelEnv: "production",
          confirmed: true,
          email: "owner@example.com",
          password: newOwnerPassword,
          databaseUrl: MOCK_NEON_PROD_URL,
          db: mockDb,
        });

        assert.equal(firstRes.executed, true);
        assert.equal(firstRes.skipped, false);
        assert.equal(firstRes.superAdminId, "usr-owner-1");
        assert.equal(users[0].role, "super_admin");
        assert.equal(users[0].sessionVersion, 2);
        assert.notEqual(users[0].password, oldOwnerHash);
        assert.equal(await bcrypt.compare(newOwnerPassword, users[0].password), true);

        // Customer account & permissions completely preserved
        assert.equal(users[1].role, "customer");
        assert.equal(users[1].password, customerHash);
        assert.equal(users[1].sessionVersion, 1);

        // Verify /admin/login (isAdminPortal=true) + requireSuperAdmin() succeed with new password
        const authorize = createAuthorize(mockDb);
        const callbacks = createAuthCallbacks(mockDb);

        const oldPassLogin = await authorize({
          email: "owner@example.com",
          password: "OldPasswordBeforeReset1!",
          isAdminPortal: "true",
        });
        assert.equal(oldPassLogin, null, "Old password must no longer work after rotation");

        const newPassLogin = await authorize({
          email: "owner@example.com",
          password: newOwnerPassword,
          isAdminPortal: "true",
        });
        assert.ok(newPassLogin, "Owner must authenticate at /admin/login with new password");
        assert.equal(newPassLogin.role, "super_admin");

        const token = await callbacks.jwt({ token: {}, user: newPassLogin });
        const session = await callbacks.session({
          session: { expires: "2099-01-01", user: { id: newPassLogin.id } },
          token,
        });
        const guards = createAuthGuards({
          getSession: async () => session,
          db: mockDb,
        });
        const verified = await guards.requireSuperAdmin();
        assert.equal(verified.adminId, "usr-owner-1");

        // Ordinary customer remains denied on /admin/login
        const customerLogin = await authorize({
          email: "customer@example.com",
          password: "CustomerPasswordKeep1!",
          isAdminPortal: "true",
        });
        assert.equal(customerLogin, null);

        // Second run (accidental rebuild before env var removal): skips cleanly as one-time no-op
        const countBeforeSecondRun = updateCount;
        const secondRes = await activateOwnerOnce({
          enabled: true,
          vercelEnv: "production",
          confirmed: true,
          email: "owner@example.com",
          password: newOwnerPassword,
          databaseUrl: MOCK_NEON_PROD_URL,
          db: mockDb,
        });

        assert.equal(secondRes.executed, false);
        assert.equal(secondRes.skipped, true);
        assert.equal(secondRes.reason, "ALREADY_SUPER_ADMIN");
        assert.equal(updateCount, countBeforeSecondRun, "Second run must not write to DB");
        assert.equal(users[0].sessionVersion, 2, "Second run must not revoke owner session");
      } finally {
        console.log = origLog;
        console.error = origError;
      }

      // Verify zero credential/secret leakage in logs
      const allLogOutput = capturedLogs.join("\n");
      assert.equal(allLogOutput.includes(newOwnerPassword), false, "Password must never appear in logs");
      assert.equal(allLogOutput.includes("SuperSecretDbPass999"), false, "DB password must never appear in logs");
      assert.equal(allLogOutput.includes(users[0].password), false, "Bcrypt hash must never appear in logs");
    }
  );
});
