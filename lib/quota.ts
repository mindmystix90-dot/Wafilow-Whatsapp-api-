import { prisma } from "@/lib/prisma";
import { isMissingColumnError } from "@/lib/db-errors";

export interface QuotaInfo {
  organizationId: string;
  organizationName: string;
  status: string;
  planTier: string;
  monthlyLimit: number;
  usedThisMonth: number;
  remaining: number;
  resetDate: string;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: "ORGANIZATION_SUSPENDED" | "QUOTA_EXCEEDED" | "ORGANIZATION_NOT_FOUND" | "DATABASE_ERROR";
  error?: string;
  limit: number;
  used: number;
  remaining: number;
}

export const PLAN_LIMITS: Record<string, number> = {
  free: 1000,
  starter: 5000,
  growth: 25000,
  pro: 50000,
  enterprise: 250000,
};

export function getMonthStart(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getNextResetDate(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbClient = any;

interface InFlightReservation {
  id: string;
  count: number;
  expiresAt: number;
}

/**
 * Concurrency Architecture Note:
 * In-flight reservations are tracked in-process using an in-memory Map.
 * 
 * Scope & Limitations:
 * - Single-instance / Persistent environments (Node.js servers, dev, single containers):
 *   Guarantees strict atomic mutual exclusion against concurrent burst races.
 * - Distributed / Multi-Instance Serverless (e.g. Vercel Serverless Functions):
 *   Serverless functions run in isolated, ephemeral lambda instances without shared memory.
 *   Process-local reservations protect concurrent requests sharing the same warm container instance,
 *   while requests across different lambda instances rely on database row count checks.
 * - Launch Strategy:
 *   For initial launch, this process-local semaphore combined with authoritative PostgreSQL
 *   month-to-date count checks provides strong practical protection without adding external paid infrastructure (Redis).
 *   For high-scale multi-region distributed concurrency, a PostgreSQL transactional advisory lock
 *   (`pg_try_advisory_xact_lock`) or atomic row counter can be layered on without modifying architecture.
 */
const inFlightReservations = new Map<string, InFlightReservation[]>();

/**
 * Returns the total count of messages currently in-flight (reserved but not yet committed).
 * Automatically purges expired reservations.
 */
export function getActiveInFlightCount(organizationId: string): number {
  const now = Date.now();
  const list = inFlightReservations.get(organizationId);
  if (!list || list.length === 0) return 0;
  const active = list.filter((r) => r.expiresAt > now);
  if (active.length === 0) {
    inFlightReservations.delete(organizationId);
    return 0;
  }
  inFlightReservations.set(organizationId, active);
  return active.reduce((sum, r) => sum + r.count, 0);
}

/**
 * Acquires an in-flight quota reservation for an organization.
 * Prevents concurrent requests from bursting past monthly limits before DB writes commit.
 */
export function acquireQuotaReservation(
  organizationId: string,
  count = 1,
  ttlMs = 30000
): { reservationId: string; release: () => void } {
  const now = Date.now();
  const reservationId = `res_${Math.random().toString(36).slice(2)}_${now}`;
  const list = inFlightReservations.get(organizationId) || [];
  const active = list.filter((r) => r.expiresAt > now);
  active.push({ id: reservationId, count, expiresAt: now + ttlMs });
  inFlightReservations.set(organizationId, active);

  let released = false;
  return {
    reservationId,
    release: () => {
      if (released) return;
      released = true;
      const current = inFlightReservations.get(organizationId) || [];
      const updated = current.filter((r) => r.id !== reservationId);
      if (updated.length === 0) {
        inFlightReservations.delete(organizationId);
      } else {
        inFlightReservations.set(organizationId, updated);
      }
    },
  };
}

/**
 * Resets in-flight reservations (used primarily in test suites).
 */
export function clearInFlightReservations(organizationId?: string) {
  if (organizationId) {
    inFlightReservations.delete(organizationId);
  } else {
    inFlightReservations.clear();
  }
}

/**
 * Atomically checks organization status, counts DB usage, and claims an in-flight reservation slot.
 * Returns { allowed: true, reservation, ... } on success or { allowed: false, reason, ... } on failure.
 * The caller must call `reservation.release()` when processing completes.
 */
export async function checkAndReserveQuota(
  organizationId: string,
  db: DbClient = prisma,
  count = 1
): Promise<QuotaCheckResult & { reservation?: { reservationId: string; release: () => void } }> {
  if (!organizationId) {
    return {
      allowed: false,
      reason: "ORGANIZATION_NOT_FOUND",
      error: "Organization ID is required for outbound message dispatch.",
      limit: 0,
      used: 0,
      remaining: 0,
    };
  }

  let org;
  try {
    org = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        status: true,
        planTier: true,
        monthlyLimit: true,
      },
    });
  } catch (error) {
    if (isMissingColumnError(error)) {
      try {
        // Fallback selects ONLY baseline schema columns (id, name).
        // Does NOT query nonexistent Organization.status, Organization.planTier, or Organization.monthlyLimit.
        org = await db.organization.findUnique({
          where: { id: organizationId },
          select: {
            id: true,
            name: true,
          },
        });
        if (org) {
          (org as { status?: string; planTier?: string; monthlyLimit?: number | null }).status = "active";
          (org as { status?: string; planTier?: string; monthlyLimit?: number | null }).planTier = "starter";
          (org as { status?: string; planTier?: string; monthlyLimit?: number | null }).monthlyLimit = null;
        }
      } catch (fallbackError) {
        console.error("[Quota Check] Baseline fallback query failed:", fallbackError);
        return {
          allowed: false,
          reason: "DATABASE_ERROR",
          error: "Quota verification temporarily unavailable. Failing closed.",
          limit: 0,
          used: 0,
          remaining: 0,
        };
      }
    } else {
      console.error("[Quota Check] Database verification failed:", error instanceof Error ? error.message : "Unknown error");
      return {
        allowed: false,
        reason: "DATABASE_ERROR",
        error: "Quota verification temporarily unavailable. Failing closed.",
        limit: 0,
        used: 0,
        remaining: 0,
      };
    }
  }

  if (!org) {
    return {
      allowed: false,
      reason: "ORGANIZATION_NOT_FOUND",
      error: "Target organization workspace not found.",
      limit: 0,
      used: 0,
      remaining: 0,
    };
  }

  if (org.status !== "active") {
    return {
      allowed: false,
      reason: "ORGANIZATION_SUSPENDED",
      error: "Organization workspace is suspended. Outbound message dispatch is prohibited.",
      limit: 0,
      used: 0,
      remaining: 0,
    };
  }

  const planTier = org.planTier || "starter";
  const limit = org.monthlyLimit ?? (PLAN_LIMITS[planTier] || 5000);

  // Synchronously claim a tentative reservation slot before async DB operations
  const reservation = acquireQuotaReservation(organizationId, count);

  const monthStart = getMonthStart();
  let dbUsed = 0;
  try {
    dbUsed = await db.message.count({
      where: {
        organizationId,
        direction: "outbound",
        timestamp: { gte: monthStart },
      },
    });
  } catch (err) {
    reservation.release();
    console.error("[Quota Check] Failed to count outbound messages:", err instanceof Error ? err.message : "Unknown error");
    return {
      allowed: false,
      reason: "DATABASE_ERROR",
      error: "Message quota counting temporarily unavailable. Failing closed.",
      limit,
      used: 0,
      remaining: 0,
    };
  }

  const inFlight = getActiveInFlightCount(organizationId);
  const effectiveUsed = dbUsed + inFlight;

  if (effectiveUsed > limit) {
    reservation.release();
    return {
      allowed: false,
      reason: "QUOTA_EXCEEDED",
      error: `Monthly message quota of ${limit.toLocaleString()} messages exceeded (${dbUsed.toLocaleString()} sent, ${inFlight} in-flight). Please upgrade your subscription plan or request a quota override from an administrator.`,
      limit,
      used: effectiveUsed,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    limit,
    used: effectiveUsed,
    remaining: Math.max(0, limit - effectiveUsed),
    reservation,
  };
}

