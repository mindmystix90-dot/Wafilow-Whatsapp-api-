import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit-log";
import { PLAN_LIMITS, getMonthStart, getNextResetDate } from "@/lib/quota";
import { isMissingTableOrColumnError } from "@/lib/db-errors";
import bcrypt from "bcryptjs";

export interface AdminOrganizationSummary {
  id: string;
  name: string;
  status: string;
  planTier: string;
  monthlyLimit: number;
  displayPhoneNumber: string | null;
  phoneNumberId: string | null;
  wabaId: string | null;
  userCount: number;
  contactCount: number;
  messageCount: number;
  whatsappStatus: {
    production: string;
    sandbox: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface OrgRow {
  id: string;
  name: string | null;
  status: string;
  planTier: string;
  monthlyLimit: number | null;
  displayPhoneNumber?: string | null;
  phoneNumberId?: string | null;
  wabaId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { users: number; contacts: number; messages: number };
  whatsappConnections?: Array<{ environment: string; status: string }>;
}

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  status: string;
  sessionVersion: number;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  organization?: { id: string; name: string | null; status: string } | null;
}

interface ConnStatusRow {
  environment: string;
  status: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbClient = any;

export async function listOrganizations(
  filters?: {
    search?: string;
    status?: string;
    plan?: string;
  },
  db: DbClient = prisma
): Promise<AdminOrganizationSummary[]> {
  try {
    let orgs: OrgRow[] = [];
    try {
      orgs = await db.organization.findMany({
        include: {
          _count: {
            select: {
              users: true,
              contacts: true,
              messages: true,
            },
          },
          whatsappConnections: {
            select: {
              environment: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (dbErr) {
      if (isMissingTableOrColumnError(dbErr)) {
        // Fallback for baseline schema (0_init) where status/planTier/monthlyLimit/whatsappConnections do not exist
        const baselineOrgs = await db.organization.findMany({
          select: {
            id: true,
            name: true,
            displayPhoneNumber: true,
            phoneNumberId: true,
            wabaId: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                users: true,
                contacts: true,
                messages: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });
        orgs = baselineOrgs.map((bo: { id: string; name: string | null; displayPhoneNumber?: string | null; phoneNumberId?: string | null; wabaId?: string | null; createdAt: Date; updatedAt: Date; _count?: { users: number; contacts: number; messages: number } }) => ({
          id: bo.id,
          name: bo.name,
          status: "active",
          planTier: "starter",
          monthlyLimit: 5000,
          displayPhoneNumber: bo.displayPhoneNumber ?? null,
          phoneNumberId: bo.phoneNumberId ?? null,
          wabaId: bo.wabaId ?? null,
          createdAt: bo.createdAt,
          updatedAt: bo.updatedAt,
          _count: bo._count,
          whatsappConnections: [],
        }));
      } else {
        throw dbErr;
      }
    }

    const list: AdminOrganizationSummary[] = orgs.map((org: OrgRow) => {
      const planTier = org.planTier || "starter";
      const monthlyLimit = org.monthlyLimit ?? (PLAN_LIMITS[planTier] || 5000);

      const prodConn = org.whatsappConnections?.find((c) => c.environment === "production");
      const sandConn = org.whatsappConnections?.find((c) => c.environment === "sandbox");

      return {
        id: org.id,
        name: org.name || "Unnamed Workspace",
        status: org.status || "active",
        planTier,
        monthlyLimit,
        displayPhoneNumber: org.displayPhoneNumber ?? null,
        phoneNumberId: org.phoneNumberId ?? null,
        wabaId: org.wabaId ?? null,
        userCount: org._count?.users ?? 0,
        contactCount: org._count?.contacts ?? 0,
        messageCount: org._count?.messages ?? 0,
        whatsappStatus: {
          production: prodConn?.status || (org.phoneNumberId ? "connected" : "disconnected"),
          sandbox: sandConn?.status || "disconnected",
        },
        createdAt: org.createdAt ? new Date(org.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: org.updatedAt ? new Date(org.updatedAt).toISOString() : new Date().toISOString(),
      };
    });

    return list.filter((o) => {
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        if (!o.name.toLowerCase().includes(q) && !o.id.toLowerCase().includes(q)) return false;
      }
      if (filters?.status && filters.status !== "all" && o.status.toLowerCase() !== filters.status.toLowerCase()) {
        return false;
      }
      if (filters?.plan && filters.plan !== "all" && o.planTier.toLowerCase() !== filters.plan.toLowerCase()) {
        return false;
      }
      return true;
    });
  } catch (error) {
    console.error("[AdminStore] Failed to list organizations:", error instanceof Error ? error.message : "Unknown error");
    throw new Error("Unable to retrieve organization list.");
  }
}

export async function getOrganizationDetails(id: string, db: DbClient = prisma) {
  try {
    let org = null;
    try {
      org = await db.organization.findUnique({
        where: { id },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              createdAt: true,
            },
          },
          whatsappConnections: {
            select: {
              id: true,
              environment: true,
              status: true,
              phoneNumberId: true,
              displayPhoneNumber: true,
              verifiedName: true,
              lastCheckedAt: true,
              lastError: true,
            },
          },
          _count: {
            select: {
              contacts: true,
              messages: true,
            },
          },
        },
      });
    } catch (dbErr) {
      if (isMissingTableOrColumnError(dbErr)) {
        org = await db.organization.findUnique({
          where: { id },
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
              },
            },
            _count: {
              select: {
                contacts: true,
                messages: true,
              },
            },
          },
        });
        if (org) {
          (org as Record<string, unknown>).status = "active";
          (org as Record<string, unknown>).planTier = "starter";
          (org as Record<string, unknown>).monthlyLimit = 5000;
          (org as Record<string, unknown>).whatsappConnections = [];
          if (Array.isArray(org.users)) {
            (org as Record<string, unknown>).users = org.users.map((u: Record<string, unknown>) => ({ ...u, status: "active" }));
          }
        }
      } else {
        throw dbErr;
      }
    }

    if (!org) return null;

    const planTier = org.planTier || "starter";
    return {
      ...org,
      monthlyLimit: org.monthlyLimit ?? (PLAN_LIMITS[planTier] || 5000),
    };
  } catch (error) {
    console.error("[AdminStore] Failed to get organization details:", error instanceof Error ? error.message : "Unknown error");
    throw new Error("Unable to retrieve organization details.");
  }
}

export async function createOrganization(
  data: {
    name: string;
    planTier?: string;
  },
  admin: { adminId: string; adminEmail: string },
  db: DbClient = prisma
) {
  const planTier = data.planTier || "starter";
  const monthlyLimit = PLAN_LIMITS[planTier] || 5000;

  try {
    const org = await db.organization.create({
      data: {
        name: data.name.trim(),
        status: "active",
        planTier,
        monthlyLimit,
        webhookVerifyToken: `wafilow_${Math.random().toString(36).substring(2, 12)}`,
      },
    });

    await recordAuditLog({
      actorId: admin.adminId,
      actorEmail: admin.adminEmail,
      action: "ORGANIZATION_CREATE",
      targetType: "ORGANIZATION",
      targetId: org.id,
      details: { name: org.name, planTier, monthlyLimit },
    }, db);

    return org;
  } catch (error) {
    console.error("[AdminStore] Failed to create organization:", error instanceof Error ? error.message : "Unknown error");
    throw new Error("Unable to create organization workspace.");
  }
}

export async function updateOrganization(
  id: string,
  data: {
    name?: string;
    status?: "active" | "suspended";
    planTier?: string;
    monthlyLimit?: number;
    displayPhoneNumber?: string | null;
    phoneNumberId?: string | null;
    wabaId?: string | null;
  },
  admin: { adminId: string; adminEmail: string },
  db: DbClient = prisma
) {
  try {
    const current = await db.organization.findUnique({ where: { id } });
    if (!current) throw new Error("Organization not found");

    const updateData: {
      name?: string;
      status?: string;
      planTier?: string;
      monthlyLimit?: number;
      displayPhoneNumber?: string | null;
      phoneNumberId?: string | null;
      wabaId?: string | null;
    } = {};

    if (typeof data.name === "string" && data.name.trim()) {
      updateData.name = data.name.trim();
    }
    if (data.status === "active" || data.status === "suspended") {
      updateData.status = data.status;
    }
    if (typeof data.planTier === "string" && data.planTier.trim()) {
      updateData.planTier = data.planTier.trim().toLowerCase();
    }
    if (typeof data.monthlyLimit === "number" && !Number.isNaN(data.monthlyLimit) && data.monthlyLimit >= 0) {
      updateData.monthlyLimit = Math.floor(data.monthlyLimit);
    }
    if (data.displayPhoneNumber !== undefined) {
      updateData.displayPhoneNumber =
        data.displayPhoneNumber && data.displayPhoneNumber.trim()
          ? data.displayPhoneNumber.trim()
          : null;
    }
    if (data.phoneNumberId !== undefined) {
      updateData.phoneNumberId =
        data.phoneNumberId && data.phoneNumberId.trim()
          ? data.phoneNumberId.trim()
          : null;
    }
    if (data.wabaId !== undefined) {
      updateData.wabaId =
        data.wabaId && data.wabaId.trim() ? data.wabaId.trim() : null;
    }

    const updated = await db.organization.update({
      where: { id },
      data: updateData,
    });

    // Keep production WhatsAppConnection identifiers synchronized when present
    if (
      (data.displayPhoneNumber !== undefined ||
        data.phoneNumberId !== undefined ||
        data.wabaId !== undefined) &&
      db?.whatsAppConnection?.updateMany
    ) {
      try {
        await db.whatsAppConnection.updateMany({
          where: { organizationId: id, environment: "production" },
          data: {
            ...(data.displayPhoneNumber !== undefined
              ? { displayPhoneNumber: updateData.displayPhoneNumber }
              : {}),
            ...(data.phoneNumberId !== undefined
              ? { phoneNumberId: updateData.phoneNumberId }
              : {}),
            ...(data.wabaId !== undefined ? { wabaId: updateData.wabaId } : {}),
          },
        });
      } catch (connErr) {
        if (!isMissingTableOrColumnError(connErr)) {
          console.warn("[AdminStore] Could not sync WhatsAppConnection fields:", connErr);
        }
      }
    }

    await recordAuditLog(
      {
        actorId: admin.adminId,
        actorEmail: admin.adminEmail,
        action:
          data.status && Object.keys(updateData).length === 1
            ? "ORGANIZATION_STATUS_CHANGE"
            : "ORGANIZATION_UPDATE",
        targetType: "ORGANIZATION",
        targetId: id,
        details: { changes: updateData },
      },
      db
    );

    return updated;
  } catch (error) {
    console.error(
      "[AdminStore] Failed to update organization:",
      error instanceof Error ? error.message : "Unknown error"
    );
    throw new Error(error instanceof Error ? error.message : "Unable to update organization.");
  }
}

export async function listAllUsers(
  filters?: {
    search?: string;
    role?: string;
    status?: string;
  },
  db: DbClient = prisma
) {
  try {
    let users: UserRow[] = [];
    try {
      users = await db.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          sessionVersion: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true,
          organization: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (dbErr) {
      if (isMissingTableOrColumnError(dbErr)) {
        const baselineUsers = await db.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            organizationId: true,
            createdAt: true,
            updatedAt: true,
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });
        users = baselineUsers.map(
          (bu: {
            id: string;
            name: string | null;
            email: string | null;
            role: string;
            organizationId: string | null;
            createdAt: Date;
            updatedAt: Date;
            organization?: { id: string; name: string | null } | null;
          }) => ({
            ...bu,
            status: "active",
            sessionVersion: 1,
            organization: bu.organization ? { ...bu.organization, status: "active" } : null,
          })
        );
      } else {
        throw dbErr;
      }
    }

    return users.filter((u: UserRow) => {
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        const matchName = u.name?.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        const matchOrg = u.organization?.name?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchOrg) return false;
      }
      if (filters?.role && filters.role !== "all" && u.role.toLowerCase() !== filters.role.toLowerCase()) {
        return false;
      }
      if (filters?.status && filters.status !== "all" && (u.status || "active").toLowerCase() !== filters.status.toLowerCase()) {
        return false;
      }
      return true;
    });
  } catch (error) {
    console.error("[AdminStore] Failed to list users:", error instanceof Error ? error.message : "Unknown error");
    throw new Error("Unable to retrieve user directory.");
  }
}

