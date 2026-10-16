import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registerWhatsAppPhoneNumber, getWhatsAppConnection } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/**
 * GET /api/whatsapp/register
 * Returns registration readiness status for current customer's production connection.
 * Strictly uses server-resolved session and organization ID.
 */
export async function GET() {
  try {
    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch {
      session = null;
    }
    const userId = session?.user?.id;
    let orgId = session?.user?.organizationId;

    if (!session || !userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
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
        { success: false, error: "No organization found for your account." },
        { status: 400 }
      );
    }

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
    const errorMsg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: `Failed to fetch registration status: ${errorMsg}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/whatsapp/register
 * Securely registers the authenticated customer's production phone number with Meta Cloud API v24.0.
 * 
 * Strict requirements:
 * 1. Requires authenticated user session.
 * 2. Resolves user organization server-side (never trusts client-supplied organization ID).
 * 3. Fetches only that organization's production connection.
 * 4. Decrypts access token server-side only.
 * 5. Strictly validates 6-digit numeric PIN.
 * 6. Dispatches POST /v24.0/{PHONE_NUMBER_ID}/register with { messaging_product: "whatsapp", pin }.
 * 7. Never logs, persists, caches, or returns the PIN or access token.
 * 8. Handles Meta errors safely (PIN mismatch, rate limit, permissions, network).
 * 9. Updates connection status only after Meta confirms successful registration.
 * 10. Does not automatically retry registration or PIN attempts.
 */
export async function POST(req: NextRequest) {
  try {
    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch {
      session = null;
    }
    const userId = session?.user?.id;
    let orgId = session?.user?.organizationId;

    if (!session || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized. Please sign in to register your WhatsApp phone number.",
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
          error: "No WhatsApp workspace found for your account.",
        },
        { status: 400 }
      );
    }

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
    const errorMsg = error instanceof Error ? error.message : "Internal registration error";
    return NextResponse.json(
      { success: false, error: `Registration error: ${errorMsg}` },
      { status: 500 }
    );
  }
}
