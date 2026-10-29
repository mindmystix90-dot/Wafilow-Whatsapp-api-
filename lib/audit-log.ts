import { prisma } from "@/lib/prisma";

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown> | string | null;
  ipAddress?: string | null;
  timestamp: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbClient = any;

export async function recordAuditLog(
  entry: {
    actorId: string;
    actorEmail: string;
    action: string;
    targetType: string;
    targetId: string;
    details?: Record<string, unknown> | string | null;
    ipAddress?: string | null;
  },
  db: DbClient = prisma
): Promise<AuditLogEntry> {
  const detailsStr =
    entry.details !== undefined && entry.details !== null
      ? typeof entry.details === "object"
        ? JSON.stringify(entry.details)
        : String(entry.details)
      : null;

  try {
    const created = await db.auditLog.create({
      data: {
        actorId: entry.actorId,
        actorEmail: entry.actorEmail,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        details: detailsStr,
        ipAddress: entry.ipAddress || null,
      },
    });

    return {
      id: created.id,
      actorId: created.actorId,
      actorEmail: created.actorEmail,
      action: created.action,
      targetType: created.targetType,
      targetId: created.targetId,
      details: created.details,
      ipAddress: created.ipAddress,
      timestamp: created.createdAt ? new Date(created.createdAt).toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    console.error("[AuditLog] Failed to persist audit record:", error instanceof Error ? error.message : "Unknown error");
    throw new Error("Unable to record persistent audit log. Operation aborted for compliance.");
  }
}

export async function queryAuditLogs(
  params: {
    action?: string;
    actorEmail?: string;
    targetType?: string;
    limit?: number;
    offset?: number;
  },
  db: DbClient = prisma
): Promise<{ logs: AuditLogEntry[]; total: number }> {
  const { action, actorEmail, targetType, limit = 50, offset = 0 } = params;

  const whereClause: {
    action?: { contains: string; mode?: "insensitive" };
    actorEmail?: { contains: string; mode?: "insensitive" };
    targetType?: string;
  } = {};

  if (action) {
    whereClause.action = { contains: action, mode: "insensitive" };
  }
  if (actorEmail) {
    whereClause.actorEmail = { contains: actorEmail, mode: "insensitive" };
  }
  if (targetType) {
    whereClause.targetType = targetType;
  }

  try {
    const [dbLogs, total] = await Promise.all([
      db.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.auditLog.count({ where: whereClause }),
    ]);

    const logs: AuditLogEntry[] = dbLogs.map(
      (l: {
        id: string;
        actorId: string;
        actorEmail: string;
        action: string;
        targetType: string;
        targetId: string;
        details: string | null;
        ipAddress: string | null;
        createdAt: Date;
      }) => ({
        id: l.id,
        actorId: l.actorId,
        actorEmail: l.actorEmail,
        action: l.action,
        targetType: l.targetType,
        targetId: l.targetId,
        details: l.details,
        ipAddress: l.ipAddress,
        timestamp: l.createdAt ? new Date(l.createdAt).toISOString() : new Date().toISOString(),
      })
    );

    return { logs, total };
  } catch (error) {
    console.error("[AuditLog] Failed to query audit logs:", error instanceof Error ? error.message : "Unknown error");
    throw new Error("Failed to retrieve persistent audit log records.");
  }
}
