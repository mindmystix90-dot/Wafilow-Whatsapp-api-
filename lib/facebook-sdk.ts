"use client";

/**
 * Facebook JavaScript SDK Loader and Meta Embedded Signup Handler
 * Strictly adheres to client-side security: NEVER exposes tokens, secrets, or codes.
 *
 * Meta App ID: 3356483501181888
 * Embedded Signup Configuration ID: 293484983375100
 * Facebook JS SDK version: v26.0
 */

let sdkPromise: Promise<void> | null = null;

/**
 * Loads and initializes the Facebook JavaScript SDK in Next.js/browser environment.
 */
export function loadFacebookSdk(
  appId: string = "3356483501181888",
  version: string = "v26.0"
): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  // If already loaded and initialized, resolve immediately
  if (window.FB) {
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
          xfbml: true,
          version,
        });
        resolve();
      } catch (err) {
        reject(err);
      }
    };

    // If script is already inserted, wait for FB to be available
    const existingScript = document.getElementById("facebook-jssdk");
    if (existingScript) {
      if (window.FB) {
        resolve();
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
  version = "v26.0",
}: {
  appId?: string;
  configId?: string;
  version?: string;
} = {}): Promise<EmbeddedSignupResult> {
  if (typeof window === "undefined") {
    throw new Error("Embedded Signup can only be launched in a browser environment.");
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
    const fb = window.FB;
    if (!fb) {
      window.removeEventListener("message", sessionMessageListener);
      reject(new Error("Facebook JavaScript SDK failed to initialize."));
      return;
    }

    fb.login(
      (response) => {
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
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { version: "v4" },
      }
    );
  });
}