export async function updateUserStatus(
  userId: string,
  newStatus: "active" | "suspended",
  admin: { adminId: string; adminEmail: string },
  db: DbClient = prisma
) {
  try {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    // Atomically bump sessionVersion in DB so existing sessions are invalidated across all instances
    const updated = await db.user.update({
      where: { id: userId },
      data: {
        status: newStatus,
        sessionVersion: { increment: 1 },
      },
      select: {
        id: true,
        status: true,
        sessionVersion: true,
      },
    });

    await recordAuditLog({
      actorId: admin.adminId,
      actorEmail: admin.adminEmail,
      action: "USER_STATUS_CHANGE",
      targetType: "USER",
      targetId: userId,
      details: {
        previousStatus: user.status,
        newStatus,
        sessionVersionBumpedTo: updated.sessionVersion,
        sessionsRevoked: true,
      },
    }, db);

    return {
      id: userId,
      status: updated.status,
      sessionVersion: updated.sessionVersion,
      sessionsRevoked: true,
    };
  } catch (error) {
    console.error("[AdminStore] Failed to update user status:", error instanceof Error ? error.message : "Unknown error");
    throw new Error(error instanceof Error ? error.message : "Unable to update user status.");
  }
}

const ALLOWED_USER_ROLES = new Set(["customer", "user", "admin", "super_admin"]);

