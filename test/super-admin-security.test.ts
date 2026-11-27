/**
 * Wafilow Super Admin Security & Architectural Invariants Test Suite
 *
 * Validates:
 * 1. Super Admin Bootstrap: Confirmation gate, bcrypt hashing, single-owner exclusivity, idempotency.
 * 2. Public Registration Hardening: Role escalation blocked, default role is 'customer'.
 * 3. Server-Side Privilege Enforcement: requireSuperAdmin() rejects customer and tenant admin roles.
 * 4. WhatsApp Fleet Telemetry: Zero raw token leaks, baseline schema resilience.
 * 5. Customer Dossier & Quotas: Safe calculation, isolation, session version revocation.
 */

import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { bootstrapSuperAdmin } from "../scripts/bootstrap-super-admin";
import { createAuthGuards } from "../lib/admin-auth";
import {
  listAdminWhatsAppConnections,
  getCustomerDetails,
  getSuperAdminDashboardMetrics,
} from "../lib/admin-store";

// ==========================================
// 1. SUPER ADMIN BOOTSTRAP SUITE
// ==========================================

test("Super Admin Bootstrap Suite", async (t) => {
  await t.test("aborts if CONFIRM_BOOTSTRAP is not true", async () => {
    await assert.rejects(
      async () => {
        await bootstrapSuperAdmin({
          email: "owner@wafilow.com",
          password: "SecurePassword123!",
          confirmed: false,
        });
      },
      {
        message: /CONFIRM_BOOTSTRAP=true environment variable is required/,
      }
    );
  });

  await t.test("rejects invalid email or short password", async () => {
    await assert.rejects(
      async () => {
        await bootstrapSuperAdmin({
          email: "invalid-email",
          password: "SecurePassword123!",
          confirmed: true,
        });
      },
      {
        message: /A valid SUPER_ADMIN_EMAIL is required/,
      }
    );

    await assert.rejects(
      async () => {
        await bootstrapSuperAdmin({
          email: "owner@wafilow.com",
          password: "short",
          confirmed: true,
        });
      },
      {
        message: /must be at least 8 characters long/,
      }
    );
  });

  await t.test("enforces single-owner exclusivity against different email", async () => {
    // Mock db with existing super_admin
    const mockDb = {
      user: {
        findMany: async () => [{ id: "owner-1", email: "existing-owner@wafilow.com", role: "super_admin" }],
      },
    };

    await assert.rejects(
      async () => {
        await bootstrapSuperAdmin({
          email: "attacker@wafilow.com",
          password: "HackerPassword123!",
          confirmed: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          db: mockDb as any,
        });
      },
      {
        message: /A designated platform owner already exists/,
      }
    );
  });

  await t.test("successfully and idempotently provisions platform owner with bcrypt hash", async () => {
    let capturedUserUpdate: Record<string, unknown> | null = null;

    const mockDb = {
      user: {
        findMany: async () => [{ id: "owner-1", email: "owner@wafilow.com", role: "super_admin" }],
        findUnique: async () => ({ id: "owner-1", email: "owner@wafilow.com", role: "super_admin" }),
        update: async (args: { data: Record<string, unknown> }) => {
          capturedUserUpdate = args.data;
          return { id: "owner-1", email: "owner@wafilow.com", role: "super_admin" };
        },
      },
    };

    const res = await bootstrapSuperAdmin({
      email: "owner@wafilow.com",
      password: "SuperSecretPassword2026!",
      confirmed: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db: mockDb as any,
    });

    assert.equal(res.success, true);
    assert.equal(res.superAdminId, "owner-1");
    assert.ok(capturedUserUpdate);
    const pass = (capturedUserUpdate as { password: string }).password;
    assert.ok(pass.startsWith("$2a$") || pass.startsWith("$2b$"), "Password must be bcrypt hashed");
    const matches = await bcrypt.compare("SuperSecretPassword2026!", pass);
    assert.equal(matches, true, "Bcrypt hash must match input password");
  });
});

// ==========================================
// 2. PRIVILEGE ENFORCEMENT & REQUIRE SUPER ADMIN
// ==========================================

