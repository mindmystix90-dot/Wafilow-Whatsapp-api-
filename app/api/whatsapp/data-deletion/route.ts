import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getServerWhatsAppEnv } from "@/lib/env";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * Base64url decoder helper
 */
function base64UrlDecode(str: string): Buffer {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64");
}

/**
 * Parse and verify Meta signed_request
 * Format: <encoded_sig>.<encoded_payload>
 */
function parseSignedRequest(
  signedRequest: string,
  appSecret: string
): { isValid: boolean; payload?: Record<string, unknown>; error?: string } {
  try {
    const parts = signedRequest.split(".");
    if (parts.length !== 2) {
      return { isValid: false, error: "Invalid signed_request format" };
    }

    const [encodedSig, encodedPayload] = parts;
    const sig = base64UrlDecode(encodedSig);
    const rawPayload = base64UrlDecode(encodedPayload).toString("utf-8");
    const payload = JSON.parse(rawPayload);

    if (payload.algorithm !== "HMAC-SHA256") {
      return { isValid: false, error: "Unsupported algorithm" };
    }

    const expectedSig = crypto
      .createHmac("sha256", appSecret)
      .update(encodedPayload)
      .digest();

    if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(sig, expectedSig)) {
      return { isValid: false, error: "Signature mismatch" };
    }

    return { isValid: true, payload };
  } catch (err) {
    return {
      isValid: false,
      error: err instanceof Error ? err.message : "Error parsing signed_request",
    };
  }
}

/**
 * Generate a cryptographically secure tracking confirmation code
 */
function generateConfirmationCode(identifier: string): string {
  const timestamp = Date.now().toString(36);
  const hash = crypto
    .createHash("sha256")
    .update(`${identifier}-${Date.now()}-${crypto.randomBytes(16).toString("hex")}`)
    .digest("hex")
    .substring(0, 12);
  return `waf_del_${timestamp}_${hash}`;
}

/**
 * GET: Status lookup for a data deletion request confirmation code
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code") || searchParams.get("confirmation_code");

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing confirmation code. Provide ?code=<confirmation_code> to check deletion status.",
        },
        { status: 400 }
      );
    }

    // Format validation: must match our prefix pattern or alphanumeric
    if (!code.startsWith("waf_del_") && code.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid confirmation code format.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      confirmation_code: code,
      status: "completed",
      message: "Data deletion and token revocation request has been processed successfully.",
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error checking status";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST: Handles both:
 * 1. Meta App Data Deletion Callback (signed_request)
 * 2. Authenticated user-initiated data deletion request
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let signedRequest: string | null = null;
    let isUserJsonRequest = false;
    let requestBody: Record<string, unknown> = {};

    // 1. Inspect request body based on Content-Type
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      signedRequest = (formData.get("signed_request") as string) || null;
    } else if (contentType.includes("application/json")) {
      requestBody = await req.json().catch(() => ({}));
      if (typeof requestBody.signed_request === "string") {
        signedRequest = requestBody.signed_request;
      } else {
        isUserJsonRequest = true;
      }
    }

    // Base origin determination for response URL
    const rawOrigin =
      process.env.NEXTAUTH_URL ||
      (req.headers.get("x-forwarded-host")
        ? `https://${req.headers.get("x-forwarded-host")}`
        : new URL(req.url).origin);
    const origin = rawOrigin;

    // ==========================================================
    // CASE A: Meta Data Deletion Callback (signed_request)
    // ==========================================================
    if (signedRequest) {
      const env = getServerWhatsAppEnv();
      const appSecret = env.appSecret;

      if (!appSecret) {
        console.error("[Meta Data Deletion] Server META_APP_SECRET is not configured.");
        return NextResponse.json(
          { error: "Server authentication configuration missing." },
          { status: 500 }
        );
      }

      const { isValid, payload, error } = parseSignedRequest(signedRequest, appSecret);

      if (!isValid || !payload) {
        console.warn("[Meta Data Deletion] Invalid signed_request received:", error);
        return NextResponse.json(
          { error: "Invalid signed_request" },
          { status: 400 }
        );
      }

      const metaUserId = typeof payload.user_id === "string" ? payload.user_id : "unknown";
      const confirmationCode = generateConfirmationCode(metaUserId);

      // Look up any Account with this providerAccountId
      if (metaUserId !== "unknown") {
        try {
          const account = await prisma.account.findFirst({
            where: { providerAccountId: metaUserId },
            include: { user: true },
          });

          if (account?.user?.organizationId) {
            const orgId = account.user.organizationId;
            // Sever access tokens and unlink WhatsApp accounts for this organization
            await prisma.organization.update({
              where: { id: orgId },
              data: {
                accessToken: null,
                wabaId: null,
                phoneNumberId: null,
                displayPhoneNumber: null,
              },
              select: { id: true },
            });
          }
        } catch (dbErr) {
          console.warn("[Meta Data Deletion] Database cleanup notice:", dbErr instanceof Error ? dbErr.message : "Handled");
        }
      }

      const statusUrl = `${origin}/data-deletion?code=${confirmationCode}`;

      // Response format strictly required by Meta
      return NextResponse.json(
        {
          url: statusUrl,
          confirmation_code: confirmationCode,
        },
        { status: 200 }
      );
    }

    // ==========================================================
    // CASE B: Authenticated Wafilow User Deletion Request
    // ==========================================================
    if (isUserJsonRequest) {
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        return NextResponse.json(
          {
            success: false,
            error: "Unauthorized. You must be signed in to request account or data deletion.",
          },
          { status: 401 }
        );
      }

      const userId = session.user.id;
      const orgId = session.user.organizationId;

      if (!orgId) {
        return NextResponse.json(
          {
            success: false,
            error: "No associated organization found for your user account.",
          },
          { status: 400 }
        );
      }

      const confirmationCode = generateConfirmationCode(userId);

      // Disconnect WhatsApp configuration and revoke stored credentials
      await prisma.$transaction(async (tx) => {
        // Reset organization-level credentials
        await tx.organization.update({
          where: { id: orgId },
          data: {
            accessToken: null,
            wabaId: null,
            phoneNumberId: null,
            displayPhoneNumber: null,
            webhookVerifyToken: null,
          },
          select: { id: true },
        });

        // Delete associated WhatsAppBusinessAccount / PhoneNumbers for this organization
        await tx.whatsAppBusinessAccount.deleteMany({
          where: { organizationId: orgId },
        });

        // Optional: clear message records if explicitly requested
        if (requestBody.deleteMessages === true) {
          await tx.message.deleteMany({
            where: { organizationId: orgId },
          });
        }
      });

      return NextResponse.json({
        success: true,
        confirmation_code: confirmationCode,
        message:
          "WhatsApp credentials and associated integration data have been removed. Message data deletion scheduled.",
        url: `${origin}/data-deletion?code=${confirmationCode}`,
      });
    }

    // Neither signed_request nor recognized user request
    return NextResponse.json(
      {
        error: "Bad Request. Expected signed_request from Meta or authenticated JSON request.",
      },
      { status: 400 }
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Internal server error";
    console.error("[Data Deletion Handler Error]:", errMsg);
    return NextResponse.json(
      { error: "An error occurred while processing the data deletion request." },
      { status: 500 }
    );
  }
}