/**
 * Full Super Admin user editor: updates name, email/Gmail, role, organization workspace,
 * status, and optional temporary password. Bumps sessionVersion on security-sensitive changes
 * and writes an audit record (never logging plaintext passwords).
 */
export async function updateUserAdmin(
  userId: string,
  data: {
    name?: string | null;
    email?: string;
    role?: string;
    organizationId?: string | null;
    status?: "active" | "suspended";
    temporaryPassword?: string;
  },
  admin: { adminId: string; adminEmail: string },
  db: DbClient = prisma
) {
  const existing = await db.user.findUnique({ where: { id: userId } });
  if (!existing) {
    throw new Error("User not found.");
  }

  const updateData: Record<string, unknown> = {};
  const auditChanges: Record<string, unknown> = {};
  let shouldBumpSession = false;

  if (data.name !== undefined) {
    const cleanName = data.name ? data.name.trim() : null;
    updateData.name = cleanName;
    auditChanges.name = cleanName;
  }

  if (typeof data.email === "string" && data.email.trim()) {
    const normalizedEmail = data.email.toLowerCase().trim();
    if (!normalizedEmail.includes("@") || normalizedEmail.length < 5) {
      throw new Error("Please enter a valid email address.");
    }
    if (normalizedEmail !== (existing.email || "").toLowerCase().trim()) {
      const collision = await db.user.findUnique({ where: { email: normalizedEmail } });
      if (collision && collision.id !== userId) {
        throw new Error("Another account already uses this email address.");
      }
      updateData.email = normalizedEmail;
      auditChanges.email = normalizedEmail;
      shouldBumpSession = true;
    }
  }

  if (typeof data.role === "string" && data.role.trim()) {
    const normalizedRole = data.role.toLowerCase().trim();
    if (!ALLOWED_USER_ROLES.has(normalizedRole)) {
      throw new Error("Invalid user role specified.");
    }

    if (normalizedRole === "super_admin" && existing.role !== "super_admin") {
      throw new Error(
        "Single-owner policy: promoting additional super_admin accounts via the panel is prohibited."
      );
    }

    if (existing.role === "super_admin" && normalizedRole !== "super_admin") {
      throw new Error("Cannot demote the designated platform owner account.");
    }

    if (normalizedRole !== existing.role) {
      updateData.role = normalizedRole;
      auditChanges.role = normalizedRole;
      shouldBumpSession = true;
    }
  }

  if (data.organizationId !== undefined) {
    const nextOrgId = data.organizationId ? data.organizationId.trim() : null;
    if (nextOrgId) {
      const orgExists = await db.organization.findUnique({
        where: { id: nextOrgId },
        select: { id: true },
      });
      if (!orgExists) {
        throw new Error("Selected organization workspace does not exist.");
      }
    }
    if (nextOrgId !== existing.organizationId) {
      updateData.organizationId = nextOrgId;
      auditChanges.organizationId = nextOrgId;
      shouldBumpSession = true;
    }
  }

  if (data.status === "active" || data.status === "suspended") {
    if (existing.role === "super_admin" && data.status === "suspended") {
      throw new Error("Cannot suspend the designated platform owner account.");
    }
    if (data.status !== (existing.status || "active")) {
      updateData.status = data.status;
      auditChanges.status = data.status;
      shouldBumpSession = true;
    }
  }

  if (typeof data.temporaryPassword === "string" && data.temporaryPassword.trim().length > 0) {
    if (data.temporaryPassword.length < 8) {
      throw new Error("Temporary password must be at least 8 characters long.");
    }
    updateData.password = await bcrypt.hash(data.temporaryPassword, 10);
    auditChanges.passwordChanged = true;
    shouldBumpSession = true;
  }

  if (Object.keys(updateData).length === 0) {
    return {
      user: {
        id: existing.id,
        name: existing.name,
        email: existing.email,
        role: existing.role,
        status: existing.status || "active",
        organizationId: existing.organizationId,
        sessionVersion: existing.sessionVersion ?? 1,
      },
      sessionsRevoked: false,
    };
  }

  if (shouldBumpSession) {
    updateData.sessionVersion = { increment: 1 };
  }

  let updated;
  try {
    updated = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        sessionVersion: true,
        organizationId: true,
        organization: {
          select: { id: true, name: true },
        },
      },
    });
  } catch (dbErr) {
    if (isMissingTableOrColumnError(dbErr)) {
      const baselineData = { ...updateData };
      delete baselineData.status;
      delete baselineData.sessionVersion;
      updated = await db.user.update({
        where: { id: userId },
        data: baselineData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          organizationId: true,
          organization: {
            select: { id: true, name: true },
          },
        },
      });
      updated = { ...updated, status: "active", sessionVersion: 1 };
    } else {
      throw dbErr;
    }
  }

  await recordAuditLog(
    {
      actorId: admin.adminId,
      actorEmail: admin.adminEmail,
      action: "USER_ADMIN_UPDATE",
      targetType: "USER",
      targetId: userId,
      details: {
        changes: auditChanges,
        sessionsRevoked: shouldBumpSession,
      },
    },
    db
  );

  return {
    user: updated,
    sessionsRevoked: shouldBumpSession,
  };
}

