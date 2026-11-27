import { withAuth, NextRequestWithAuth } from "next-auth/middleware";
import { NextRequest, NextResponse } from "next/server";
import type { NextFetchEvent } from "next/server";

const DEFAULT_ALLOWED_HOSTS = new Set([
  "wafilow-whatsapp-api.vercel.app",
  "wjr-orion-edmunds-projects.vercel.app",
]);

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const canonicalHost = process.env.CANONICAL_HOST || "wafilow-whatsapp-api.vercel.app";
  const disableCanonicalRedirect = process.env.DISABLE_CANONICAL_REDIRECT === "true";

  // If request arrives on an untrusted preview domain and redirect is not disabled, redirect to canonical host
  if (
    !disableCanonicalRedirect &&
    host.endsWith(".vercel.app") &&
    host !== canonicalHost &&
    !DEFAULT_ALLOWED_HOSTS.has(host)
  ) {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    url.host = canonicalHost;
    url.port = "";
    return NextResponse.redirect(url, { status: 308 });
  }

  const pathname = req.nextUrl.pathname;
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  if (!nextAuthSecret || nextAuthSecret.trim() === "") {
    console.error(
      "[Auth Middleware] FATAL: NEXTAUTH_SECRET environment variable is missing or empty. Refusing access to protected route."
    );
    return NextResponse.json(
      { error: "Authentication service is misconfigured." },
      { status: 500 }
    );
  }

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  const authMiddleware = withAuth({
    callbacks: {
      authorized: ({ token }) => Boolean(token && token.id && !token.revoked),
    },
    pages: {
      signIn: isAdminRoute ? "/admin/login" : "/login",
    },
    secret: nextAuthSecret,
  });

  return (authMiddleware as unknown as (r: NextRequestWithAuth, e: NextFetchEvent) => Promise<NextResponse>)(
    req as NextRequestWithAuth,
    event
  );
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/dashboard/:path*",
    "/inbox/:path*",
    "/contacts/:path*",
    "/campaigns/:path*",
    "/templates/:path*",
    "/automations/:path*",
    "/integrations",
    "/integrations/:path*",
    "/analytics/:path*",
    "/settings",
    "/settings/:path*",
    "/team/:path*",
    "/profile",
    "/profile/:path*",
  ],
};
