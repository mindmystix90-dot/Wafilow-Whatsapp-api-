"use client";

/**
 * Facebook JavaScript SDK Loader and Meta Embedded Signup Handler
 * Strictly adheres to client-side security: NEVER exposes tokens, secrets, or codes.
 *
 * Meta App ID: 3356483501181888
 * Embedded Signup Configuration ID: 293484983375100
 * Facebook JS SDK version: v21.0
 */

let sdkPromise: Promise<void> | null = null;
let fbInitCompleted = false;

/**
 * Loads and initializes the Facebook JavaScript SDK in Next.js/browser environment.
 */
export function loadFacebookSdk(
  appId: string = "3356483501181888",
  version: string = "v21.0"
): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  // If already loaded and initialized, ensure FB.init is run with target version
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
    // Configure initialization callback
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

    // If script is already inserted, wait for FB to be available
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
  sessionInfo?: Record<string, unknown>;
}

/**
 * Launches Meta WhatsApp Embedded Signup flow.
 * - Adds window "message" listener to capture WA_EMBEDDED_SIGNUP session details.
 * - Calls FB.login with config_id, response_type: 'code', and version: 'v4'.
 * - Returns code, wabaId, phoneNumberId, and sessionInfo to be passed to server.
 */
export async function launchEmbeddedSignup({
  appId = "3356483501181888",
  configId = "293484983375100",
  version = "v21.0",
}: {
  appId?: string;
  configId?: string;
  version?: string;
} = {}): Promise<EmbeddedSignupResult> {
  if (typeof window === "undefined") {
    throw new Error("Embedded Signup can only be launched in a browser environment.");
  }

  // Ensure Embedded Signup flow only originates from the registered Meta production domain
  const CANONICAL_PRODUCTION_ORIGIN = "https://wafilow-whatsapp-api.vercel.app";
  const CANONICAL_HOST = "wafilow-whatsapp-api.vercel.app";

  if (
    typeof window !== "undefined" &&
    window.location.hostname.endsWith(".vercel.app") &&
    window.location.hostname !== CANONICAL_HOST
  ) {
    console.warn(
      `[Embedded Signup] Preview domain detected (${window.location.hostname}). Redirecting to production domain ${CANONICAL_PRODUCTION_ORIGIN}/settings.`
    );
    window.location.href = `${CANONICAL_PRODUCTION_ORIGIN}/settings`;
    return new Promise<EmbeddedSignupResult>(() => {});
  }

  // Ensure Facebook SDK is initialized
  await loadFacebookSdk(appId, version);

  if (!window.FB) {
    throw new Error("Facebook JavaScript SDK is not available.");
  }

  return new Promise<EmbeddedSignupResult>((resolve, reject) => {
    let capturedWabaId: string | undefined;
    let capturedPhoneId: string | undefined;
    let capturedSessionInfo: Record<string, unknown> = {};
    let isCancelled = false;
    let metaErrorMessage: string | null = null;

    // Window message listener for Embedded Signup session info
    const sessionMessageListener = (event: MessageEvent) => {
      // Validate origin is from Facebook
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      ) {
        return;
      }

      try {
        const payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (payload && payload.type === "WA_EMBEDDED_SIGNUP") {
          capturedSessionInfo = { ...capturedSessionInfo, ...payload };

          if (payload.event === "FINISH" || payload.event === "FINISH_ONLY_WABA") {
            const data = payload.data || {};
            const waba = data.waba_id || data.wabaId;
            const phone = data.phone_number_id || data.phoneNumberId;
            if (waba) capturedWabaId = String(waba).trim();
            if (phone) capturedPhoneId = String(phone).trim();
          } else if (payload.event === "CANCEL") {
            isCancelled = true;
          } else if (payload.event === "ERROR") {
            metaErrorMessage =
              payload.data?.error_message ||
              payload.data?.message ||
              "Meta returned an error during the Embedded Signup onboarding.";
          }
        }
      } catch {
        // Ignore unparseable postMessages
      }
    };

    window.addEventListener("message", sessionMessageListener);

    // Launch Facebook Login for Business
    const FB = window.FB;
    if (!FB) {
      window.removeEventListener("message", sessionMessageListener);
      reject(new Error("Facebook JavaScript SDK failed to initialize."));
      return;
    }

    const fbLoginCallback = (response: FbResponse) => {
      window.removeEventListener("message", sessionMessageListener);

      if (isCancelled) {
        reject(new Error("Embedded Signup was cancelled by the user."));
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
            "Meta Embedded Signup was closed or authorization was cancelled. No temporary authorization code was returned."
          )
        );
        return;
      }

      resolve({
        code,
        wabaId: capturedWabaId,
        phoneNumberId: capturedPhoneId,
        sessionInfo: capturedSessionInfo,
      });
    };

    const effectiveConfigId = (configId || "293484983375100").trim();
    const effectiveAppId = (appId || "3356483501181888").trim();

    const loginOptions: FbLoginOptions = {
      config_id: effectiveConfigId,
      response_type: "code",
      override_default_response_type: true,
      extras: {},
    };

    console.log("=== FACEBOOK SDK DIAGNOSTIC ===");
    console.log("window.location.href:", window.location.href);
    console.log("window.location.origin:", window.location.origin);
    console.log("document.location.href:", document.location.href);
    console.log("document.location.origin:", document.location.origin);
    console.log("window.self === window.top:", window.self === window.top);
    console.log("hostname:", window.location.hostname);
    console.log("protocol:", window.location.protocol);
    console.log("FB exists:", !!window.FB);
    console.log("FB.init completed:", fbInitCompleted);
    console.log("FB App ID/config:", {
      appId: effectiveAppId,
      configId: effectiveConfigId,
    });
    console.log("FB.login arguments:", loginOptions);

    FB.login(fbLoginCallback, loginOptions);
  });
}

/**
 * Direct alias for launchEmbeddedSignup to trace the exact runtime flow:
 * Connect WhatsApp button -> launchWhatsAppSignup() -> FB.login()
 */
export const launchWhatsAppSignup = launchEmbeddedSignup;

if (typeof window !== "undefined") {
  (window as unknown as { launchWhatsAppSignup?: typeof launchEmbeddedSignup }).launchWhatsAppSignup = launchEmbeddedSignup;
}