/**
 * Sets a bcrypt-hashed temporary password directly for a user, bumps sessionVersion
 * to revoke active sessions, and records an audit log entry.
 */
export async function setUserTemporaryPassword(
  userId: string,
  temporaryPassword: string,
  admin: { adminId: string; adminEmail: string },
  db: DbClient = prisma
) {
  if (!temporaryPassword || typeof temporaryPassword !== "string" || temporaryPassword.length < 8) {
    throw new Error("Temporary password must be at least 8 characters long.");
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

  let updated;
  try {
    updated = await db.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        sessionVersion: { increment: 1 },
      },
      select: {
        id: true,
        email: true,
        sessionVersion: true,
      },
    });
  } catch (dbErr) {
    if (isMissingTableOrColumnError(dbErr)) {
      updated = await db.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
        select: { id: true, email: true },
      });
      updated = { ...updated, sessionVersion: 1 };
    } else {
      throw dbErr;
    }
  }

  await recordAuditLog(
    {
      actorId: admin.adminId,
      actorEmail: admin.adminEmail,
      action: "USER_TEMPORARY_PASSWORD_SET",
      targetType: "USER",
      targetId: userId,
      details: {
        sessionVersionBumpedTo: updated.sessionVersion,
        sessionsRevoked: true,
      },
    },
    db
  );

  return {
    success: true,
    mode: "temporary_password",
    userId: updated.id,
    sessionVersion: updated.sessionVersion,
    sessionsRevoked: true,
    message: "Temporary password updated securely. All active sessions have been revoked.",
  };
}

/**
 * Generates a cryptographically secure, expiring, single-use password reset token.
 * Stores only the SHA-256 hash in the database.
 */
export async function generatePasswordResetToken(
  userId: string,
  admin: { adminId: string; adminEmail: string },
  db: DbClient = prisma
) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  // 1. Generate 256 bits of cryptographic entropy
  const rawToken = crypto.randomBytes(32).toString("hex");

  // 2. Hash using SHA-256 for secure storage (raw token never saved)
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  // 3. Expiry: 1 hour (3600 seconds)
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  try {
    // Invalidate existing unused tokens for this user
    await db.passwordResetToken.deleteMany({
      where: {
        userId,
        usedAt: null,
      },
    });

    // Store hashed token
    await db.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    // Audit log records that reset was issued without logging raw token
    await recordAuditLog({
      actorId: admin.adminId,
      actorEmail: admin.adminEmail,
      action: "PASSWORD_RESET_TOKEN_GENERATED",
      targetType: "USER",
      targetId: userId,
      details: {
        expiresAt: expiresAt.toISOString(),
      },
    }, db);

    const resetUrl = `/reset-password?token=${rawToken}`;

    return {
      success: true,
      resetToken: rawToken,
      resetUrl,
      expiresAt: expiresAt.toISOString(),
      message: "Secure single-use password reset token generated. (Email delivery not configured; securely deliver reset URL directly to user).",
    };
  } catch (error) {
    console.error("[AdminStore] Failed to generate password reset token:", error instanceof Error ? error.message : "Unknown error");
    throw new Error("Unable to generate secure password reset token.");
  }
}

/**
 * Redeems an expiring single-use password reset token and updates the user's password.
 * Atomically invalidates the token and increments sessionVersion to invalidate all existing sessions.
 */