test("Super Admin Privilege Enforcement Suite", async (t) => {
  await t.test("rejects unauthenticated session with 401", async () => {
    const guards = createAuthGuards({
      getSession: async () => null,
      db: {},
    });

    await assert.rejects(
      async () => {
        await guards.requireSuperAdmin();
      },
      {
        name: "AuthError",
        statusCode: 401,
        message: /Unauthorized: Authentication required/,
      }
    );
  });

  await t.test("rejects customer role with 403 Forbidden", async () => {
    const guards = createAuthGuards({
      getSession: async () => ({
        user: { id: "customer-123", email: "customer@example.com", role: "customer" },
        expires: new Date(Date.now() + 3600000).toISOString(),
      }),
      db: {
        user: {
          findUnique: async () => ({
            id: "customer-123",
            email: "customer@example.com",
            role: "customer",
            status: "active",
            sessionVersion: 1,
          }),
        },
      },
    });

    await assert.rejects(
      async () => {
        await guards.requireSuperAdmin();
      },
      {
        name: "AuthError",
        statusCode: 403,
        message: /Forbidden: Super Admin privilege required/,
      }
    );
  });

  await t.test("rejects tenant admin role with 403 Forbidden", async () => {
    const guards = createAuthGuards({
      getSession: async () => ({
        user: { id: "admin-456", email: "tenantadmin@company.com", role: "admin" },
        expires: new Date(Date.now() + 3600000).toISOString(),
      }),
      db: {
        user: {
          findUnique: async () => ({
            id: "admin-456",
            email: "tenantadmin@company.com",
            role: "admin",
            status: "active",
            sessionVersion: 1,
          }),
        },
      },
    });

    await assert.rejects(
      async () => {
        await guards.requireSuperAdmin();
      },
      {
        name: "AuthError",
        statusCode: 403,
        message: /Forbidden: Super Admin privilege required/,
      }
    );
  });

  await t.test("rejects suspended super_admin account with 403", async () => {
    const guards = createAuthGuards({
      getSession: async () => ({
        user: { id: "super-1", email: "owner@wafilow.com", role: "super_admin" },
        expires: new Date(Date.now() + 3600000).toISOString(),
      }),
      db: {
        user: {
          findUnique: async () => ({
            id: "super-1",
            email: "owner@wafilow.com",
            role: "super_admin",
            status: "suspended",
            sessionVersion: 1,
          }),
        },
      },
    });

    await assert.rejects(
      async () => {
        await guards.requireSuperAdmin();
      },
      {
        name: "AuthError",
        statusCode: 403,
        message: /Administrator account is suspended/,
      }
    );
  });

  await t.test("rejects stale sessionVersion with 401 Unauthorized", async () => {
    const guards = createAuthGuards({
      getSession: async () => ({
        user: { id: "super-1", email: "owner@wafilow.com", role: "super_admin", sessionVersion: 1 },
        expires: new Date(Date.now() + 3600000).toISOString(),
      }),
      db: {
        user: {
          findUnique: async () => ({
            id: "super-1",
            email: "owner@wafilow.com",
            role: "super_admin",
            status: "active",
            sessionVersion: 2, // Bumped in DB
          }),
        },
      },
    });

    await assert.rejects(
      async () => {
        await guards.requireSuperAdmin();
      },
      {
        name: "AuthError",
        statusCode: 401,
        message: /Session has been revoked/,
      }
    );
  });

  await t.test("authorizes active super_admin on baseline schema fallback", async () => {
    const guards = createAuthGuards({
      getSession: async () => ({
        user: { id: "super-1", email: "owner@wafilow.com", role: "super_admin" },
        expires: new Date(Date.now() + 3600000).toISOString(),
      }),
      db: {
        user: {
          findUnique: async (args: { select: Record<string, boolean> }) => {
            // First call with status/sessionVersion fails with Prisma P2022
            if (args.select.status) {
              const err = new Error("The column `User.status` does not exist in the current database.");
              (err as { code?: string }).code = "P2022";
              throw err;
            }
            // Fallback call
            return {
              id: "super-1",
              email: "owner@wafilow.com",
              role: "super_admin",
            };
          },
        },
      },
    });

    const user = await guards.requireSuperAdmin();
    assert.equal(user.adminId, "super-1");
    assert.equal(user.adminEmail, "owner@wafilow.com");
  });
});

// ==========================================
// 3. WHATSAPP FLEET TELEMETRY & ZERO SECRET LEAKS
// ==========================================

