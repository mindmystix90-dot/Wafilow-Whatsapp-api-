/**
 * TEMPORARY ONE-TIME VERCEL PRODUCTION OWNER ACTIVATION TASK
 *
 * Remove this file and the `admin:activate-once` hook in package.json
 * immediately after confirming owner login at https://wafilow.in/admin/login.
 *
 * Security & Safety Guarantees:
 * - No HTTP endpoint: runs exclusively as a private Vercel Production deployment task.
 * - Dormant no-op unless ONE_TIME_OWNER_ACTIVATION=true is explicitly set.
 * - Strictly refuses Preview/Development deployments (requires VERCEL_ENV=production).
 * - Requires CONFIRM_BOOTSTRAP=true, SUPER_ADMIN_EMAIL, and SUPER_ADMIN_PASSWORD (>= 8 chars).
 * - Verifies DATABASE_URL targets Neon PostgreSQL (*.neon.tech) and live database is `neondb`
 *   on the production branch (aborts on any staging/preview/backup branch).
 * - Reuses scripts/bootstrap-super-admin.ts with requireExistingUser=true and requirePassword=true.
 * - One-time idempotency: skips safely without modifying anything if the designated owner
 *   already holds role = "super_admin".
 * - Enforces single-owner exclusivity and leaves all customer accounts untouched.
 * - Never prints passwords, bcrypt hashes, or DATABASE_URL values in logs.
 */

import { PrismaClient } from "@prisma/client";
import { bootstrapSuperAdmin } from "./bootstrap-super-admin";

export interface OneTimeActivationOptions {
  enabled?: boolean;
  vercelEnv?: string;
  confirmed?: boolean;
  email?: string;
  password?: string;
  databaseUrl?: string;
  expectedDatabaseName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db?: any;
}

export interface OneTimeActivationResult {
  executed: boolean;
  skipped: boolean;
  reason?: string;
  superAdminId?: string;
  email?: string;
}

function redactDatabaseUris(message: string): string {
  return message.replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, "[REDACTED_DATABASE_URL]");
}

export function assertNeonProductionDatabaseUrl(databaseUrl: string): { host: string } {
  if (!databaseUrl || !databaseUrl.trim()) {
    throw new Error(
      "[Owner Activation Aborted] DATABASE_URL is missing. Cannot verify Neon production target."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl.trim());
  } catch {
    throw new Error(
      "[Owner Activation Aborted] DATABASE_URL is not a valid PostgreSQL connection URI."
    );
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error(
      "[Owner Activation Aborted] DATABASE_URL must use postgresql:// or postgres:// protocol."
    );
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    !host.endsWith(".neon.tech")
  ) {
    throw new Error(
      "[Owner Activation Aborted] DATABASE_URL does not point to a Neon PostgreSQL host (*.neon.tech)."
    );
  }

  return { host };
}