export async function redeemPasswordResetToken(
  rawToken: string,
  newPassword: string,
  db: DbClient = prisma
) {
  if (!rawToken || typeof rawToken !== "string") {
    throw new Error("Invalid password reset token.");
  }

  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters long.");
  }

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.usedAt !== null) {
    throw new Error("Password reset token is invalid or has already been used.");
  }

  if (new Date(record.expiresAt).getTime() < Date.now()) {
    throw new Error("Password reset token has expired.");
  }

  if (!record.user || record.user.status !== "active") {
    throw new Error("Cannot reset password for inactive or suspended user account.");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  try {
    const executeTransaction = async (tx: DbClient) => {
      // 1. Atomically claim the token inside transaction where usedAt is still null
      if (typeof tx.passwordResetToken.updateMany === "function") {
        const claimResult = await tx.passwordResetToken.updateMany({
          where: {
            id: record.id,
            usedAt: null,
          },
          data: { usedAt: new Date() },
        });

        if (claimResult.count === 0) {
          throw new Error("Password reset token is invalid or has already been used.");
        }
      } else {
        await tx.passwordResetToken.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        });
      }

      // 2. Atomically update user password and bump sessionVersion to invalidate all existing sessions
      await tx.user.update({
        where: { id: record.userId },
        data: {
          password: hashedPassword,
          sessionVersion: { increment: 1 },
        },
      });
    };

    if (typeof db.$transaction === "function") {
      await db.$transaction(executeTransaction);
    } else {
      await executeTransaction(db);
    }

    await recordAuditLog({
      actorId: record.userId,
      actorEmail: record.user.email || "user",
      action: "USER_PASSWORD_RESET_COMPLETED",
      targetType: "USER",
      targetId: record.userId,
      details: {
        sessionsRevoked: true,
      },
    }, db);

    return {
      success: true,
      message: "Password reset completed successfully. All active sessions have been invalidated.",
    };
  } catch (error) {
    console.error("[AdminStore] Failed to redeem password reset token:", error instanceof Error ? error.message : "Unknown error");
    throw new Error(error instanceof Error ? error.message : "Failed to process password reset.");
  }
}

export async function getSystemHealthOverview(db: DbClient = prisma) {
  let dbStatus = "healthy";
  let dbLatencyMs = 0;
  const start = Date.now();

  try {
    await db.user.count();
    dbLatencyMs = Date.now() - start;
  } catch (err) {
    dbStatus = "unreachable";
    console.error("[System Health] DB check failed:", err);
  }

  try {
    const connections: ConnStatusRow[] = await db.whatsAppConnection.findMany({
      select: {
        environment: true,
        status: true,
      },
    });

    const connectedCount = connections.filter((c: ConnStatusRow) => c.status === "connected").length;
    const disconnectedCount = connections.filter((c: ConnStatusRow) => c.status === "disconnected").length;
    const errorCount = connections.filter((c: ConnStatusRow) => c.status === "error").length;

    return {
      status: dbStatus === "healthy" ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        provider: "PostgreSQL (Neon)",
      },
      whatsappConnections: {
        total: connections.length,
        connected: connectedCount,
        disconnected: disconnectedCount,
        error: errorCount,
      },
      messageQueue: {
        status: "idle",
        pendingOutbound: 0,
        activeDispatchers: 1,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || "development",
        uptimeSeconds: Math.floor(process.uptime()),
      },
    };
  } catch (error) {
    console.error("[AdminStore] Failed to retrieve system health:", error);
    return {
      status: "degraded",
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        provider: "PostgreSQL (Neon)",
      },
      whatsappConnections: { total: 0, connected: 0, disconnected: 0, error: 0 },
      messageQueue: { status: "idle", pendingOutbound: 0, activeDispatchers: 1 },
      environment: {
        nodeEnv: process.env.NODE_ENV || "development",
        uptimeSeconds: Math.floor(process.uptime()),
      },
    };
  }
}

export const PLAN_PRICING: Record<string, number> = {
  free: 0,
  starter: 29,
  growth: 79,
  pro: 199,
  enterprise: 499,
};

export async function getSuperAdminDashboardMetrics(db: DbClient = prisma) {
  try {
    const monthStart = getMonthStart();

    // 1. Gather Organizations (with baseline fallback safety)
    const orgs = await listOrganizations(undefined, db).catch(() => []);
    const activeOrgs = orgs.filter((o) => o.status === "active").length;
    const suspendedOrgs = orgs.filter((o) => o.status === "suspended").length;

    // 2. Gather Users
    const users = await listAllUsers(undefined, db).catch(() => []);
    const customerUsers = users.filter((u) => u.role === "customer" || u.role === "user").length;
    const adminUsers = users.filter((u) => u.role === "admin").length;
    const superAdminUsers = users.filter((u) => u.role === "super_admin").length;
    const activeUsers = users.filter((u) => (u.status || "active") === "active").length;
    const suspendedUsers = users.filter((u) => u.status === "suspended").length;

    // 3. Message Metrics
    let totalMessages = 0;
    let monthMessages = 0;
    let deliveredMessages = 0;
    let failedMessages = 0;
    let readMessages = 0;

    try {
      totalMessages = await db.message.count();
      monthMessages = await db.message.count({
        where: { timestamp: { gte: monthStart } },
      });
      deliveredMessages = await db.message.count({
        where: { status: "delivered" },
      });
      readMessages = await db.message.count({
        where: { status: "read" },
      });
      failedMessages = await db.message.count({
        where: { status: "failed" },
      });
    } catch (msgErr) {
      console.warn("[AdminStore] Could not aggregate message counts:", msgErr instanceof Error ? msgErr.message : msgErr);
    }

    // 4. Plan Distribution & Estimated MRR
    const planBreakdown: Record<string, number> = {
      free: 0,
      starter: 0,
      growth: 0,
      pro: 0,
      enterprise: 0,
    };

    let estimatedMRR = 0;
    for (const org of orgs) {
      const tier = (org.planTier || "starter").toLowerCase();
      planBreakdown[tier] = (planBreakdown[tier] || 0) + 1;
      estimatedMRR += PLAN_PRICING[tier] ?? 29;
    }

    // 5. WhatsApp Connections Telemetry
    const health = await getSystemHealthOverview(db);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      organizations: {
        total: orgs.length,
        active: activeOrgs,
        suspended: suspendedOrgs,
      },
      users: {
        total: users.length,
        customers: customerUsers,
        admins: adminUsers,
        superAdmins: superAdminUsers,
        active: activeUsers,
        suspended: suspendedUsers,
      },
      messaging: {
        totalAllTime: totalMessages,
        sentThisMonth: monthMessages,
        delivered: deliveredMessages,
        read: readMessages,
        failed: failedMessages,
      },
      whatsapp: {
        total: health.whatsappConnections.total,
        connected: health.whatsappConnections.connected,
        disconnected: health.whatsappConnections.disconnected,
        error: health.whatsappConnections.error,
      },
      subscriptions: {
        plans: planBreakdown,
        estimatedMRR,
      },
    };
  } catch (error) {
    console.error("[AdminStore] Failed to calculate super admin dashboard metrics:", error);
    throw new Error("Unable to calculate platform dashboard metrics.");
  }
}

