/**
 * Wafilow Super Admin Provisioning Script
 *
 * Secure, server-side bootstrap script for the initial platform owner account.
 *
 * Supported Environment Variables:
 * - SUPER_ADMIN_EMAIL: Primary platform owner email
 * - SUPER_ADMIN_EMAILS: Comma-separated list of authorized owner email(s) (used if SUPER_ADMIN_EMAIL is unset or to validate allowlisted owner)
 * - SUPER_ADMIN_PASSWORD: Secure password (minimum 8 characters)
 * - CONFIRM_BOOTSTRAP=true: Explicit confirmation gate to prevent accidental execution
 *
 * Safety Guarantees:
 * - Hashes password using bcrypt (10 rounds) before storage.
 * - Idempotent: safe to run multiple times.
 * - Protects single-owner exclusivity: prevents creating rogue secondary super_admins.
 * - Never prints plaintext passwords, access tokens, or database connection strings.
 * - Preserves all existing customer organizations, contacts, and message history.
 * - Baseline schema resilient (handles missing status/sessionVersion columns).
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { isMissingTableOrColumnError } from "../lib/db-errors";

const prisma = new PrismaClient();

function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return "***@***";
  const name = parts[0];
  const domain = parts[1];
  const maskedName =
    name.length <= 2 ? name[0] + "***" : name.slice(0, 2) + "***" + name.slice(-1);
  return `${maskedName}@${domain}`;
}

/**
 * Resolves the target owner email from explicit option, SUPER_ADMIN_EMAIL, or SUPER_ADMIN_EMAILS.
 */
export function resolveBootstrapOwnerEmails(options?: {
  email?: string;
  emails?: string;
}): { primaryEmail: string; allowlist: string[] } {
  const rawList = options?.emails ?? process.env.SUPER_ADMIN_EMAILS ?? "";
  const allowlist = rawList
    .split(",")
    .map((e) => e.toLowerCase().trim())
    .filter((e) => e.includes("@") && e.length >= 5);

  const explicit = (options?.email ?? process.env.SUPER_ADMIN_EMAIL ?? "")
    .toLowerCase()
    .trim();

  if (explicit) {
    if (allowlist.length > 0 && !allowlist.includes(explicit)) {
      allowlist.unshift(explicit);
    }
    return { primaryEmail: explicit, allowlist: allowlist.length > 0 ? allowlist : [explicit] };
  }

  return {
    primaryEmail: allowlist[0] || "",
    allowlist,
  };
}

