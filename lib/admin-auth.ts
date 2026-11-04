import { getServerSession, Session } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { isMissingColumnError } from "@/lib/db-errors";
import { prisma } from "@/lib/prisma";

export class AuthError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = "AuthError";
  }
}

export interface AuthGuardDependencies {
  getSession: () => Promise<Session | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
}

export interface SuperAdminSessionUser {
  adminId: string;
  adminEmail: string;
}

export interface ActiveCustomerSessionUser {
  userId: string;
  userEmail: string;
  userRole: string;
  organizationId: string;
}

/**
 * Dependency-Injected Auth Guards Factory.
 * Supports clean testing with mocked sessions and database clients without ESM mutation.
 */
export function createAuthGuards(deps: AuthGuardDependencies) {
  return {
    async requireSuperAdmin(): Promise<SuperAdminSessionUser> {
      const session = await deps.getSession();
      if (!session?.user?.id) {
        throw new AuthError("Unauthorized: Authentication required", 401);
      }

      let dbUser: {
        id: string;
        email: string | null;
        role: string;
        status?: string;
        sessionVersion?: number;
      } | null = null;

      try {
        dbUser = await deps.db.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, email: true, role: true, status: true, sessionVersion: true },
        });
      } catch (error) {
        if (isMissingColumnError(error)) {
          try {
            dbUser = await deps.db.user.findUnique({
              where: { id: session.user.id },
              select: { id: true, email: true, role: true },
            });
            if (dbUser) {
              dbUser.status = "active";
              dbUser.sessionVersion = 1;
            }
          } catch (fallbackError) {
            console.error("[requireSuperAdmin] Baseline fallback lookup failed:", fallbackError);
            throw new AuthError("Authentication verification temporarily unavailable. Please try again later.", 503);
          }
        } else {
          console.error("[requireSuperAdmin] Database lookup failed:", error);
          throw new AuthError("Authentication verification temporarily unavailable. Please try again later.", 503);
        }
      }

      if (!dbUser || dbUser.role !== "super_admin") {
        throw new AuthError("Forbidden: Super Admin privilege required", 403);
      }

      if (dbUser.status && dbUser.status !== "active") {
        throw new AuthError("Forbidden: Administrator account is suspended", 403);
      }

      const effectiveTokenVersion = session.user.sessionVersion ?? 1;
      const dbVersion = dbUser.sessionVersion ?? 1;
      if (dbVersion !== effectiveTokenVersion) {
        throw new AuthError("Unauthorized: Session has been revoked", 401);
      }

      return { adminId: dbUser.id, adminEmail: dbUser.email || "" };
    },

    async requireActiveUserSession(): Promise<ActiveCustomerSessionUser> {
      const session = await deps.getSession();
      if (!session?.user?.id) {
        throw new AuthError("Unauthorized: Authentication required", 401);
      }

      let dbUser: {
        id: string;
        email: string | null;
        role: string;
        status?: string;
        sessionVersion?: number;
        organizationId: string | null;
        organization?: { id: string; status?: string } | null;
      } | null = null;

      try {
        dbUser = await deps.db.user.findUnique({
          where: { id: session.user.id },
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            sessionVersion: true,
            organizationId: true,
            organization: {
              select: { id: true, status: true },
            },
          },
        });
      } catch (error) {
        if (isMissingColumnError(error)) {
          try {
            dbUser = await deps.db.user.findUnique({
              where: { id: session.user.id },
              select: {
                id: true,
                email: true,
                role: true,
                organizationId: true,
                organization: {
                  select: { id: true },
                },
              },
            });
            if (dbUser) {
              dbUser.status = "active";
              dbUser.sessionVersion = 1;
              if (dbUser.organization) {
                dbUser.organization.status = "active";
              }
            }
          } catch (fallbackError) {
            console.error("[requireActiveUserSession] Baseline fallback query failed:", fallbackError);
            throw new AuthError("Authentication verification temporarily unavailable. Please try again later.", 503);
          }
        } else {
          console.error("[requireActiveUserSession] Database lookup failed:", error);
          throw new AuthError("Authentication verification temporarily unavailable. Please try again later.", 503);
        }
      }

      if (!dbUser) {
        throw new AuthError("Unauthorized: User not found", 401);
      }

      if (dbUser.status && dbUser.status !== "active") {
        throw new AuthError("Forbidden: Account is suspended", 403);
      }

      const effectiveTokenVersion = session.user.sessionVersion ?? 1;
      const dbVersion = dbUser.sessionVersion ?? 1;
      if (dbVersion !== effectiveTokenVersion) {
        throw new AuthError("Unauthorized: Session has been revoked", 401);
      }

      if (!dbUser.organizationId) {
        throw new AuthError("Bad Request: No organization associated with account", 400);
      }

      // Check organization status (if loaded directly or via organization relation)
      let orgStatus = dbUser.organization?.status;
      if (!orgStatus) {
        try {
          const org = await deps.db.organization.findUnique({
            where: { id: dbUser.organizationId },
            select: { id: true, status: true },
          });
          orgStatus = org?.status ?? "active";
        } catch (error) {
          if (isMissingColumnError(error)) {
            try {
              const org = await deps.db.organization.findUnique({
                where: { id: dbUser.organizationId },
                select: { id: true },
              });
              if (!org) {
                throw new AuthError("Bad Request: Organization not found", 400);
              }
              orgStatus = "active";
            } catch (fallbackOrgErr) {
              if (fallbackOrgErr instanceof AuthError) throw fallbackOrgErr;
              console.error("[requireActiveUserSession] Baseline organization lookup failed:", fallbackOrgErr);
              throw new AuthError("Authentication verification temporarily unavailable. Please try again later.", 503);
            }
          } else {
            console.error("[requireActiveUserSession] Organization lookup failed:", error);
            throw new AuthError("Authentication verification temporarily unavailable. Please try again later.", 503);
          }
        }
      }

      if (orgStatus !== "active") {
        throw new AuthError("Forbidden: Organization workspace is suspended", 403);
      }

      return {
        userId: dbUser.id,
        userEmail: dbUser.email || "",
        userRole: dbUser.role,
        organizationId: dbUser.organizationId,
      };
    },
  };
}

const defaultGuards = createAuthGuards({
  getSession: async () => {
    try {
      return await getServerSession(authOptions);
    } catch {
      return null;
    }
  },
  db: prisma,
});

export const requireSuperAdmin = defaultGuards.requireSuperAdmin;
export const requireActiveUserSession = defaultGuards.requireActiveUserSession;

export function handleAuthError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
  }
  console.error("Internal Server Error:", error);
  const message = error instanceof Error ? error.message : "Internal server error";
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}