export interface AdminWhatsAppConnectionItem {
  id: string;
  organizationId: string;
  organizationName: string;
  environment: string;
  status: string;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  wabaId: string | null;
  lastCheckedAt: string | null;
  lastError: string | null;
  stats: {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
}

export async function listAdminWhatsAppConnections(db: DbClient = prisma): Promise<AdminWhatsAppConnectionItem[]> {
  try {
    let rawConnections: Array<{
      id: string;
      organizationId: string;
      environment: string;
      wabaId: string | null;
      phoneNumberId: string | null;
      displayPhoneNumber: string | null;
      verifiedName: string | null;
      status: string;
      lastCheckedAt: Date | null;
      lastError: string | null;
      organization?: { id: string; name: string | null; status?: string } | null;
    }> = [];

    try {
      rawConnections = await db.whatsAppConnection.findMany({
        select: {
          id: true,
          organizationId: true,
          environment: true,
          wabaId: true,
          phoneNumberId: true,
          displayPhoneNumber: true,
          verifiedName: true,
          status: true,
          lastCheckedAt: true,
          lastError: true,
          organization: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch {
      // Baseline schema fallback when WhatsAppConnection table or column is absent
      const orgs = await db.organization.findMany({
        select: {
          id: true,
          name: true,
          phoneNumberId: true,
          wabaId: true,
          displayPhoneNumber: true,
        },
      });

      rawConnections = orgs
        .filter((o: { phoneNumberId?: string | null }) => Boolean(o.phoneNumberId))
        .map((o: { id: string; name: string | null; phoneNumberId?: string | null; wabaId?: string | null; displayPhoneNumber?: string | null }) => ({
          id: `baseline_${o.id}`,
          organizationId: o.id,
          environment: "production",
          wabaId: o.wabaId || null,
          phoneNumberId: o.phoneNumberId || null,
          displayPhoneNumber: o.displayPhoneNumber || null,
          verifiedName: o.name,
          status: "connected",
          lastCheckedAt: null,
          lastError: null,
          organization: { id: o.id, name: o.name, status: "active" },
        }));
    }

    // Aggregate message stats per organization
    const results: AdminWhatsAppConnectionItem[] = [];

    for (const conn of rawConnections) {
      let stats = { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
      try {
        const counts = await db.message.groupBy({
          by: ["status"],
          where: { organizationId: conn.organizationId },
          _count: { _all: true },
        });

        let total = 0;
        let sent = 0;
        let delivered = 0;
        let read = 0;
        let failed = 0;

        for (const c of counts) {
          const countVal = c._count._all || 0;
          total += countVal;
          if (c.status === "sent") sent += countVal;
          if (c.status === "delivered") delivered += countVal;
          if (c.status === "read") read += countVal;
          if (c.status === "failed") failed += countVal;
        }

        stats = { total, sent, delivered, read, failed };
      } catch {
        // Safe fallback if groupBy is unsupported
      }

      // Security requirement: Ensure NEVER returning accessToken or encryption artifacts
      results.push({
        id: conn.id,
        organizationId: conn.organizationId,
        organizationName: conn.organization?.name || "Workspace",
        environment: conn.environment || "production",
        status: conn.status || "disconnected",
        phoneNumberId: conn.phoneNumberId,
        displayPhoneNumber: conn.displayPhoneNumber,
        verifiedName: conn.verifiedName,
        wabaId: conn.wabaId,
        lastCheckedAt: conn.lastCheckedAt ? new Date(conn.lastCheckedAt).toISOString() : null,
        lastError: conn.lastError ? conn.lastError.replace(/EAA[A-Za-z0-9_]+/g, "[REDACTED_TOKEN]") : null,
        stats,
      });
    }

    return results;
  } catch (error) {
    console.error("[AdminStore] Failed to list WhatsApp connections:", error);
    throw new Error("Unable to retrieve platform WhatsApp connections.");
  }
}

export async function getCustomerDetails(userId: string, db: DbClient = prisma) {
  try {
    let user;
    try {
      user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true,
          organization: {
            select: {
              id: true,
              name: true,
              status: true,
              planTier: true,
              monthlyLimit: true,
              createdAt: true,
            },
          },
        },
      });
    } catch (err) {
      if (isMissingTableOrColumnError(err)) {
        user = await db.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            organizationId: true,
            createdAt: true,
            updatedAt: true,
            organization: {
              select: {
                id: true,
                name: true,
                createdAt: true,
              },
            },
          },
        });
        if (user) {
          (user as Record<string, unknown>).status = "active";
          if (user.organization) {
            (user.organization as Record<string, unknown>).status = "active";
            (user.organization as Record<string, unknown>).planTier = "starter";
            (user.organization as Record<string, unknown>).monthlyLimit = 5000;
          }
        }
      } else {
        throw err;
      }
    }

    if (!user) return null;

    const orgId = user.organizationId;
    let contactCount = 0;
    let totalMessages = 0;
    let monthMessages = 0;
    let whatsapp = null;

    if (orgId) {
      try {
        contactCount = await db.contact.count({ where: { organizationId: orgId } });
        totalMessages = await db.message.count({ where: { organizationId: orgId } });
        monthMessages = await db.message.count({
          where: {
            organizationId: orgId,
            timestamp: { gte: getMonthStart() },
          },
        });
      } catch {
        // Fallback
      }

      try {
        whatsapp = await db.whatsAppConnection.findFirst({
          where: { organizationId: orgId, environment: "production" },
          select: {
            status: true,
            phoneNumberId: true,
            displayPhoneNumber: true,
            verifiedName: true,
            lastCheckedAt: true,
            lastError: true,
          },
        });
      } catch {
        // Baseline fallback
        const orgConn = await db.organization.findUnique({
          where: { id: orgId },
          select: { phoneNumberId: true, displayPhoneNumber: true, name: true },
        }).catch(() => null);

        if (orgConn?.phoneNumberId) {
          whatsapp = {
            status: "connected",
            phoneNumberId: orgConn.phoneNumberId,
            displayPhoneNumber: orgConn.displayPhoneNumber,
            verifiedName: orgConn.name,
            lastCheckedAt: null,
            lastError: null,
          };
        }
      }
    }

    const orgPlan = user.organization?.planTier || "starter";
    const monthlyLimit = user.organization?.monthlyLimit ?? (PLAN_LIMITS[orgPlan] || 5000);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status || "active",
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : new Date().toISOString(),
      },
      organization: user.organization
        ? {
            id: user.organization.id,
            name: user.organization.name || "Workspace",
            status: user.organization.status || "active",
            planTier: orgPlan,
            monthlyLimit,
            createdAt: user.organization.createdAt ? new Date(user.organization.createdAt).toISOString() : new Date().toISOString(),
          }
        : null,
      usage: {
        contacts: contactCount,
        totalMessages,
        monthMessages,
        monthlyLimit,
        remaining: Math.max(0, monthlyLimit - monthMessages),
        percentageUsed: monthlyLimit > 0 ? Math.min(100, Math.round((monthMessages / monthlyLimit) * 100)) : 0,
      },
      whatsapp: whatsapp || {
        status: "disconnected",
        phoneNumberId: null,
        displayPhoneNumber: null,
        verifiedName: null,
        lastCheckedAt: null,
        lastError: null,
      },
    };
  } catch (error) {
    console.error("[AdminStore] Failed to get customer details:", error);
    throw new Error("Unable to retrieve customer profile details.");
  }
}

