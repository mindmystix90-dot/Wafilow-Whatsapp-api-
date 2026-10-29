import { NextRequest, NextResponse } from "next/server";
import { testWhatsAppConnectionDiagnostic, validateEnvironment, WhatsAppEnvironment } from "@/lib/whatsapp";
import { requireActiveUserSession, handleAuthError } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET or POST /api/whatsapp/test-connection
 * Tests connectivity strictly using the current authenticated customer's credentials
 * for the requested environment ('production' or 'sandbox').
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const rawEnv = body?.environment || "production";
  return runTest(req, rawEnv);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawEnv = searchParams.get("environment") || "production";
  return runTest(req, rawEnv);
}

async function runTest(_req: NextRequest, rawEnv: string) {
  try {
    const sessionUser = await requireActiveUserSession();
    const orgId = sessionUser.organizationId;

    let environment: WhatsAppEnvironment;
    try {
      environment = validateEnvironment(rawEnv);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid environment '${rawEnv}'. Expected 'production' or 'sandbox'.`,
          code: "INVALID_ENVIRONMENT",
        },
        { status: 400 }
      );
    }

    const result = await testWhatsAppConnectionDiagnostic(orgId, environment);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          environment,
          error: result.error,
          errorCode: result.errorCode,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      environment,
      message: `${environment === "sandbox" ? "Meta Sandbox" : "Production"} WhatsApp Cloud API verified successfully.`,
      phoneStatus: result.phoneStatus,
      wabaStatus: result.wabaStatus,
      sandboxRestrictions: result.sandboxRestrictions,
    });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}

