interface FbResponse {
  authResponse?: {
    accessToken?: string;
    code?: string;
  };
  status?: string;
}

interface FbInitOptions {
  appId?: string;
  cookie?: boolean;
  xfbml?: boolean;
  version?: string;
  [key: string]: unknown;
}

interface FbLoginOptions {
  scope?: string;
  extras?: Record<string, unknown>;
  [key: string]: unknown;
}

interface Window {
  fbAsyncInit?: () => void;
  FB?: {
    login: (cb: (response: FbResponse) => void, opts?: FbLoginOptions) => void;
    init: (opts: FbInitOptions) => void;
  };
}