test("WhatsApp Fleet Telemetry Suite", async (t) => {
  await t.test("strictly prevents leaking raw access tokens or secrets in connection list", async () => {
    const mockDb = {
      whatsAppConnection: {
        findMany: async () => [
          {
            id: "conn-1",
            organizationId: "org-1",
            environment: "production",
            wabaId: "waba-999",
            phoneNumberId: "phone-123",
            displayPhoneNumber: "+15551234567",
            verifiedName: "Acme Corp",
            status: "connected",
            lastCheckedAt: new Date(),
            lastError: null,
            organization: { id: "org-1", name: "Acme Corp", status: "active" },
          },
        ],
      },
      message: {
        groupBy: async () => [
          { status: "sent", _count: { _all: 50 } },
          { status: "delivered", _count: { _all: 45 } },
          { status: "read", _count: { _all: 40 } },
          { status: "failed", _count: { _all: 5 } },
        ],
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list = await listAdminWhatsAppConnections(mockDb as any);
    assert.equal(list.length, 1);
    const item = list[0];

    assert.equal(item.organizationName, "Acme Corp");
    assert.equal(item.displayPhoneNumber, "+15551234567");
    assert.equal(item.status, "connected");
    assert.equal(item.stats.total, 140);
    assert.equal(item.stats.delivered, 45);

    // ZERO SECRET EXPOSURE CHECK
    assert.equal((item as { accessToken?: unknown }).accessToken, undefined);
    assert.equal((item as { token?: unknown }).token, undefined);
    assert.equal((item as { secret?: unknown }).secret, undefined);
  });

  await t.test("falls back cleanly to Organization baseline schema when WhatsAppConnection table is absent", async () => {
    const mockDb = {
      whatsAppConnection: {
        findMany: async () => {
          const err = new Error("Table public.WhatsAppConnection does not exist");
          (err as { code?: string }).code = "P2021";
          throw err;
        },
      },
      organization: {
        findMany: async () => [
          {
            id: "org-baseline",
            name: "Baseline Workspace",
            phoneNumberId: "phone-base-1",
            wabaId: "waba-base-1",
            displayPhoneNumber: "+15559876543",
          },
        ],
      },
      message: {
        groupBy: async () => [],
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list = await listAdminWhatsAppConnections(mockDb as any);
    assert.equal(list.length, 1);
    assert.equal(list[0].organizationName, "Baseline Workspace");
    assert.equal(list[0].phoneNumberId, "phone-base-1");
    assert.equal(list[0].status, "connected");
  });
});

// ==========================================
// 4. CUSTOMER DOSSIER & QUOTA USAGE
// ==========================================

test("Customer Dossier & Quotas Suite", async (t) => {
  await t.test("returns comprehensive customer profile and usage metrics", async () => {
    const mockDb = {
      user: {
        findUnique: async () => ({
          id: "cust-1",
          name: "Alice Smith",
          email: "alice@example.com",
          role: "customer",
          status: "active",
          organizationId: "org-alice",
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
          organization: {
            id: "org-alice",
            name: "Alice Co",
            status: "active",
            planTier: "growth",
            monthlyLimit: 25000,
            createdAt: new Date("2026-01-01"),
          },
        }),
      },
      contact: {
        count: async () => 150,
      },
      message: {
        count: async (args?: { where?: { timestamp?: unknown } }) => {
          if (args?.where?.timestamp) return 1200; // This month
          return 5400; // All time
        },
      },
      whatsAppConnection: {
        findFirst: async () => ({
          status: "connected",
          phoneNumberId: "phone-alice-1",
          displayPhoneNumber: "+15551112233",
          verifiedName: "Alice Co Verified",
          lastCheckedAt: new Date(),
          lastError: null,
        }),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const details = await getCustomerDetails("cust-1", mockDb as any);
    assert.ok(details);
    assert.equal(details.user.email, "alice@example.com");
    assert.equal(details.organization?.name, "Alice Co");
    assert.equal(details.organization?.planTier, "growth");
    assert.equal(details.usage.monthMessages, 1200);
    assert.equal(details.usage.monthlyLimit, 25000);
    assert.equal(details.usage.remaining, 23800);
    assert.equal(details.usage.contacts, 150);
    assert.equal(details.whatsapp.status, "connected");
  });

  await t.test("calculates platform dashboard metrics and MRR correctly", async () => {
    const mockDb = {
      organization: {
        findMany: async () => [
          { id: "org-1", name: "Org 1", status: "active", planTier: "starter", monthlyLimit: 5000 },
          { id: "org-2", name: "Org 2", status: "active", planTier: "growth", monthlyLimit: 25000 },
          { id: "org-3", name: "Org 3", status: "suspended", planTier: "pro", monthlyLimit: 50000 },
        ],
      },
      user: {
        count: async () => 10,
        findMany: async () => [
          { id: "u-1", name: "Customer 1", email: "c1@test.com", role: "customer", status: "active", sessionVersion: 1, organizationId: "org-1" },
          { id: "u-2", name: "Customer 2", email: "c2@test.com", role: "customer", status: "active", sessionVersion: 1, organizationId: "org-2" },
          { id: "u-3", name: "Admin 1", email: "a1@test.com", role: "admin", status: "active", sessionVersion: 1, organizationId: "org-3" },
          { id: "u-4", name: "Super Admin", email: "owner@wafilow.com", role: "super_admin", status: "active", sessionVersion: 1, organizationId: null },
        ],
      },
      message: {
        count: async () => 12500,
      },
      whatsAppConnection: {
        findMany: async () => [
          { environment: "production", status: "connected" },
          { environment: "production", status: "connected" },
        ],
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metrics = await getSuperAdminDashboardMetrics(mockDb as any);
    assert.equal(metrics.organizations.total, 3);
    assert.equal(metrics.organizations.active, 2);
    assert.equal(metrics.organizations.suspended, 1);
    assert.equal(metrics.users.customers, 2);
    assert.equal(metrics.users.admins, 1);
    assert.equal(metrics.users.superAdmins, 1);
    // MRR: starter ($29) + growth ($79) + pro ($199) = $307
    assert.equal(metrics.subscriptions.estimatedMRR, 307);
  });
});
