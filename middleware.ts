import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
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
  ],
};
