"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
  retry,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  retry?: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error Boundary]", error);
  }, [error]);

  const handleRetry = () => {
    if (typeof reset === "function") {
      reset();
    } else if (typeof retry === "function") {
      retry();
    } else if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6 font-sans antialiased">
        <div className="max-w-md w-full p-8 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Something went wrong</h2>
          <p className="text-sm text-slate-400">
            A critical system error occurred. Please try reloading or contact your system administrator if the issue persists.
          </p>
          {error?.digest && (
            <p className="text-xs font-mono text-slate-500 bg-slate-900/50 py-1.5 px-3 rounded border border-slate-700/50">
              Digest: {error.digest}
            </p>
          )}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleRetry}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
