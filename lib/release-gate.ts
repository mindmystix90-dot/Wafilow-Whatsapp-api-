import { prisma } from "@/lib/prisma";
import { isMissingTableOrColumnError } from "@/lib/db-errors";
import { recordAuditLog } from "@/lib/audit-log";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbClient = any;

export interface PlatformMaintenanceStatus {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  registrationPaused: boolean;
  outboundPaused: boolean;
  updatedAt: string | null;
  schemaReady: boolean;
}

export interface FeatureGateItem {
  key: string;
  enabled: boolean;
  description: string;
  allowedRoles: string[];
  allowedOrgIds: string[];
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface ReleaseGateEvaluation {
  allowed: boolean;
  bypassed: boolean;
  statusCode: number;
  reason?: string;
}

export const DEFAULT_MAINTENANCE_MESSAGE =
  "Wafilow is currently undergoing scheduled maintenance. Service will resume shortly.";

export const DEFAULT_FEATURE_GATES: Array<{
  key: string;
  enabled: boolean;
  description: string;
}> = [
  {
    key: "embedded_signup_v5",
    enabled: true,
    description: "Meta WhatsApp Embedded Signup & Business App Coexistence onboarding",
  },
  {
    key: "business_app_coexistence",
    enabled: true,
    description: "Simultaneous WhatsApp Business App & Cloud API coexistence webhooks",
  },
  {
    key: "outbound_messaging",
    enabled: true,
    description: "Customer outbound WhatsApp messaging dispatch",
  },
  {
    key: "public_registration",
    enabled: true,
    description: "Public customer account & workspace registration",
  },
];

export function isPlatformOwnerRole(role?: string | null): boolean {
  if (!role) return false;
  return role.toLowerCase() === "super_admin";
}

function parseList(raw?: string | null): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean);
      }
    } catch {
      // Fall through to comma-separated parsing
    }
  }
  return trimmed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Reads platform maintenance settings safely.
 * Fails open to normal operational defaults if PlatformSetting table is not yet migrated.
 */
export async function getPlatformMaintenanceStatus(
  db: DbClient = prisma
): Promise<PlatformMaintenanceStatus> {
  try {
    if (!db?.platformSetting?.findMany) {
      return {
        maintenanceMode: false,
        maintenanceMessage: DEFAULT_MAINTENANCE_MESSAGE,
        registrationPaused: false,
        outboundPaused: false,
        updatedAt: null,
        schemaReady: false,
      };
    }

    const rows: Array<{ key: string; value: string; updatedAt?: Date }> =
      await db.platformSetting.findMany({
        where: {
          key: {
            in: [
              "maintenance_mode",
              "maintenance_message",
              "registration_paused",
              "outbound_paused",
            ],
          },
        },
      });

    const map = new Map<string, string>();
    let latest: Date | null = null;
    for (const row of rows) {
      map.set(row.key, row.value);
      if (row.updatedAt) {
        const dt = new Date(row.updatedAt);
        if (!latest || dt.getTime() > latest.getTime()) {
          latest = dt;
        }
      }
    }

    return {
      maintenanceMode: map.get("maintenance_mode") === "true",
      maintenanceMessage:
        map.get("maintenance_message")?.trim() || DEFAULT_MAINTENANCE_MESSAGE,
      registrationPaused: map.get("registration_paused") === "true",
      outboundPaused: map.get("outbound_paused") === "true",
      updatedAt: latest ? latest.toISOString() : null,
      schemaReady: true,
    };
  } catch (error) {
    if (isMissingTableOrColumnError(error)) {
      return {
        maintenanceMode: false,
        maintenanceMessage: DEFAULT_MAINTENANCE_MESSAGE,
        registrationPaused: false,
        outboundPaused: false,
        updatedAt: null,
        schemaReady: false,
      };
    }
    console.error("[ReleaseGate] Failed to read PlatformSetting:", error);
    return {
      maintenanceMode: false,
      maintenanceMessage: DEFAULT_MAINTENANCE_MESSAGE,
      registrationPaused: false,
      outboundPaused: false,
      updatedAt: null,
      schemaReady: false,
    };
  }
}

/**
 * Lists all feature rollout gates, merged with built-in platform defaults.
 * Safe against pre-migration databases where FeatureGate does not exist yet.
 */
