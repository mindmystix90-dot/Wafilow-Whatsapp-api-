import { NextResponse } from "next/server";
import { getWhatsAppConfig } from "@/lib/whatsapp";
import { getServerWhatsAppEnv } from "@/lib/env";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET or POST /api/whatsapp/test-connection
 * Tests connectivity strictly using the current authenticated customer's credentials.
 * Rejects unauthenticated requests and accounts with no connection.
 */
export async function POST() {
  return testMetaConnection();
}

export async function GET() {
  return testMetaConnection();
}

async function testMetaConnection() {
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
          error: "No WhatsApp Business account connected to your workspace yet.",
          code: "NOT_CONFIGURED",
        },
        { status: 400 }
      );
    }

    const config = await getWhatsAppConfig(orgId);
    const env = getServerWhatsAppEnv();
    const apiVersion = env.apiVersion || "v24.0";

    const phoneNumberId = config.phoneNumberId;
    const accessToken = config.accessToken;

    if (!config.isConfigured || !phoneNumberId || !accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Your WhatsApp Business account is not yet connected. Please connect via Embedded Signup or configure credentials in Settings.",
          code: "NOT_CONFIGURED",
        },
        { status: 400 }
      );
    }

    // Call real Meta Graph API endpoint for this phone number
    const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}?fields=verified_name,code_verification_status,display_phone_number,quality_rating`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const metaErr = data.error || {};
      const code = metaErr.code;
      const subcode = metaErr.error_subcode;
      const rawMessage = metaErr.message || "Unknown Meta API error";

      let errorSummary = `Meta API Error (${code || "HTTP " + response.status}): ${rawMessage}`;

      if (code === 190) {
        errorSummary = `Invalid access token (Code 190): ${rawMessage}. Verify your WhatsApp Access Token in Settings or environment variables.`;
      } else if (code === 100) {
        errorSummary = `Invalid phone number ID or parameter (Code 100): ${rawMessage}. Check your Phone Number ID.`;
      } else if (code === 200 || code === 10) {
        errorSummary = `Permission denied (Code ${code}): ${rawMessage}. Ensure your Meta System User has whatsapp_business_messaging and whatsapp_business_management permissions.`;
      } else if (code === 80007) {
        errorSummary = `Rate limit exceeded (Code 80007): ${rawMessage}.`;
      }

      console.error("[Meta Test Connection Error]:", {
        status: response.status,
        code,
        subcode,
        message: rawMessage,
      });

      return NextResponse.json(
        {
          success: false,
          error: errorSummary,
          metaError: {
            code,
            subcode,
            type: metaErr.type,
            message: rawMessage,
            fbtrace_id: metaErr.fbtrace_id,
          },
        },
        { status: 400 }
      );
    }

    // Real Meta verification succeeded
    return NextResponse.json({
      success: true,
      message: "WhatsApp Cloud API connection verified successfully with Meta.",
      details: {
        verifiedName: data.verified_name || "Verified",
        displayPhoneNumber: data.display_phone_number || "Active",
        qualityRating: data.quality_rating || "UNKNOWN",
        verificationStatus: data.code_verification_status || "VERIFIED",
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Network error contacting Meta Cloud API";
    console.error("[Meta Test Connection Network Exception]:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to reach Meta Graph API: ${errorMsg}`,
      },
      { status: 500 }
    );
  }
}