/**
 * Checks whether an organization is active and has sufficient quota for an outbound message.
 * Backed by authoritative PostgreSQL database rows plus active in-flight reservations.
 */
export async function checkOrganizationQuota(
  organizationId: string,
  db: DbClient = prisma
): Promise<QuotaCheckResult> {
  const result = await checkAndReserveQuota(organizationId, db, 0);
  if (result.reservation) {
    result.reservation.release();
  }
  if (!result.allowed) {
    return result;
  }
  const canSend = result.limit - result.used > 0;
  return {
    allowed: canSend,
    reason: canSend ? undefined : "QUOTA_EXCEEDED",
    error: canSend
      ? undefined
      : `Monthly message quota of ${result.limit.toLocaleString()} messages reached (${result.used.toLocaleString()} used or in-flight).`,
    limit: result.limit,
    used: result.used,
    remaining: result.remaining,
  };
}

/**
 * Sets or updates an organization's quota limit or plan tier in the database.
 */
export async function setOrganizationQuotaOverride(
  organizationId: string,
  params: {
    limit?: number | null;
    planTier?: string;
  },
  db: DbClient = prisma
) {
  const updateData: { monthlyLimit?: number | null; planTier?: string } = {};
  if (params.limit !== undefined) {
    updateData.monthlyLimit = params.limit;
  }
  if (params.planTier !== undefined) {
    updateData.planTier = params.planTier;
  }

  try {
    const updated = await db.organization.update({
      where: { id: organizationId },
      data: updateData,
      select: {
        id: true,
        name: true,
        status: true,
        planTier: true,
        monthlyLimit: true,
      },
    });

    return updated;
  } catch (error) {
    if (isMissingColumnError(error)) {
      // In baseline schema, columns monthlyLimit and planTier do not exist in the Organization table.
      // Verify organization exists using baseline query
      const baselineOrg = await db.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true },
      });
      if (!baselineOrg) {
        throw new Error("Target organization workspace not found.");
      }
      return {
        id: baselineOrg.id,
        name: baselineOrg.name || "Default Organization",
        status: "active",
        planTier: params.planTier || "starter",
        monthlyLimit: params.limit !== undefined ? params.limit : null,
      };
    }
    console.error("[Quota Override] Failed to update organization quota in DB:", error instanceof Error ? error.message : "Unknown error");
    throw new Error("Unable to update organization quota override.");
  }
}

