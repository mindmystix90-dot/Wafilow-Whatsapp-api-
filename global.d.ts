interface Window {
  fbAsyncInit?: () => void;
  FB?: {
    login: (cb: (response: any) => void, opts?: any) => void;
    init: (opts: any) => void;
  };
}
