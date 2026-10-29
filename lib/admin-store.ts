import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit-log";
import { PLAN_LIMITS } from "@/lib/quota";
import bcrypt from "bcryptjs";

export interface AdminOrganizationSummary {
  id: string;
  name: string;
  status: string;
  planTier: string;
  monthlyLimit: number;
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
    const orgs: OrgRow[] = await db.organization.findMany({
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
        userCount: org._count?.users ?? 0,
        contactCount: org._count?.contacts ?? 0,
        messageCount: org._count?.messages ?? 0,
        whatsappStatus: {
          production: prodConn?.status || "disconnected",
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
    const org = await db.organization.findUnique({
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
    } = {};

    if (data.name) updateData.name = data.name.trim();
    if (data.status) updateData.status = data.status;
    if (data.planTier) updateData.planTier = data.planTier;
    if (data.monthlyLimit !== undefined) updateData.monthlyLimit = data.monthlyLimit;

    const updated = await db.organization.update({
      where: { id },
      data: updateData,
    });

    await recordAuditLog({
      actorId: admin.adminId,
      actorEmail: admin.adminEmail,
      action: data.status ? "ORGANIZATION_STATUS_CHANGE" : "ORGANIZATION_UPDATE",
      targetType: "ORGANIZATION",
      targetId: id,
      details: { changes: data },
    }, db);

    return updated;
  } catch (error) {
    console.error("[AdminStore] Failed to update organization:", error instanceof Error ? error.message : "Unknown error");
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
    const users: UserRow[] = await db.user.findMany({
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
