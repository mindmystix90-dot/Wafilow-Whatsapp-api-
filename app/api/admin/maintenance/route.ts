import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, handleAuthError } from "@/lib/admin-auth";
import {
  getPlatformMaintenanceStatus,
  listFeatureGates,
  updateMaintenanceSettings,
  upsertFeatureGate,
} from "@/lib/release-gate";
import { isMissingTableOrColumnError } from "@/lib/db-errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSuperAdmin();

    const [maintenance, featureData] = await Promise.all([
      getPlatformMaintenanceStatus(),
      listFeatureGates(),
    ]);

    return NextResponse.json({
      success: true,
      maintenance,
      featureGates: featureData.gates,
      schemaReady: maintenance.schemaReady && featureData.schemaReady,
    });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    const body = await req.json().catch(() => ({}));

    const {
      maintenanceMode,
      maintenanceMessage,
      registrationPaused,
      outboundPaused,
      featureGate,
    } = body;

    try {
      let updatedMaintenance = await getPlatformMaintenanceStatus();

      if (
        typeof maintenanceMode === "boolean" ||
        typeof maintenanceMessage === "string" ||
        typeof registrationPaused === "boolean" ||
        typeof outboundPaused === "boolean"
      ) {
        updatedMaintenance = await updateMaintenanceSettings(
          {
            maintenanceMode:
              typeof maintenanceMode === "boolean" ? maintenanceMode : undefined,
            maintenanceMessage:
              typeof maintenanceMessage === "string" ? maintenanceMessage : undefined,
            registrationPaused:
              typeof registrationPaused === "boolean" ? registrationPaused : undefined,
            outboundPaused:
              typeof outboundPaused === "boolean" ? outboundPaused : undefined,
          },
          admin
        );
      }

      if (featureGate && typeof featureGate === "object" && typeof featureGate.key === "string") {
        await upsertFeatureGate(
          {
            key: featureGate.key,
            enabled: Boolean(featureGate.enabled),
            description:
              typeof featureGate.description === "string"
                ? featureGate.description
                : undefined,
            allowedRoles: Array.isArray(featureGate.allowedRoles)
              ? featureGate.allowedRoles.map(String)
              : undefined,
            allowedOrgIds: Array.isArray(featureGate.allowedOrgIds)
              ? featureGate.allowedOrgIds.map(String)
              : undefined,
          },
          admin
        );
      }

      const featureData = await listFeatureGates();

      return NextResponse.json({
        success: true,
        maintenance: updatedMaintenance,
        featureGates: featureData.gates,
        schemaReady: updatedMaintenance.schemaReady && featureData.schemaReady,
        message: "Platform maintenance and rollout settings saved.",
      });
    } catch (dbErr) {
      if (isMissingTableOrColumnError(dbErr)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "PlatformSetting / FeatureGate tables have not been migrated on this database yet. Apply the additive migration SQL first.",
          },
          { status: 503 }
        );
      }
      throw dbErr;
    }
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}