export interface AdminSubscriptionBillingItem {
  id: string;
  organizationId: string;
  organizationName: string;
  status: string;
  planTier: string;
  monthlyLimit: number;
  billingCycle: string;
  amountCents: number;
  currency: string;
  paymentStatus: string;
  paymentMethod: string;
  invoiceRef: string | null;
  notes: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  lastPaidAt: string | null;
  autoRenew: boolean;
  createdAt: string;
}

/**
 * Lists tenant subscriptions merged with persisted manual TenantBilling records.
 * Degrades cleanly if the TenantBilling table has not yet been migrated.
 */
export async function listSubscriptionsWithBilling(
  filters?: { search?: string; plan?: string },
  db: DbClient = prisma
): Promise<{ subscriptions: AdminSubscriptionBillingItem[]; billingSchemaReady: boolean }> {
  const orgs = await listOrganizations(filters, db);
  const defaultPeriodStart = getMonthStart().toISOString();
  const defaultPeriodEnd = getNextResetDate().toISOString();

  let billingMap = new Map<
    string,
    {
      billingCycle: string;
      amountCents: number;
      currency: string;
      paymentStatus: string;
      paymentMethod: string | null;
      invoiceRef: string | null;
      notes: string | null;
      currentPeriodStart: Date | null;
      currentPeriodEnd: Date | null;
      lastPaidAt: Date | null;
    }
  >();
  let billingSchemaReady = true;

  try {
    if (db?.tenantBilling?.findMany) {
      const records = await db.tenantBilling.findMany();
      for (const rec of records) {
        billingMap.set(rec.organizationId, rec);
      }
    } else {
      billingSchemaReady = false;
    }
  } catch (err) {
    if (isMissingTableOrColumnError(err)) {
      billingSchemaReady = false;
      billingMap = new Map();
    } else {
      throw err;
    }
  }

  const subscriptions: AdminSubscriptionBillingItem[] = orgs.map((org) => {
    const billing = billingMap.get(org.id);
    const defaultAmountCents = (PLAN_PRICING[org.planTier] ?? 29) * 100;

    return {
      id: `sub_${org.id}`,
      organizationId: org.id,
      organizationName: org.name,
      status: org.status === "active" ? "active" : "suspended",
      planTier: org.planTier,
      monthlyLimit: org.monthlyLimit,
      billingCycle: billing?.billingCycle || "monthly",
      amountCents: billing?.amountCents ?? defaultAmountCents,
      currency: billing?.currency || "USD",
      paymentStatus: billing?.paymentStatus || "paid",
      paymentMethod: billing?.paymentMethod || "manual",
      invoiceRef: billing?.invoiceRef || null,
      notes: billing?.notes || null,
      currentPeriodStart: billing?.currentPeriodStart
        ? new Date(billing.currentPeriodStart).toISOString()
        : defaultPeriodStart,
      currentPeriodEnd: billing?.currentPeriodEnd
        ? new Date(billing.currentPeriodEnd).toISOString()
        : defaultPeriodEnd,
      lastPaidAt: billing?.lastPaidAt ? new Date(billing.lastPaidAt).toISOString() : null,
      autoRenew: true,
      createdAt: org.createdAt,
    };
  });

  return { subscriptions, billingSchemaReady };
}

const VALID_BILLING_CYCLES = new Set(["monthly", "quarterly", "annual", "custom"]);
const VALID_PAYMENT_STATUSES = new Set(["paid", "pending", "overdue", "trial", "waived"]);

