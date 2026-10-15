import { withAuth, NextRequestWithAuth } from "next-auth/middleware";
import { NextRequest, NextResponse } from "next/server";
import type { NextFetchEvent } from "next/server";

const authMiddleware = withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "wafilow-saas-production-session-secret-key",
});

const CANONICAL_HOST = "wafilow-whatsapp-api.vercel.app";

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";

  // If request arrives on any Vercel preview domain, redirect to canonical production domain
  if (host.endsWith(".vercel.app") && host !== CANONICAL_HOST) {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    url.host = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, { status: 308 });
  }

  return (authMiddleware as unknown as (r: NextRequestWithAuth, e: NextFetchEvent) => Promise<NextResponse>)(
    req as NextRequestWithAuth,
    event
  );
}

export const config = {
  matcher: [
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
  ],
};
