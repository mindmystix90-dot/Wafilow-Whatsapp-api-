"use client";

import { parseEmbeddedSignupSession } from "@/lib/embedded-signup";

/**
 * Facebook JavaScript SDK Loader and Meta Embedded Signup Handler
 * Strictly adheres to client-side security: NEVER exposes tokens, secrets, or codes.
 *
 * Uses Meta Embedded Signup v5 (`extras: { version: "v5", setup: {} }`) with Business App
 * Coexistence enabled by default while preserving v4 payload fallback.
 */

let sdkPromise: Promise<void> | null = null;
let fbInitCompleted = false;

export { parseEmbeddedSignupSession };

/**
 * Loads and initializes the Facebook JavaScript SDK in Next.js/browser environment.
 */
export function loadFacebookSdk(
  appId: string = "3356483501181888",
  version: string = "v24.0"
): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.FB) {
    try {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version,
      });
      fbInitCompleted = true;
    } catch {
      // Re-init guard
    }
    return Promise.resolve();
  }

  if (sdkPromise) {
    return sdkPromise;
  }

  sdkPromise = new Promise<void>((resolve, reject) => {
    window.fbAsyncInit = function () {
      try {
        window.FB?.init({
          appId,
          cookie: true,
          xfbml: false,
          version,
        });
        fbInitCompleted = true;
        resolve();
      } catch (err) {
        reject(err);
      }
    };

    const existingScript = document.getElementById("facebook-jssdk");
    if (existingScript) {
      if (window.FB) {
        try {
          window.FB.init({
            appId,
            cookie: true,
            xfbml: false,
            version,
          });
          fbInitCompleted = true;
        } catch {
          // Re-init guard
        }
        resolve();
      } else {
        existingScript.addEventListener("load", () => {
          if (window.FB) {
            try {
              window.FB.init({
                appId,
                cookie: true,
                xfbml: false,
                version,
              });
              fbInitCompleted = true;
            } catch {
              // Re-init guard
            }
          }
          resolve();
        });
      }
      return;
    }

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => {
      sdkPromise = null;
      reject(
        new Error(
          "Failed to load Meta Facebook JavaScript SDK. Please check your internet connection or browser ad/tracking blockers."
        )
      );
    };

    document.body.appendChild(script);
  });

  return sdkPromise;
}

export interface EmbeddedSignupResult {
  code: string;
  wabaId?: string;
  phoneNumberId?: string;
  primaryWaacId?: string;
  messagingAccountIds?: string[];
  primaryWaacIds?: string[];
  isOnBizApp?: boolean;
  sessionInfo?: Record<string, unknown>;
  event?: string;
  isCoexistence?: boolean;
}

/**
 * Builds Meta WhatsApp Embedded Signup v5 FB.login options.
 * - Uses extras.version = "v5" with empty setup object per Meta v5 docs.
 * - Omits legacy sessionInfoVersion ("3") and featureType ("whatsapp_business_app_onboarding"),
 *   which are ignored/superseded in v5 (Business App onboarding is enabled by default in v5).
 */
export function buildEmbeddedSignupLoginOptions(
  configId: string = "2934849833375100"
): FbLoginOptions {
  const effectiveConfigId = (configId || "2934849833375100").trim();
  return {
    config_id: effectiveConfigId,
    response_type: "code",
    override_default_response_type: true,
    extras: {
      version: "v5",
      setup: {},
    },
  };
}

/**
 * Launches Meta WhatsApp Embedded Signup flow with Business App Coexistence support.
 * - Captures WA_EMBEDDED_SIGNUP postMessage events from verified Meta origins.
 * - Parses v5 fields (messaging_account_ids, primary_waac_ids, is_on_biz_app) + v4 fallback.
 * - Sends raw sessionInfo alongside code to the server for strict server-side verification.
 */
