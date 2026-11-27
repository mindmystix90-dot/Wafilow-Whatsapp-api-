import { NextResponse } from "next/server";
import { getPlatformMaintenanceStatus, listFeatureGates } from "@/lib/release-gate";

export const dynamic = "force-dynamic";

/**
 * GET /api/platform/status
 * Public read-only platform status endpoint for maintenance notices and rollout flags.
 * Exposes zero secrets, zero tenant data, and zero internal credentials.
 */
export async function GET() {
  try {
    const [maintenance, gateData] = await Promise.all([
      getPlatformMaintenanceStatus(),
      listFeatureGates(),
    ]);

    const featureFlags: Record<string, boolean> = {};
    for (const gate of gateData.gates) {
      featureFlags[gate.key] = gate.enabled;
    }

    return NextResponse.json({
      success: true,
      maintenanceMode: maintenance.maintenanceMode,
      maintenanceMessage: maintenance.maintenanceMessage,
      registrationPaused: maintenance.registrationPaused || !featureFlags.public_registration,
      outboundPaused: maintenance.outboundPaused || !featureFlags.outbound_messaging,
      features: featureFlags,
      updatedAt: maintenance.updatedAt,
    });
  } catch (error) {
    console.error("[Platform Status] Error loading status:", error);
    return NextResponse.json({
      success: true,
      maintenanceMode: false,
      maintenanceMessage: "",
      registrationPaused: false,
      outboundPaused: false,
      features: {
        embedded_signup_v5: true,
        business_app_coexistence: true,
        outbound_messaging: true,
        public_registration: true,
      },
      updatedAt: null,
    });
  }
}