export async function listFeatureGates(
  db: DbClient = prisma
): Promise<{ gates: FeatureGateItem[]; schemaReady: boolean }> {
  const defaultMap = new Map<string, FeatureGateItem>();
  for (const def of DEFAULT_FEATURE_GATES) {
    defaultMap.set(def.key, {
      key: def.key,
      enabled: def.enabled,
      description: def.description,
      allowedRoles: [],
      allowedOrgIds: [],
      updatedBy: null,
      updatedAt: null,
    });
  }

  try {
    if (!db?.featureGate?.findMany) {
      return { gates: Array.from(defaultMap.values()), schemaReady: false };
    }

    const rows: Array<{
      key: string;
      enabled: boolean;
      description: string | null;
      allowedRoles: string | null;
      allowedOrgIds: string | null;
      updatedBy: string | null;
      updatedAt: Date;
    }> = await db.featureGate.findMany({
      orderBy: { key: "asc" },
    });

    for (const row of rows) {
      const existing = defaultMap.get(row.key);
      defaultMap.set(row.key, {
        key: row.key,
        enabled: row.enabled,
        description: row.description || existing?.description || row.key,
        allowedRoles: parseList(row.allowedRoles),
        allowedOrgIds: parseList(row.allowedOrgIds),
        updatedBy: row.updatedBy || null,
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
      });
    }

    return { gates: Array.from(defaultMap.values()), schemaReady: true };
  } catch (error) {
    if (isMissingTableOrColumnError(error)) {
      return { gates: Array.from(defaultMap.values()), schemaReady: false };
    }
    console.error("[ReleaseGate] Failed to list FeatureGate records:", error);
    return { gates: Array.from(defaultMap.values()), schemaReady: false };
  }
}

/**
 * Evaluates whether a specific feature gate is active for a given role/organization.
 * Platform owner (`super_admin`) always bypasses disabled gates so testing in isolation works.
 */
export async function isFeatureEnabled(
  key: string,
  context?: { userRole?: string | null; organizationId?: string | null },
  db: DbClient = prisma
): Promise<{ enabled: boolean; bypassed: boolean }> {
  if (isPlatformOwnerRole(context?.userRole)) {
    return { enabled: true, bypassed: true };
  }

  const defaultGate = DEFAULT_FEATURE_GATES.find((g) => g.key === key);
  const fallbackEnabled = defaultGate ? defaultGate.enabled : true;

  try {
    if (!db?.featureGate?.findUnique) {
      return { enabled: fallbackEnabled, bypassed: false };
    }

    const gate = await db.featureGate.findUnique({ where: { key } });
    if (!gate) {
      return { enabled: fallbackEnabled, bypassed: false };
    }

    if (gate.enabled) {
      return { enabled: true, bypassed: false };
    }

    const allowedRoles = parseList(gate.allowedRoles).map((r) => r.toLowerCase());
    if (context?.userRole && allowedRoles.includes(context.userRole.toLowerCase())) {
      return { enabled: true, bypassed: true };
    }

    const allowedOrgIds = parseList(gate.allowedOrgIds);
    if (context?.organizationId && allowedOrgIds.includes(context.organizationId)) {
      return { enabled: true, bypassed: true };
    }

    return { enabled: false, bypassed: false };
  } catch (error) {
    if (isMissingTableOrColumnError(error)) {
      return { enabled: fallbackEnabled, bypassed: false };
    }
    console.error(`[ReleaseGate] Error checking feature gate '${key}':`, error);
    return { enabled: fallbackEnabled, bypassed: false };
  }
}

/**
 * Central enforcement guard for protected operational scopes:
 * - "registration" (public signup)
 * - "outbound" (WhatsApp message sending)
 * - "embedded_signup" (Meta Embedded Signup onboarding)
 *
 * Platform owner (`super_admin`) bypasses maintenance & rollout pauses automatically.
 */
export async function evaluateReleaseGate(
  options: {
    scope: "registration" | "outbound" | "embedded_signup";
    userRole?: string | null;
    organizationId?: string | null;
    featureKey?: string;
  },
  db: DbClient = prisma
): Promise<ReleaseGateEvaluation> {
  if (isPlatformOwnerRole(options.userRole)) {
    return { allowed: true, bypassed: true, statusCode: 200 };
  }

  const status = await getPlatformMaintenanceStatus(db);

  if (status.maintenanceMode) {
    return {
      allowed: false,
      bypassed: false,
      statusCode: 503,
      reason: status.maintenanceMessage || DEFAULT_MAINTENANCE_MESSAGE,
    };
  }

  if (options.scope === "registration") {
    if (status.registrationPaused) {
      return {
        allowed: false,
        bypassed: false,
        statusCode: 503,
        reason: "New account registration is temporarily paused during a platform update. Please try again shortly.",
      };
    }
    const gate = await isFeatureEnabled("public_registration", options, db);
    if (!gate.enabled) {
      return {
        allowed: false,
        bypassed: false,
        statusCode: 503,
        reason: "New account registration is temporarily unavailable. Please try again later.",
      };
    }
  }

  if (options.scope === "outbound") {
    if (status.outboundPaused) {
      return {
        allowed: false,
        bypassed: false,
        statusCode: 503,
        reason: "Outbound messaging is temporarily paused for platform maintenance. Inbound messages remain unaffected.",
      };
    }
    const gate = await isFeatureEnabled("outbound_messaging", options, db);
    if (!gate.enabled) {
      return {
        allowed: false,
        bypassed: false,
        statusCode: 503,
        reason: "Outbound messaging is temporarily disabled by platform administration.",
      };
    }
  }

  if (options.scope === "embedded_signup") {
    const key = options.featureKey || "embedded_signup_v5";
    const gate = await isFeatureEnabled(key, options, db);
    if (!gate.enabled) {
      return {
        allowed: false,
        bypassed: false,
        statusCode: 503,
        reason: "WhatsApp account onboarding is temporarily unavailable while a rollout is in progress. Please try again shortly.",
      };
    }
  }

  return { allowed: true, bypassed: false, statusCode: 200 };
}

