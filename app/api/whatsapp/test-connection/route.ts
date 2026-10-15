import { NextRequest, NextResponse } from "next/server";
import { testWhatsAppConnectionDiagnostic, validateEnvironment, WhatsAppEnvironment } from "@/lib/whatsapp";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

async function runTest(req: NextRequest, rawEnv: string) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    let orgId = session?.user?.organizationId;

    if (!session || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized. Please sign in to test your WhatsApp connection.",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    if (!orgId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      orgId = user?.organizationId || null;
    }

    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          error: "No WhatsApp Business account workspace found for your account.",
          code: "NOT_CONFIGURED",
        },
        { status: 400 }
      );
    }

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
    const errorMsg = error instanceof Error ? error.message : "Error contacting Meta";
    return NextResponse.json(
      {
        success: false,
        error: `Diagnostic test failed: ${errorMsg}`,
      },
      { status: 500 }
    );
  }
}
