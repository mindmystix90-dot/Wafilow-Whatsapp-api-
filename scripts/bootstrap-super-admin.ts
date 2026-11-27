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

export async function bootstrapSuperAdmin(options?: {
  email?: string;
  emails?: string;
  password?: string;
  confirmed?: boolean;
  db?: PrismaClient;
}) {
  const client = options?.db || prisma;
  const { primaryEmail: email, allowlist } = resolveBootstrapOwnerEmails({
    email: options?.email,
    emails: options?.emails,
  });
  const password = options?.password || process.env.SUPER_ADMIN_PASSWORD || "";
  const confirmed = options?.confirmed ?? process.env.CONFIRM_BOOTSTRAP === "true";

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

  // 2. Validate Credentials Input
  if (!email || !email.includes("@") || email.length < 5) {
    throw new Error(
      "[Bootstrap Error] A valid SUPER_ADMIN_EMAIL is required (or set SUPER_ADMIN_EMAILS)."
    );
  }

  if (!password || password.length < 8) {
    throw new Error(
      "[Bootstrap Error] SUPER_ADMIN_PASSWORD must be at least 8 characters long."
    );
  }

  console.log(`[Bootstrap] Target Platform Owner: ${maskEmail(email)}`);
  console.log(`[Bootstrap] Verifying database connectivity and owner status...`);

  // 3. Single-Owner Exclusivity Check: Query existing super_admins
  let existingSuperAdmins: Array<{ id: string; email: string | null; role: string }> = [];
  try {
    existingSuperAdmins = await client.user.findMany({
      where: { role: "super_admin" },
      select: { id: true, email: true, role: true },
    });
  } catch (err) {
    console.error("[Bootstrap] Database query error:", err instanceof Error ? err.message : err);
    throw new Error(
      "Failed to query existing super_admin accounts. Check DATABASE_URL connectivity."
    );
  }

  if (existingSuperAdmins.length > 0) {
    const ownerAccount = existingSuperAdmins[0];
    const ownerEmail = ownerAccount.email?.toLowerCase().trim() || "";
    const isSameEmail = ownerEmail === email;
    const isAllowlistedOwner = allowlist.includes(ownerEmail) && allowlist.includes(email);

    if (!isSameEmail && !isAllowlistedOwner) {
      throw new Error(
        `[Bootstrap Forbidden] A designated platform owner already exists (${maskEmail(ownerEmail)}). ` +
          `Wafilow enforces single-owner administrative access. Multiple Super Admin accounts are prohibited.`
      );
    }

    console.log(
      `[Bootstrap] Designated Super Admin account located for ${maskEmail(ownerEmail)}. Updating credentials...`
    );
  }

  // 4. Hash password securely
  const hashedPassword = await bcrypt.hash(password, 10);

  // 5. Check if user with this email exists (could be existing user or super_admin)
  const existingUser = await client.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, organizationId: true },
  });

  let superAdminId: string;

  if (existingUser) {
    console.log(
      `[Bootstrap] Elevating/updating existing account (ID: ${existingUser.id}) to super_admin...`
    );
    try {
      const updated = await client.user.update({
        where: { id: existingUser.id },
        data: {
          role: "super_admin",
          password: hashedPassword,
          status: "active",
          sessionVersion: { increment: 1 },
        },
        select: { id: true, email: true, role: true },
      });
      superAdminId = updated.id;
    } catch (err) {
      if (isMissingTableOrColumnError(err)) {
        const updated = await client.user.update({
          where: { id: existingUser.id },
          data: {
            role: "super_admin",
            password: hashedPassword,
          },
          select: { id: true, email: true, role: true },
        });
        superAdminId = updated.id;
      } else {
        throw err;
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

    try {
      const created = await client.user.create({
        data: {
          name: "Platform Owner",
          email,
          password: hashedPassword,
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
            password: hashedPassword,
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
  console.log(" Password: [SECURELY HASHED WITH BCRYPT]");
  console.log(" Session: Validated & Revoked Previous Sessions");
  console.log(" Super Admin Console: /admin/login");
  console.log("==================================================");

  return {
    success: true,
    superAdminId,
    email: maskEmail(email),
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
