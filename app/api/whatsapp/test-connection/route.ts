import { NextResponse } from "next/server";
import { getWhatsAppConfig } from "@/lib/whatsapp";
import { getServerWhatsAppEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * GET or POST /api/whatsapp/test-connection
 * Performs a REAL Meta Graph API request to test connectivity and credential validity.
 * Queries the phone number details from Meta Graph API.
 * Never hides the real Meta error behind generic messages.
 */
export async function POST() {
  return testMetaConnection();
}

export async function GET() {
  return testMetaConnection();
}

async function testMetaConnection() {
  try {
    const config = await getWhatsAppConfig();
    const env = getServerWhatsAppEnv();

    const phoneNumberId = config.phoneNumberId || env.phoneNumberId;
    const accessToken = config.accessToken || env.accessToken;
    const apiVersion = env.apiVersion || "v21.0";

    if (!phoneNumberId) {
      return NextResponse.json(
        {
          success: false,
          error: "WHATSAPP_PHONE_NUMBER_ID is not configured. Please supply your Phone Number ID.",
          code: "MISSING_PHONE_NUMBER_ID",
        },
        { status: 400 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "WHATSAPP_ACCESS_TOKEN is not configured. Please supply your Meta Permanent System User Token.",
          code: "MISSING_ACCESS_TOKEN",
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