/**
 * Updates organization plan/quota/status and persists manual TenantBilling metadata
 * (without requiring an external payment gateway).
 */
export async function upsertTenantBilling(
  orgId: string,
  input: {
    planTier?: string;
    monthlyLimit?: number;
    status?: "active" | "suspended";
    billingCycle?: string;
    amountCents?: number;
    currency?: string;
    paymentStatus?: string;
    paymentMethod?: string;
    invoiceRef?: string | null;
    notes?: string | null;
    currentPeriodEnd?: string | null;
    lastPaidAt?: string | null;
  },
  admin: { adminId: string; adminEmail: string },
  db: DbClient = prisma
) {
  const updatedOrg = await updateOrganization(
    orgId,
    {
      planTier: input.planTier,
      monthlyLimit: typeof input.monthlyLimit === "number" ? input.monthlyLimit : undefined,
      status: input.status === "active" || input.status === "suspended" ? input.status : undefined,
    },
    admin,
    db
  );

  const effectivePlan = updatedOrg.planTier || input.planTier || "starter";
  const billingCycle =
    input.billingCycle && VALID_BILLING_CYCLES.has(input.billingCycle.toLowerCase())
      ? input.billingCycle.toLowerCase()
      : "monthly";
  const paymentStatus =
    input.paymentStatus && VALID_PAYMENT_STATUSES.has(input.paymentStatus.toLowerCase())
      ? input.paymentStatus.toLowerCase()
      : "paid";
  const amountCents =
    typeof input.amountCents === "number" && Number.isFinite(input.amountCents) && input.amountCents >= 0
      ? Math.round(input.amountCents)
      : (PLAN_PRICING[effectivePlan] ?? 29) * 100;
  const currency =
    typeof input.currency === "string" && input.currency.trim()
      ? input.currency.trim().toUpperCase().slice(0, 6)
      : "USD";

  const parsedPeriodEnd = input.currentPeriodEnd ? new Date(input.currentPeriodEnd) : undefined;
  const parsedLastPaidAt = input.lastPaidAt
    ? new Date(input.lastPaidAt)
    : paymentStatus === "paid"
    ? new Date()
    : undefined;

  let billingPersisted = false;
  let billingRecord = null;

  if (db?.tenantBilling?.upsert) {
    try {
      billingRecord = await db.tenantBilling.upsert({
        where: { organizationId: orgId },
        update: {
          planTier: effectivePlan,
          billingCycle,
          amountCents,
          currency,
          paymentStatus,
          paymentMethod: input.paymentMethod?.trim() || "manual",
          invoiceRef: input.invoiceRef !== undefined ? input.invoiceRef?.trim() || null : undefined,
          notes: input.notes !== undefined ? input.notes?.trim() || null : undefined,
          ...(parsedPeriodEnd && !Number.isNaN(parsedPeriodEnd.getTime())
            ? { currentPeriodEnd: parsedPeriodEnd }
            : {}),
          ...(parsedLastPaidAt && !Number.isNaN(parsedLastPaidAt.getTime())
            ? { lastPaidAt: parsedLastPaidAt }
            : {}),
          updatedBy: admin.adminEmail,
        },
        create: {
          organizationId: orgId,
          planTier: effectivePlan,
          billingCycle,
          amountCents,
          currency,
          paymentStatus,
          paymentMethod: input.paymentMethod?.trim() || "manual",
          invoiceRef: input.invoiceRef?.trim() || null,
          notes: input.notes?.trim() || null,
          currentPeriodStart: getMonthStart(),
          currentPeriodEnd:
            parsedPeriodEnd && !Number.isNaN(parsedPeriodEnd.getTime())
              ? parsedPeriodEnd
              : getNextResetDate(),
          lastPaidAt:
            parsedLastPaidAt && !Number.isNaN(parsedLastPaidAt.getTime())
              ? parsedLastPaidAt
              : null,
          updatedBy: admin.adminEmail,
        },
      });
      billingPersisted = true;
    } catch (billingErr) {
      if (!isMissingTableOrColumnError(billingErr)) {
        throw billingErr;
      }
      console.warn(
        "[AdminStore] TenantBilling table missing (pre-migration); organization plan/quota saved."
      );
    }
  }

  await recordAuditLog(
    {
      actorId: admin.adminId,
      actorEmail: admin.adminEmail,
      action: "SUBSCRIPTION_UPDATE",
      targetType: "SUBSCRIPTION",
      targetId: `sub_${orgId}`,
      details: {
        planTier: effectivePlan,
        monthlyLimit: updatedOrg.monthlyLimit,
        status: updatedOrg.status,
        billingCycle,
        amountCents,
        currency,
        paymentStatus,
        paymentMethod: input.paymentMethod || "manual",
        invoiceRef: input.invoiceRef ?? null,
        billingPersisted,
      },
    },
    db
  );

  return {
    id: `sub_${orgId}`,
    organizationId: orgId,
    organizationName: updatedOrg.name,
    planTier: effectivePlan,
    monthlyLimit: updatedOrg.monthlyLimit ?? (PLAN_LIMITS[effectivePlan] || 5000),
    status: updatedOrg.status || "active",
    billingCycle: billingRecord?.billingCycle || billingCycle,
    amountCents: billingRecord?.amountCents ?? amountCents,
    currency: billingRecord?.currency || currency,
    paymentStatus: billingRecord?.paymentStatus || paymentStatus,
    paymentMethod: billingRecord?.paymentMethod || input.paymentMethod || "manual",
    invoiceRef: billingRecord?.invoiceRef ?? input.invoiceRef ?? null,
    notes: billingRecord?.notes ?? input.notes ?? null,
    currentPeriodEnd: billingRecord?.currentPeriodEnd
      ? new Date(billingRecord.currentPeriodEnd).toISOString()
      : getNextResetDate().toISOString(),
    billingPersisted,
  };
}


