import { NextAuthOptions, Session, User } from "next-auth";
import { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { Adapter } from "next-auth/adapters";
import bcrypt from "bcryptjs";

// Strict Environment Secret Enforcement:
// In production runtime, NEXTAUTH_SECRET must be explicitly configured.
const configuredSecret = process.env.NEXTAUTH_SECRET;
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build" || process.env.npm_lifecycle_event === "build";

if (!isBuildPhase && process.env.NODE_ENV === "production" && (!configuredSecret || configuredSecret.trim() === "")) {
  throw new Error("FATAL: NEXTAUTH_SECRET environment variable is missing or empty. A secure random secret is required in production.");
}

export const nextAuthSecret =
  configuredSecret ||
  (isBuildPhase
    ? "build-time-secret-placeholder-for-compilation"
    : "wafilow-dev-local-secret-replace-in-production");

interface CustomToken extends JWT {
  id?: string;
  role?: string;
  organizationId?: string | null;
  sessionVersion?: number;
  picture?: string | null;
  name?: string | null;
  revoked?: boolean;
}

/**
 * Dependency-Injected Callbacks Factory for NextAuth.
 * Supports clean testing with mocked databases without ESM mutation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAuthCallbacks(db: any = prisma) {
  return {
    async jwt({
      token,
      user,
      trigger,
      session,
    }: {
      token: CustomToken;
      user?: User;
      trigger?: "signIn" | "signUp" | "update";
      session?: Record<string, unknown>;
    }) {
      // Initial Sign In
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.organizationId = (user as { organizationId?: string | null }).organizationId;
        token.sessionVersion = (user as { sessionVersion?: number }).sessionVersion ?? 1;
        token.picture = user.image || null;
      }

      // Client session.update() - STRICT TAMPERING PROTECTION:
      // Only name and picture can be updated via client session trigger.
      // Roles, organization IDs, and sessionVersions are strictly ignored from client payloads.
      if (trigger === "update" && session) {
        if (typeof session.name === "string") token.name = session.name;
        if (typeof session.image === "string" || session.image === null) token.picture = session.image;
      }

      // Real-time Database Verification on Every Request
      if (token.id) {
        try {
          const dbUser = await db.user.findUnique({
            where: { id: token.id },
            select: {
              id: true,
              organizationId: true,
              role: true,
              status: true,
              sessionVersion: true,
              image: true,
              name: true,
              organization: {
                select: { id: true, status: true },
              },
            },
          });

          // Legacy JWT Support: If client token lacks sessionVersion, treat as version 1
          const effectiveTokenVersion = token.sessionVersion ?? 1;

          // FAIL-CLOSED VALIDATION:
          const isSuperAdmin = dbUser?.role === "super_admin";
          const isUserActive = dbUser && (dbUser.status ?? "active") === "active";
          const isSessionCurrent = dbUser && (dbUser.sessionVersion ?? 1) === effectiveTokenVersion;
          const isWorkspaceValid =
            isSuperAdmin || !dbUser?.organization || (dbUser.organization.status ?? "active") === "active";

          if (!dbUser || !isUserActive || !isSessionCurrent || !isWorkspaceValid) {
            delete token.id;
            delete token.role;
            delete token.organizationId;
            delete token.sessionVersion;
            token.revoked = true;
            return token;
          }

          // Authoritative DB state synchronization
          token.sessionVersion = dbUser.sessionVersion ?? 1;
          token.role = dbUser.role;
          token.organizationId = dbUser.organizationId;
          token.picture = dbUser.image || null;
          if (dbUser.name) token.name = dbUser.name;
        } catch (error) {
          // FAIL CLOSED ON DATABASE ERROR: Strip credentials, never return stale token
          console.error("[NextAuth JWT Callback] DB verification failed. Failing closed:", error);
          delete token.id;
          delete token.role;
          delete token.organizationId;
          delete token.sessionVersion;
          token.revoked = true;
          return token;
        }
      }

      return token;
    },

    async session({ session, token }: { session: Session; token: CustomToken }) {
      // If token was revoked, invalidated, or stripped of id -> emit unauthenticated session
      if (!token?.id || token.revoked) {
        return {
          expires: session.expires,
        } as unknown as Session;
      }

      session.user = {
        id: token.id,
        email: (token.email as string) || session.user?.email,
        name: (token.name as string) || session.user?.name,
        image: (token.picture as string | null) || null,
        role: token.role as string,
        organizationId: (token.organizationId as string | null) || null,
        sessionVersion: token.sessionVersion as number,
      };

      return session;
    },
  };
}

export const defaultCallbacks = createAuthCallbacks(prisma);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    CredentialsProvider({
      name: "Workspace Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@wafilow.com" },
        password: { label: "Password", type: "password" },
        isAdminPortal: { label: "isAdminPortal", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = credentials.email.toLowerCase().trim();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let user: any;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          user = await (prisma.user as any).findUnique({
            where: { email: normalizedEmail },
            include: {
              organization: {
                select: { id: true, status: true },
              },
            },
          });
        } catch (error) {
          console.error("[NextAuth authorize] Database lookup failed:", error);
          throw new Error("Authentication service is temporarily unavailable. Please try again later.");
        }

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          return null;
        }

        // Enforce User Suspension
        if (user.status && user.status !== "active") {
          throw new Error("Your account has been suspended. Please contact support.");
        }

        // Enforce Organization Suspension (For Customer Logins)
        const isAdminLogin = credentials.isAdminPortal === "true";
        if (!isAdminLogin && user.organization && user.organization.status !== "active") {
          throw new Error("Your organization workspace has been suspended. Please contact support.");
        }

        // Portal-specific Privilege Assertion
        if (isAdminLogin) {
          if (user.role !== "super_admin") {
            return null; // Anti-enumeration
          }
        }

        return {
          id: user.id,
          name: user.name || normalizedEmail.split("@")[0],
          email: user.email,
          image: user.image,
          role: user.role,
          organizationId: user.organizationId,
          sessionVersion: user.sessionVersion ?? 1,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: nextAuthSecret,
  pages: {
    signIn: "/login",
  },
  callbacks: defaultCallbacks as unknown as NextAuthOptions["callbacks"],
};