/**
 * Persists platform maintenance settings and records an audit trail entry.
 */
export async function updateMaintenanceSettings(
  updates: {
    maintenanceMode?: boolean;
    maintenanceMessage?: string;
    registrationPaused?: boolean;
    outboundPaused?: boolean;
  },
  admin: { adminId: string; adminEmail: string },
  db: DbClient = prisma
): Promise<PlatformMaintenanceStatus> {
  const entries: Array<{ key: string; value: string }> = [];

  if (typeof updates.maintenanceMode === "boolean") {
    entries.push({ key: "maintenance_mode", value: String(updates.maintenanceMode) });
  }
  if (typeof updates.maintenanceMessage === "string") {
    entries.push({
      key: "maintenance_message",
      value: updates.maintenanceMessage.trim() || DEFAULT_MAINTENANCE_MESSAGE,
    });
  }
  if (typeof updates.registrationPaused === "boolean") {
    entries.push({ key: "registration_paused", value: String(updates.registrationPaused) });
  }
  if (typeof updates.outboundPaused === "boolean") {
    entries.push({ key: "outbound_paused", value: String(updates.outboundPaused) });
  }

  for (const item of entries) {
    await db.platformSetting.upsert({
      where: { key: item.key },
      update: {
        value: item.value,
        updatedBy: admin.adminEmail,
      },
      create: {
        key: item.key,
        value: item.value,
        updatedBy: admin.adminEmail,
      },
    });
  }

  try {
    await recordAuditLog(
      {
        actorId: admin.adminId,
        actorEmail: admin.adminEmail,
        action: "MAINTENANCE_SETTINGS_UPDATE",
        targetType: "SYSTEM",
        targetId: "platform_maintenance",
        details: updates,
      },
      db
    );
  } catch (auditErr) {
    if (!isMissingTableOrColumnError(auditErr)) {
      throw auditErr;
    }
  }

  return getPlatformMaintenanceStatus(db);
}

/**
 * Upserts a feature rollout gate and records an audit trail entry.
 */
export async function upsertFeatureGate(
  input: {
    key: string;
    enabled: boolean;
    description?: string;
    allowedRoles?: string[];
    allowedOrgIds?: string[];
  },
  admin: { adminId: string; adminEmail: string },
  db: DbClient = prisma
): Promise<FeatureGateItem> {
  const cleanKey = input.key.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  if (!cleanKey) {
    throw new Error("A valid feature gate key is required.");
  }

  const defaultDef = DEFAULT_FEATURE_GATES.find((g) => g.key === cleanKey);
  const rolesStr = input.allowedRoles ? input.allowedRoles.map((r) => r.trim()).filter(Boolean).join(",") : null;
  const orgsStr = input.allowedOrgIds ? input.allowedOrgIds.map((o) => o.trim()).filter(Boolean).join(",") : null;

  const saved = await db.featureGate.upsert({
    where: { key: cleanKey },
    update: {
      enabled: input.enabled,
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      ...(input.allowedRoles !== undefined ? { allowedRoles: rolesStr } : {}),
      ...(input.allowedOrgIds !== undefined ? { allowedOrgIds: orgsStr } : {}),
      updatedBy: admin.adminEmail,
    },
    create: {
      key: cleanKey,
      enabled: input.enabled,
      description: input.description?.trim() || defaultDef?.description || cleanKey,
      allowedRoles: rolesStr,
      allowedOrgIds: orgsStr,
      updatedBy: admin.adminEmail,
    },
  });

  try {
    await recordAuditLog(
      {
        actorId: admin.adminId,
        actorEmail: admin.adminEmail,
        action: "FEATURE_GATE_UPDATE",
        targetType: "SYSTEM",
        targetId: cleanKey,
        details: {
          key: cleanKey,
          enabled: saved.enabled,
          allowedRoles: parseList(saved.allowedRoles),
          allowedOrgIds: parseList(saved.allowedOrgIds),
        },
      },
      db
    );
  } catch (auditErr) {
    if (!isMissingTableOrColumnError(auditErr)) {
      throw auditErr;
    }
  }

  return {
    key: saved.key,
    enabled: saved.enabled,
    description: saved.description || cleanKey,
    allowedRoles: parseList(saved.allowedRoles),
    allowedOrgIds: parseList(saved.allowedOrgIds),
    updatedBy: saved.updatedBy || null,
    updatedAt: saved.updatedAt ? new Date(saved.updatedAt).toISOString() : null,
  };
}
