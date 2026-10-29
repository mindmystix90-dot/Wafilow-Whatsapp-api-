import { NextRequest, NextResponse } from "next/server";
import { registerWhatsAppPhoneNumber, getWhatsAppConnection } from "@/lib/whatsapp";
import { requireActiveUserSession, handleAuthError } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/whatsapp/register
 * Returns registration readiness status for current customer's production connection.
 * Strictly uses server-resolved session and organization ID.
 */
export async function GET() {
  try {
    const sessionUser = await requireActiveUserSession();
    const orgId = sessionUser.organizationId;

    const conn = await getWhatsAppConnection(orgId, "production");
    const isPendingRegistration = Boolean(
      conn.lastError?.includes("133010") ||
      conn.lastError?.toLowerCase().includes("registration") ||
      conn.lastError?.toLowerCase().includes("not registered")
    );

    return NextResponse.json({
      success: true,
      environment: "production",
      isConfigured: conn.isConfigured,
      phoneNumberId: conn.phoneNumberId || null,
      displayPhoneNumber: conn.displayPhoneNumber || null,
      verifiedName: conn.verifiedName || null,
      wabaId: conn.wabaId || null,
      status: conn.status,
      isPendingRegistration,
      lastError: conn.lastError || null,
    });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}

/**
 * POST /api/whatsapp/register
 * Securely registers the authenticated customer's production phone number with Meta Cloud API v24.0.
 */
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireActiveUserSession();
    const orgId = sessionUser.organizationId;

    const body = await req.json().catch(() => ({}));
    const pin = body?.pin;

    // Strict 6-digit numeric PIN validation
    if (!pin || typeof pin !== "string" || !/^\d{6}$/.test(pin.trim())) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid PIN format. Two-step verification PIN must be exactly 6 numeric digits.",
        },
        { status: 400 }
      );
    }

    const result = await registerWhatsAppPhoneNumber({
      organizationId: orgId,
      pin: pin.trim(),
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          errorCode: result.errorCode,
          errorSubcode: result.errorSubcode,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}

