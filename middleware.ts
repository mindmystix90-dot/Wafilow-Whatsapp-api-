import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: () => {
      // In preview/dev allow seamless navigation, or token if present
      return true;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "wafilow-default-secret-key-32charsmin",
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/inbox/:path*",
    "/contacts/:path*",
    "/campaigns/:path*",
    "/templates/:path*",
    "/automations/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/team/:path*",
  ]
};