function isValidBcryptHash(hash: string | null | undefined): boolean {
  if (!hash || typeof hash !== "string") return false;
  return (
    hash.length >= 50 &&
    (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$"))
  );
}

export async function bootstrapSuperAdmin(options?: {
  email?: string;
  emails?: string;
  password?: string;
  confirmed?: boolean;
  requireExistingUser?: boolean;
  requirePassword?: boolean;
  db?: PrismaClient;
}) {
  const client = options?.db || prisma;
  const { primaryEmail: email } = resolveBootstrapOwnerEmails({
    email: options?.email,
    emails: options?.emails,
  });
  const password = options?.password ?? process.env.SUPER_ADMIN_PASSWORD ?? "";
  const confirmed = options?.confirmed ?? process.env.CONFIRM_BOOTSTRAP === "true";
  const requireExistingUser = options?.requireExistingUser ?? false;
  const requirePassword = options?.requirePassword ?? false;

  console.log("==================================================");
  console.log("    WAFILOW SUPER ADMIN PLATFORM BOOTSTRAP       ");
  console.log("==================================================");

  // 1. Explicit Confirmation Gate
  if (!confirmed) {
    throw new Error(
      "[Bootstrap Aborted] CONFIRM_BOOTSTRAP=true environment variable is required to execute super admin provisioning.\n" +
        "This prevents accidental execution during production builds or CI/CD pipelines.\n" +
        "Run with: CONFIRM_BOOTSTRAP=true SUPER_ADMIN_EMAIL=... SUPER_ADMIN_PASSWORD=... npm run admin:bootstrap"
    );
  }

  // 2. Validate Email and Password Input
  if (!email || !email.includes("@") || email.length < 5) {
    throw new Error(
      "[Bootstrap Error] A valid SUPER_ADMIN_EMAIL is required (or set SUPER_ADMIN_EMAILS)."
    );
  }

  if (requirePassword && (!password || password.length < 8)) {
    throw new Error(
      "[Bootstrap Error] SUPER_ADMIN_PASSWORD must be at least 8 characters long."
    );
  }

  if (password && password.length < 8) {
    throw new Error(
      "[Bootstrap Error] SUPER_ADMIN_PASSWORD must be at least 8 characters long."
    );
  }

  console.log(`[Bootstrap] Target Platform Owner: ${maskEmail(email)}`);
  console.log(`[Bootstrap] Verifying database connectivity and owner status...`);

  // 3. Strict Single-Owner Exclusivity Check: Query ALL existing super_admins
  let existingSuperAdmins: Array<{ id: string; email: string | null; role: string }> = [];
  try {
    existingSuperAdmins = await client.user.findMany({
      where: { role: "super_admin" },
      select: { id: true, email: true, role: true },
    });
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const safeMsg = rawMsg.replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, "[REDACTED_DATABASE_URL]");
    console.error("[Bootstrap] Database query error:", safeMsg);
    throw new Error(
      "Failed to query existing super_admin accounts. Check DATABASE_URL connectivity."
    );
  }

  const otherSuperAdmins = existingSuperAdmins.filter(
    (acct) => (acct.email?.toLowerCase().trim() || "") !== email
  );

  if (otherSuperAdmins.length > 0) {
    const existingOwnerEmail = otherSuperAdmins[0].email?.toLowerCase().trim() || "";
    throw new Error(
      `[Bootstrap Forbidden] A designated platform owner already exists (${maskEmail(existingOwnerEmail)}). ` +
        `Wafilow enforces single-owner administrative access. Multiple Super Admin accounts are prohibited.`
    );
  }

  if (existingSuperAdmins.length > 0) {
    console.log(
      `[Bootstrap] Designated Super Admin account located for ${maskEmail(email)}. Verifying account state...`
    );
  }

  // 4. Locate existing user (exact match first, case-insensitive fallback if supported)
  let existingUser: {
    id: string;
    email: string | null;
    role: string;
    password?: string | null;
    status?: string;
    organizationId?: string | null;
  } | null = null;

  try {
    existingUser = await client.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        password: true,
        status: true,
        organizationId: true,
      },
    });
  } catch (lookupErr) {
    if (isMissingTableOrColumnError(lookupErr)) {
      existingUser = await client.user.findUnique({
        where: { email },
        select: { id: true, email: true, role: true, password: true, organizationId: true },
      });
    } else {
      throw lookupErr;
    }
  }

  if (!existingUser && typeof client.user.findFirst === "function") {
    try {
      existingUser = await client.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: {
          id: true,
          email: true,
          role: true,
          password: true,
          status: true,
          organizationId: true,
        },
      });
    } catch (fallbackLookupErr) {
      if (isMissingTableOrColumnError(fallbackLookupErr)) {
        existingUser = await client.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
          select: { id: true, email: true, role: true, password: true, organizationId: true },
        });
      } else {
        throw fallbackLookupErr;
      }
    }
  }

  if (requireExistingUser && !existingUser) {
    throw new Error(
      `[Bootstrap Error] Existing registered account for ${maskEmail(email)} was not found. ` +
        "Aborting without creating a new account."
    );
  }

  // 5. Require password if creating a new account OR if existing account lacks a valid bcrypt hash
  const hasExistingValidPassword = Boolean(existingUser && isValidBcryptHash(existingUser.password));
  if (!password && !hasExistingValidPassword) {
    throw new Error(
      "[Bootstrap Error] SUPER_ADMIN_PASSWORD must be at least 8 characters long."
    );
  }

  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

  let superAdminId: string;
  let promoted = false;
  let passwordUpdated = false;
  let sessionsRevoked = false;

  if (existingUser) {
    const needsRolePromotion = existingUser.role !== "super_admin";
    const needsReactivation = Boolean(existingUser.status && existingUser.status !== "active");
    const needsEmailNormalization =
      Boolean(existingUser.email) && existingUser.email !== email;
    const shouldRevokeSessions = needsRolePromotion || needsReactivation || Boolean(hashedPassword);

    promoted = needsRolePromotion;
    passwordUpdated = Boolean(hashedPassword);
    sessionsRevoked = shouldRevokeSessions;

    if (!needsRolePromotion && !needsReactivation && !hashedPassword && !needsEmailNormalization) {
      superAdminId = existingUser.id;
      console.log(
        `[Bootstrap] Account (ID: ${existingUser.id}) is already the active super_admin. No changes required.`
      );
    } else {
      console.log(
        `[Bootstrap] ${needsRolePromotion ? "Promoting" : "Updating"} existing account (ID: ${existingUser.id}) to super_admin...`
      );

      const fullUpdateData: Record<string, unknown> = {
        role: "super_admin",
        status: "active",
      };
      if (needsEmailNormalization) {
        fullUpdateData.email = email;
      }
      if (hashedPassword) {
        fullUpdateData.password = hashedPassword;
      }
      if (shouldRevokeSessions) {
        fullUpdateData.sessionVersion = { increment: 1 };
      }

      const baselineUpdateData: Record<string, unknown> = {
        role: "super_admin",
      };
      if (needsEmailNormalization) {
        baselineUpdateData.email = email;
      }
      if (hashedPassword) {
        baselineUpdateData.password = hashedPassword;
      }

      try {
        const updated = await client.user.update({
          where: { id: existingUser.id },
          data: fullUpdateData,
          select: { id: true, email: true, role: true },
        });
        superAdminId = updated.id;
      } catch (err) {
        if (isMissingTableOrColumnError(err)) {
          const updated = await client.user.update({
            where: { id: existingUser.id },
            data: baselineUpdateData,
            select: { id: true, email: true, role: true },
          });
          superAdminId = updated.id;
        } else {
          throw err;
        }
      }
    }
  } else {
    console.log(`[Bootstrap] Creating dedicated platform workspace and super_admin account...`);
    let platformOrgId: string;

    const existingOrg = await client.organization.findFirst({
      where: { name: "Wafilow Platform HQ" },
      select: { id: true },
    });

    if (existingOrg) {
      platformOrgId = existingOrg.id;
    } else {
      const newOrg = await client.organization.create({
        data: {
          name: "Wafilow Platform HQ",
          webhookVerifyToken: `wafilow_hq_${Math.random().toString(36).substring(2, 12)}`,
        },
        select: { id: true },
      });
      platformOrgId = newOrg.id;
    }

    promoted = true;
    passwordUpdated = true;

    try {
      const created = await client.user.create({
        data: {
          name: "Platform Owner",
          email,
          password: hashedPassword!,
          role: "super_admin",
          status: "active",
          sessionVersion: 1,
          organizationId: platformOrgId,
        },
        select: { id: true, email: true, role: true },
      });
      superAdminId = created.id;
    } catch (err) {
      if (isMissingTableOrColumnError(err)) {
        const created = await client.user.create({
          data: {
            name: "Platform Owner",
            email,
            password: hashedPassword!,
            role: "super_admin",
            organizationId: platformOrgId,
          },
          select: { id: true, email: true, role: true },
        });
        superAdminId = created.id;
      } else {
        throw err;
      }
    }
  }

  console.log("==================================================");
  console.log(" [SUCCESS] SUPER ADMIN PROVISIONED SUCCESSFULLY!  ");
  console.log(` Account ID: ${superAdminId}`);
  console.log(` Role: super_admin`);
  console.log(` Email: ${maskEmail(email)}`);
  console.log(
    passwordUpdated
      ? " Password: [SECURELY HASHED WITH BCRYPT]"
      : " Password: [PRESERVED EXISTING BCRYPT HASH]"
  );
  console.log(
    sessionsRevoked
      ? " Session: Previous Owner Sessions Revoked (Sign In Again Required)"
      : " Session: Existing Owner Session Preserved"
  );
  console.log(" Super Admin Console: /admin/login");
  console.log("==================================================");

  return {
    success: true,
    superAdminId,
    email: maskEmail(email),
    promoted,
    passwordUpdated,
    sessionsRevoked,
  };
}

// Direct CLI Invocation
if (
  require.main === module ||
  (typeof process !== "undefined" && process.argv[1]?.includes("bootstrap-super-admin"))
) {
  bootstrapSuperAdmin()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