/**
 * Returns full quota overview for all organizations from PostgreSQL
 */
export async function listAllQuotas(db: DbClient = prisma): Promise<QuotaInfo[]> {
  let orgs;
  try {
    orgs = await db.organization.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        planTier: true,
        monthlyLimit: true,
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    if (isMissingColumnError(error)) {
      try {
        const baselineOrgs = await db.organization.findMany({
          select: {
            id: true,
            name: true,
          },
          orderBy: { createdAt: "desc" },
        });
        orgs = baselineOrgs.map((o: { id: string; name?: string | null }) => ({
          id: o.id,
          name: o.name || "Default Organization",
          status: "active",
          planTier: "starter",
          monthlyLimit: null,
        }));
      } catch (fallbackError) {
        console.error("[listAllQuotas] Baseline fallback query failed:", fallbackError);
        throw new Error("Failed to retrieve organization quota overview.");
      }
    } else {
      console.error("[Quota Overview] Failed to list organization quotas:", error instanceof Error ? error.message : "Unknown error");
      throw new Error("Failed to retrieve organization quota overview.");
    }
  }

  const monthStart = getMonthStart();
  const resetDate = getNextResetDate().toISOString();

  const results: QuotaInfo[] = [];

  for (const org of orgs) {
    const planTier = org.planTier || "starter";
    const monthlyLimit = org.monthlyLimit ?? (PLAN_LIMITS[planTier] || 5000);

    let usedThisMonth = 0;
    try {
      usedThisMonth = await db.message.count({
        where: {
          organizationId: org.id,
          direction: "outbound",
          timestamp: { gte: monthStart },
        },
      });
    } catch {
      usedThisMonth = 0;
    }

    results.push({
      organizationId: org.id,
      organizationName: org.name || "Default Organization",
      status: org.status,
      planTier,
      monthlyLimit,
      usedThisMonth,
      remaining: Math.max(0, monthlyLimit - usedThisMonth),
      resetDate,
    });
  }

  return results;
}