export async function launchEmbeddedSignup({
  appId = "3356483501181888",
  configId = "2934849833375100",
  version = "v24.0",
}: {
  appId?: string;
  configId?: string;
  version?: string;
} = {}): Promise<EmbeddedSignupResult> {
  if (typeof window === "undefined") {
    throw new Error("Embedded Signup can only be launched in a browser environment.");
  }

  const ALLOWED_HOSTS = new Set([
    "wafilow-whatsapp-api.vercel.app",
    "wjr-orion-edmunds-projects.vercel.app",
    "localhost",
    "127.0.0.1",
  ]);

  if (
    typeof window !== "undefined" &&
    window.location.hostname.endsWith(".vercel.app") &&
    !ALLOWED_HOSTS.has(window.location.hostname) &&
    process.env.NEXT_PUBLIC_DISABLE_CANONICAL_REDIRECT !== "true"
  ) {
    console.warn(
      `[Embedded Signup] Unregistered preview domain detected (${window.location.hostname}). Meta OAuth requires the domain to be registered in Meta App Settings.`
    );
  }

  await loadFacebookSdk(appId, version);

  if (!window.FB) {
    throw new Error("Facebook JavaScript SDK is not available.");
  }

  return new Promise<EmbeddedSignupResult>((resolve, reject) => {
    let capturedSessionInfo: Record<string, unknown> = {};
    let capturedEvent: string | undefined;
    let isCancelled = false;
    let metaErrorMessage: string | null = null;

    const sessionMessageListener = (event: MessageEvent) => {
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      ) {
        return;
      }

      try {
        const payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (payload && payload.type === "WA_EMBEDDED_SIGNUP") {
          const prevData =
            capturedSessionInfo.data && typeof capturedSessionInfo.data === "object"
              ? (capturedSessionInfo.data as Record<string, unknown>)
              : {};
          const nextData =
            payload.data && typeof payload.data === "object"
              ? (payload.data as Record<string, unknown>)
              : {};

          capturedSessionInfo = {
            ...capturedSessionInfo,
            ...payload,
            data: { ...prevData, ...nextData },
          };

          if (typeof payload.event === "string") {
            capturedEvent = payload.event;
          }

          if (payload.event === "CANCEL") {
            isCancelled = true;
          } else if (payload.event === "ERROR") {
            metaErrorMessage =
              payload.data?.error_message ||
              payload.data?.message ||
              "Meta returned an error during WhatsApp onboarding.";
          }
        }
      } catch {
        // Ignore unparseable postMessages
      }
    };

    window.addEventListener("message", sessionMessageListener);

    const FB = window.FB;
    if (!FB) {
      window.removeEventListener("message", sessionMessageListener);
      reject(new Error("Facebook JavaScript SDK failed to initialize."));
      return;
    }

    const fbLoginCallback = (response: FbResponse) => {
      window.removeEventListener("message", sessionMessageListener);

      if (isCancelled) {
        reject(new Error("WhatsApp onboarding was cancelled by the user."));
        return;
      }

      if (metaErrorMessage) {
        reject(new Error(metaErrorMessage));
        return;
      }

      const code = response?.authResponse?.code;
      if (!code) {
        reject(
          new Error(
            "Meta authorization was closed or cancelled. No temporary authorization code was returned."
          )
        );
        return;
      }

      const parsed = parseEmbeddedSignupSession(capturedSessionInfo, capturedEvent);

      resolve({
        code,
        wabaId: parsed.wabaId,
        phoneNumberId: parsed.phoneNumberId,
        primaryWaacId: parsed.primaryWaacId,
        messagingAccountIds: parsed.messagingAccountIds,
        primaryWaacIds: parsed.primaryWaacIds,
        isOnBizApp: parsed.isOnBizApp,
        sessionInfo: capturedSessionInfo,
        event: parsed.event,
        isCoexistence: parsed.isCoexistenceSession,
      });
    };

    const loginOptions = buildEmbeddedSignupLoginOptions(configId);

    if (process.env.NODE_ENV !== "production") {
      console.debug("[Embedded Signup] Launching Meta login flow", {
        fbInitCompleted,
        configId: loginOptions.config_id,
        sdkVersion: version,
      });
    }

    FB.login(fbLoginCallback, loginOptions);
  });
}

/**
 * Direct alias for launchEmbeddedSignup
 */
export const launchWhatsAppSignup = launchEmbeddedSignup;

if (typeof window !== "undefined") {
  (window as unknown as { launchWhatsAppSignup?: typeof launchEmbeddedSignup }).launchWhatsAppSignup =
    launchEmbeddedSignup;
}