export async function activateOwnerOnce(
  options?: OneTimeActivationOptions
): Promise<OneTimeActivationResult> {
  const enabled =
    options?.enabled ?? process.env.ONE_TIME_OWNER_ACTIVATION === "true";

  // 1. Dormant no-op for all normal builds when not explicitly armed
  if (!enabled) {
    return {
      executed: false,
      skipped: true,
      reason: "NOT_ARMED",
    };
  }

  // 2. Restrict strictly to Vercel Production deployments
  const vercelEnv = options?.vercelEnv ?? process.env.VERCEL_ENV ?? "";
  if (vercelEnv !== "production") {
    throw new Error(
      "[Owner Activation Aborted] ONE_TIME_OWNER_ACTIVATION may only run when VERCEL_ENV=production. " +
        "Scope activation environment variables strictly to Production in Vercel."
    );
  }

  // 3. Require explicit confirmation gate + credentials from environment variables
  const confirmed = options?.confirmed ?? process.env.CONFIRM_BOOTSTRAP === "true";
  if (!confirmed) {
    throw new Error(
      "[Owner Activation Aborted] CONFIRM_BOOTSTRAP=true is required alongside ONE_TIME_OWNER_ACTIVATION=true."
    );
  }

  const email = (options?.email ?? process.env.SUPER_ADMIN_EMAIL ?? "").toLowerCase().trim();
  const password = options?.password ?? process.env.SUPER_ADMIN_PASSWORD ?? "";

  if (!email || !email.includes("@") || email.length < 5) {
    throw new Error(
      "[Owner Activation Aborted] SUPER_ADMIN_EMAIL must be configured in Vercel Production environment variables."
    );
  }

  if (!password || password.length < 8) {
    throw new Error(
      "[Owner Activation Aborted] SUPER_ADMIN_PASSWORD must be a strong password of at least 8 characters."
    );
  }

  // 4. Verify DATABASE_URL points to Neon PostgreSQL
  const databaseUrl = options?.databaseUrl ?? process.env.DATABASE_URL ?? "";
  assertNeonProductionDatabaseUrl(databaseUrl);

  const expectedDbName = (
    options?.expectedDatabaseName ??
    process.env.EXPECTED_PRODUCTION_DB_NAME ??
    "neondb"
  ).trim();

  const shouldDisconnect = !options?.db;
  const db = options?.db ?? new PrismaClient();

  try {
    // 5. Verify live Neon production database identity (read-only catalog check)
    const identityRows = (await db.$queryRawUnsafe(
      `SELECT current_database() AS database_name, current_setting('neon.branch_name', true) AS branch_name, to_regclass('public."User"')::text AS user_table`
    )) as Array<{
      database_name?: string | null;
      branch_name?: string | null;
      user_table?: string | null;
    }>;

    const identity = identityRows?.[0];
    if (!identity || identity.database_name !== expectedDbName) {
      throw new Error(
        `[Owner Activation Aborted] Connected database (${identity?.database_name || "unknown"}) does not match expected production database (${expectedDbName}).`
      );
    }

    if (!identity.user_table) {
      throw new Error(
        '[Owner Activation Aborted] Expected table public."User" was not found in the connected database.'
      );
    }

    const branchName = (identity.branch_name || "").trim();
    if (branchName && branchName !== "production") {
      throw new Error(
        `[Owner Activation Aborted] Refusing to run on Neon branch "${branchName}". Only the "production" branch is permitted.`
      );
    }

    // 6. One-time idempotency guard: if designated owner is already super_admin, skip cleanly
    const existingSuperAdmins = (await db.user.findMany({
      where: { role: "super_admin" },
      select: { id: true, email: true, role: true },
    })) as Array<{ id: string; email: string | null; role: string }>;

    const targetAlreadyOwner = existingSuperAdmins.some(
      (acct) => (acct.email?.toLowerCase().trim() || "") === email
    );
    const otherSuperAdmins = existingSuperAdmins.filter(
      (acct) => (acct.email?.toLowerCase().trim() || "") !== email
    );

    if (otherSuperAdmins.length > 0) {
      throw new Error(
        "[Owner Activation Forbidden] Another super_admin account already exists. Single-owner policy blocks activation."
      );
    }

    if (targetAlreadyOwner) {
      console.log(
        "[Owner Activation] Designated owner is already promoted to super_admin. Skipping one-time activation (no changes made). " +
          "Remember to remove ONE_TIME_OWNER_ACTIVATION, CONFIRM_BOOTSTRAP, and SUPER_ADMIN_PASSWORD from Vercel."
      );
      return {
        executed: false,
        skipped: true,
        reason: "ALREADY_SUPER_ADMIN",
      };
    }

    // 7. Delegate strictly to existing scripts/bootstrap-super-admin.ts
    console.log(
      `[Owner Activation] Verified Neon production database (${expectedDbName}). Promoting existing owner account...`
    );

    const result = await bootstrapSuperAdmin({
      email,
      password,
      confirmed: true,
      requireExistingUser: true,
      requirePassword: true,
      db,
    });

    console.log(
      "[Owner Activation] COMPLETE. Remove ONE_TIME_OWNER_ACTIVATION, CONFIRM_BOOTSTRAP, and SUPER_ADMIN_PASSWORD " +
        "from Vercel Production Environment Variables immediately, then verify login at https://wafilow.in/admin/login."
    );

    return {
      executed: true,
      skipped: false,
      superAdminId: result.superAdminId,
      email: result.email,
    };
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    throw new Error(redactDatabaseUris(rawMsg));
  } finally {
    if (shouldDisconnect && typeof db.$disconnect === "function") {
      await db.$disconnect();
    }
  }
}

// Direct CLI Invocation
const invokedFilename =
  typeof process !== "undefined" && process.argv[1]
    ? process.argv[1].split(/[\\/]/).pop()
    : "";

if (
  require.main === module ||
  invokedFilename === "activate-owner-once.ts" ||
  invokedFilename === "activate-owner-once.js"
) {
  activateOwnerOnce()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(redactDatabaseUris(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    });
}
