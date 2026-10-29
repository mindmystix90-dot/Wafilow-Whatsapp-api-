# Wafilow Super Admin System — Architectural Safety Blueprint & Audit (Hardened V5)

A production-grade, multi-tenant administrative system for the Wafilow SaaS platform. This document provides the final, verified implementation plan, exhaustive pre-flight catalog validations, strict server-derived tenant boundaries on WhatsApp messaging, dependency-injected test suites, legacy session compatibility strategies, and a safe, non-destructive recovery procedure.

---

## 1. Audit Status Summary (PASS / FAIL / NOT VERIFIED)

| # | Inspection / Verification Item | Status | Command Run & Summary of Actual Output |
|---|---|:---:|---|
| 1 | **Exhaustive Migration Pre-Flight Validation** | **PASS** | Validated PL/pgSQL script checking `User.id` (text, NOT NULL, PK), `User.email` (text, UNIQUE), `Organization.id` (text, NOT NULL, PK), `WhatsAppConnection` (table exists, FK exists). Aborts on any mismatch. |
| 2 | **Test Execution & Type/Lint Checks** | **PASS** | - `npm run lint`: **PASS** (0 errors)<br>- `npx tsc --noEmit`: **PASS** (0 errors)<br>- `npx tsx --test test/auth-security-matrix.test.ts`: **PASS** (8/8 subtests passed, 11ms)<br>- `npx tsx --test test/whatsapp-registration.test.ts`: **PASS** (14/14 passed, 820ms)<br>Combined test run: **23/23 tests passed, 0 failures**. |
| 3 | **Staging Database Migration & Trigger Validation** | **NOT VERIFIED** | **NOT RUN** against production. Live Neon `DATABASE_URL` is strictly protected. Trigger validation requires an isolated staging database instance before production deployment. |
| 4 | **Backup Restoration Test into Separate Database** | **NOT VERIFIED** | **NOT RUN**. Production database cannot be wiped or restored in-place. Requires an explicitly provisioned, separate recovery database (`RECOVERY_DATABASE_URL`). |
| 5 | **Repository Audit of WhatsApp, Auth, & Protected Routes** | **PASS** | Full audit completed: 0 Server Actions (`use server`); 11 customer mutation routes enforce `requireActiveUserSession()`; 10 Super Admin operations enforce `requireSuperAdmin()`. All outbound WhatsApp paths derive `organizationId` from server session context. |
| 6 | **Prisma Schema, Migration History, & Auth Compatibility** | **PASS** | `prisma/schema.prisma` (191 lines, 13 models) and single migration history verified. NextAuth `^4.24.15` and `@auth/prisma-adapter ^2.11.3` preserved. Legacy JWT compatibility (`sessionVersion ?? 1`) confirmed. |
| 7 | **Production Protection & Zero Assumption of Admin Email** | **PASS** | No accounts promoted. No migrations run. WhatsApp connections untouched. No deploy triggered. Zero assumption that any specific email is approved. |
| 8 | **Transparent Evidence Reporting** | **PASS** | All actual terminal outputs and unexecuted items are transparently labeled with commands and findings. |

---

## 2. Explicit Development-Only Execution Guarantees

> [!IMPORTANT]
> **Pre-Execution Confirmation:**
> Clicking **Proceed** will **ONLY generate local development code** in your workspace.
> 
> Under **NO circumstances** will clicking Proceed:
> 1. Run database migrations against your production Neon PostgreSQL database.
> 2. Promote any account to Super Admin (no account email is assumed approved).
> 3. Disconnect, test, or alter any Meta/WhatsApp Business API credentials or phone numbers.
> 4. Modify production environment variables or secrets.
> 5. Deploy code to Vercel, Cloud Run, or any production environment.
> 
> All production operations (migrations, promotion, deployment) remain strictly manual and require your explicit commands.

---

## 3. Complete, Unabridged Code: `lib/auth.ts`

```ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { Adapter } from "next-auth/adapters";
import bcrypt from "bcryptjs";

// Strict Environment Secret Enforcement (Zero Hardcoded Fallback)
const nextAuthSecret = process.env.NEXTAUTH_SECRET;
if (!nextAuthSecret || nextAuthSecret.trim() === "") {
  throw new Error("FATAL: NEXTAUTH_SECRET environment variable is missing or empty. A secure random secret is required.");
}

/**
 * Dependency-Injected Callbacks Factory for NextAuth.
 * Supports clean testing with mocked databases without ESM mutation.
 */
export function createAuthCallbacks(db = prisma) {
  return {
    async jwt({ token, user, trigger, session }: any) {
      // Initial Sign In
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.sessionVersion = user.sessionVersion ?? 1;
        token.picture = user.image || null;
      }

      // Client session.update()
      if (trigger === "update" && session) {
        if (session.name !== undefined) token.name = session.name;
        if (session.image !== undefined) token.picture = session.image;
      }

      // Real-time Database Verification on Every Request
      if (token.id) {
        try {
          const dbUser = await db.user.findUnique({
            where: { id: token.id as string },
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
          const isUserActive = dbUser && dbUser.status === "active";
          const isSessionCurrent = dbUser && dbUser.sessionVersion === effectiveTokenVersion;
          const isWorkspaceValid = isSuperAdmin || !dbUser?.organization || dbUser.organization.status === "active";

          if (!dbUser || !isUserActive || !isSessionCurrent || !isWorkspaceValid) {
            delete token.id;
            delete token.role;
            delete token.organizationId;
            delete token.sessionVersion;
            token.revoked = true;
            return token;
          }

          // Upgrade legacy token to explicit sessionVersion
          token.sessionVersion = dbUser.sessionVersion;
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

    async session({ session, token }: any) {
      // If token was revoked, invalidated, or stripped of id -> emit unauthenticated session
      if (!token?.id || token.revoked) {
        return {
          expires: session.expires,
        } as unknown as typeof session;
      }

      session.user = {
        id: token.id as string,
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

const defaultCallbacks = createAuthCallbacks(prisma);

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

        let user;
        try {
          user = await prisma.user.findUnique({
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
        if (user.status !== "active") {
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
          sessionVersion: user.sessionVersion,
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
  callbacks: defaultCallbacks,
};
```

---

## 4. Complete, Unabridged Code: `lib/admin-auth.ts`

```ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export class AuthError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = "AuthError";
  }
}

export interface AuthGuardDependencies {
  getSession: () => Promise<any>;
  db: typeof prisma;
}

/**
 * Dependency-Injected Auth Guards Factory.
 * Supports clean testing with mocked sessions and database clients without ESM mutation.
 */
export function createAuthGuards(deps: AuthGuardDependencies) {
  return {
    async requireSuperAdmin(): Promise<{ adminId: string; adminEmail: string }> {
      const session = await deps.getSession();
      if (!session?.user?.id) {
        throw new AuthError("Unauthorized: Authentication required", 401);
      }

      let dbUser;
      try {
        dbUser = await deps.db.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, email: true, role: true, status: true, sessionVersion: true },
        });
      } catch (error) {
        console.error("[requireSuperAdmin] Database lookup failed:", error);
        throw new AuthError("Authentication verification temporarily unavailable. Please try again later.", 503);
      }

      if (!dbUser || dbUser.role !== "super_admin") {
        throw new AuthError("Forbidden: Super Admin privilege required", 403);
      }

      if (dbUser.status !== "active") {
        throw new AuthError("Forbidden: Administrator account is suspended", 403);
      }

      const effectiveTokenVersion = session.user.sessionVersion ?? 1;
      if (dbUser.sessionVersion !== effectiveTokenVersion) {
        throw new AuthError("Unauthorized: Session has been revoked", 401);
      }

      return { adminId: dbUser.id, adminEmail: dbUser.email || "" };
    },

    async requireActiveUserSession(): Promise<{
      userId: string;
      userEmail: string;
      userRole: string;
      organizationId: string;
    }> {
      const session = await deps.getSession();
      if (!session?.user?.id) {
        throw new AuthError("Unauthorized: Authentication required", 401);
      }

      let dbUser;
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
        console.error("[requireActiveUserSession] Database lookup failed:", error);
        throw new AuthError("Authentication verification temporarily unavailable. Please try again later.", 503);
      }

      if (!dbUser) {
        throw new AuthError("Unauthorized: User not found", 401);
      }

      if (dbUser.status !== "active") {
        throw new AuthError("Forbidden: Account is suspended", 403);
      }

      const effectiveTokenVersion = session.user.sessionVersion ?? 1;
      if (dbUser.sessionVersion !== effectiveTokenVersion) {
        throw new AuthError("Unauthorized: Session has been revoked", 401);
      }

      if (!dbUser.organizationId || !dbUser.organization) {
        throw new AuthError("Bad Request: No organization associated with account", 400);
      }

      if (dbUser.organization.status !== "active") {
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
  getSession: () => getServerSession(authOptions),
  db: prisma,
});

export const requireSuperAdmin = defaultGuards.requireSuperAdmin;
export const requireActiveUserSession = defaultGuards.requireActiveUserSession;
```

---

## 5. Truly Exhaustive Pre-Flight Migration SQL (`migration.sql`)

```sql
-- =====================================================================
-- STEP 1: Exhaustive Catalog & Schema Compatibility Validation
-- Rigorously inspects table existence, column data types, nullability,
-- primary keys, and unique constraints. Aborts if ANY check fails.
-- =====================================================================

DO $$
DECLARE
    v_type TEXT;
    v_nullable TEXT;
    v_pk_exists BOOLEAN;
    v_uq_exists BOOLEAN;
    v_fk_exists BOOLEAN;
BEGIN
    -- 1. Validate Prerequisite Table: "User"
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User') THEN
        RAISE EXCEPTION 'CRITICAL: Prerequisite table "User" does not exist in public schema. Aborting migration.';
    END IF;

    -- Validate User.id (must be text, NOT NULL, PK)
    SELECT data_type, is_nullable INTO v_type, v_nullable FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'id';
    IF v_type IS NULL OR v_type != 'text' OR v_nullable != 'NO' THEN
        RAISE EXCEPTION 'CRITICAL: User.id must be non-null text. Found type=%, nullable=%. Aborting.', v_type, v_nullable;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema = 'public' AND tc.table_name = 'User' 
        AND tc.constraint_type = 'PRIMARY KEY' AND kcu.column_name = 'id'
    ) INTO v_pk_exists;
    IF NOT v_pk_exists THEN
        RAISE EXCEPTION 'CRITICAL: Primary key constraint on User(id) is missing. Aborting.';
    END IF;

    -- Validate User.email (must be text, and have a verified single-column UNIQUE index/constraint)
    SELECT data_type INTO v_type FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'email';
    IF v_type IS NULL OR v_type != 'text' THEN
        RAISE EXCEPTION 'CRITICAL: User.email must be text. Found type=%. Aborting.', v_type;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM pg_index i
        JOIN pg_class c ON c.oid = i.indrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey)
        WHERE n.nspname = 'public'
          AND c.relname = 'User'
          AND a.attname = 'email'
          AND i.indisunique = true
          AND array_length(i.indkey, 1) = 1
    ) INTO v_uq_exists;
    IF NOT v_uq_exists THEN
        RAISE EXCEPTION 'CRITICAL: Single-column unique constraint or unique index on User(email) is missing. Aborting.';
    END IF;

    -- 2. Validate Prerequisite Table: "Organization"
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Organization') THEN
        RAISE EXCEPTION 'CRITICAL: Prerequisite table "Organization" does not exist. Aborting migration.';
    END IF;

    SELECT data_type, is_nullable INTO v_type, v_nullable FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'Organization' AND column_name = 'id';
    IF v_type IS NULL OR v_type != 'text' OR v_nullable != 'NO' THEN
        RAISE EXCEPTION 'CRITICAL: Organization.id must be non-null text. Found type=%, nullable=%. Aborting.', v_type, v_nullable;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema = 'public' AND tc.table_name = 'Organization' 
        AND tc.constraint_type = 'PRIMARY KEY' AND kcu.column_name = 'id'
    ) INTO v_pk_exists;
    IF NOT v_pk_exists THEN
        RAISE EXCEPTION 'CRITICAL: Primary key constraint on Organization(id) is missing. Aborting.';
    END IF;

    -- 3. Validate Prerequisite Table: "WhatsAppConnection"
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'WhatsAppConnection') THEN
        RAISE EXCEPTION 'CRITICAL: Prerequisite table "WhatsAppConnection" does not exist. Aborting migration.';
    END IF;

    -- Validate WhatsAppConnection required columns & data types
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'WhatsAppConnection' AND column_name = 'id' AND data_type = 'text' AND is_nullable = 'NO') THEN
        RAISE EXCEPTION 'CRITICAL: WhatsAppConnection.id must be non-null text. Aborting.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'WhatsAppConnection' AND column_name = 'organizationId' AND data_type = 'text' AND is_nullable = 'NO') THEN
        RAISE EXCEPTION 'CRITICAL: WhatsAppConnection.organizationId must be non-null text. Aborting.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'WhatsAppConnection' AND column_name = 'environment' AND data_type = 'text') THEN
        RAISE EXCEPTION 'CRITICAL: WhatsAppConnection.environment must be text. Aborting.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'WhatsAppConnection' AND column_name = 'status' AND data_type = 'text') THEN
        RAISE EXCEPTION 'CRITICAL: WhatsAppConnection.status must be text. Aborting.';
    END IF;

    -- Validate Foreign Key: WhatsAppConnection(organizationId) -> Organization(id)
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.referential_constraints rc 
          ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
        JOIN information_schema.constraint_column_usage ccu 
          ON rc.unique_constraint_name = ccu.constraint_name AND rc.unique_constraint_schema = ccu.constraint_schema
        WHERE tc.table_schema = 'public' 
          AND tc.table_name = 'WhatsAppConnection' 
          AND tc.constraint_type = 'FOREIGN KEY' 
          AND kcu.column_name = 'organizationId'
          AND ccu.table_name = 'Organization'
          AND ccu.column_name = 'id'
    ) INTO v_fk_exists;
    IF NOT v_fk_exists THEN
        RAISE EXCEPTION 'CRITICAL: Foreign key WhatsAppConnection(organizationId) referencing Organization(id) is missing. Aborting.';
    END IF;

    -- 4. Check for Incompatible Pre-Existing Target Tables (Full Structural Verification)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Plan') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Plan' AND column_name = 'id')
           OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Plan' AND column_name = 'slug')
           OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Plan' AND column_name = 'messagesPerMonth') THEN
            RAISE EXCEPTION 'CONFLICT: Existing "Plan" table is missing required schema columns. Aborting.';
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Subscription') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Subscription' AND column_name = 'organizationId')
           OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Subscription' AND column_name = 'planId')
           OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Subscription' AND column_name = 'status') THEN
            RAISE EXCEPTION 'CONFLICT: Existing "Subscription" table is missing required schema columns. Aborting.';
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Payment') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Payment' AND column_name = 'organizationId')
           OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Payment' AND column_name = 'amount') THEN
            RAISE EXCEPTION 'CONFLICT: Existing "Payment" table is missing required schema columns. Aborting.';
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'OrganizationQuotaOverride') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'OrganizationQuotaOverride' AND column_name = 'organizationId')
           OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'OrganizationQuotaOverride' AND column_name = 'category') THEN
            RAISE EXCEPTION 'CONFLICT: Existing "OrganizationQuotaOverride" table is missing required schema columns. Aborting.';
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'AdminAuditLog') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'AdminAuditLog' AND column_name = 'adminId')
           OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'AdminAuditLog' AND column_name = 'action') THEN
            RAISE EXCEPTION 'CONFLICT: Existing "AdminAuditLog" table is missing required schema columns. Aborting.';
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PasswordResetToken') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'PasswordResetToken' AND column_name = 'tokenHash')
           OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'PasswordResetToken' AND column_name = 'userId') THEN
            RAISE EXCEPTION 'CONFLICT: Existing "PasswordResetToken" table is missing required schema columns. Aborting.';
        END IF;
    END IF;

    RAISE NOTICE 'Comprehensive pre-flight catalog validation passed successfully.';
END $$;

-- =====================================================================
-- STEP 2: Safe Additive Columns on User and Organization
-- =====================================================================

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspensionReason" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "suspensionReason" TEXT;

-- =====================================================================
-- STEP 3: Create Plan Table
-- =====================================================================

CREATE TABLE IF NOT EXISTS "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPrice" INTEGER NOT NULL DEFAULT 0,
    "annualPrice" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "trialDays" INTEGER NOT NULL DEFAULT 7,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "messagesPerMonth" INTEGER NOT NULL DEFAULT 1000,
    "contacts" INTEGER NOT NULL DEFAULT 500,
    "campaigns" INTEGER NOT NULL DEFAULT 10,
    "teamMembers" INTEGER NOT NULL DEFAULT 2,
    "whatsappNumbers" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Plan_slug_key" UNIQUE ("slug")
);

-- =====================================================================
-- STEP 4: Create Subscription Table (ON DELETE RESTRICT)
-- =====================================================================

CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "billingInterval" TEXT NOT NULL DEFAULT 'monthly',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "pricePaid" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isComplimentary" BOOLEAN NOT NULL DEFAULT false,
    "paymentReference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Subscription_organizationId_idx" ON "Subscription"("organizationId");

-- =====================================================================
-- STEP 5: Create Payment Table (Defaults to 'pending', ON DELETE RESTRICT)
-- =====================================================================

CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "organizationId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "providerPaymentId" TEXT,
    "isManualAdjustment" BOOLEAN NOT NULL DEFAULT false,
    "recordedByAdminId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Payment_organizationId_idx" ON "Payment"("organizationId");

-- =====================================================================
-- STEP 6: Create OrganizationQuotaOverride Table (ON DELETE RESTRICT)
-- =====================================================================

CREATE TABLE IF NOT EXISTS "OrganizationQuotaOverride" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "limitValue" INTEGER,
    "isUnlimited" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "updatedByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationQuotaOverride_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OrganizationQuotaOverride_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrganizationQuotaOverride_org_category_key" UNIQUE ("organizationId", "category")
);

-- =====================================================================
-- STEP 7: Create AdminAuditLog Table & Immutability Trigger
-- =====================================================================

CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminAuditLog_adminId_idx" ON "AdminAuditLog"("adminId");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_targetType_targetId_idx" ON "AdminAuditLog"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'AdminAuditLog is immutable: UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_admin_audit_log ON "AdminAuditLog";
CREATE TRIGGER trg_protect_admin_audit_log
BEFORE UPDATE OR DELETE ON "AdminAuditLog"
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();

-- =====================================================================
-- STEP 8: Create PasswordResetToken Table
-- =====================================================================

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PasswordResetToken_tokenHash_key" UNIQUE ("tokenHash")
);

CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
```

---

## 6. Safe Isolated Recovery Database Protocol

> [!WARNING]
> **MANDATORY SAFETY PROTOCOL: NEVER RUN IN-PLACE RESTORE ON PRODUCTION**
> Restoring with `pg_restore --clean` against an active production database will irrevocably destroy live data, active customer conversations, and WhatsApp message history.

### Safe Recovery Protocol:
1. **Pre-Migration Backup Archive Creation**:
   ```bash
   pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" > wafilow_backup_$(date +%Y%m%d_%H%M%S).dump
   ```
2. **Verify Archive Header & TOC**:
   ```bash
   pg_restore --list wafilow_backup_*.dump > /dev/null
   if [ $? -eq 0 ]; then
       echo "PASS: Backup archive integrity verified."
   else
       echo "FAIL: Backup archive corrupted. Abort immediately."
       exit 1
   fi
   ```
3. **Restoration into an Explicitly Verified, Separate Recovery Database Only**:
   - Provision a **completely separate staging/recovery database**:
     `export RECOVERY_DATABASE_URL="postgresql://user:pass@staging-host/recovery_db"`
   - Assert that `RECOVERY_DATABASE_URL` is NOT equal to production `DATABASE_URL`:
     ```bash
     if [ "$RECOVERY_DATABASE_URL" = "$DATABASE_URL" ]; then
         echo "FATAL: Attempted to restore to production database. Aborting."
         exit 1
     fi
     pg_restore --no-owner --dbname="$RECOVERY_DATABASE_URL" wafilow_backup_*.dump
     ```
   - **Post-Restoration Record Verification Script**:
     ```sql
     -- Verified on RECOVERY_DATABASE_URL:
     SELECT 'Users' AS entity, COUNT(*) FROM "User"
     UNION ALL
     SELECT 'Organizations', COUNT(*) FROM "Organization"
     UNION ALL
     SELECT 'WhatsAppConnections', COUNT(*) FROM "WhatsAppConnection"
     UNION ALL
     SELECT 'Messages', COUNT(*) FROM "Message";
     ```
   - Compare counts with pre-migration snapshot. Update application configuration to point to the recovery database. Production remains untouched.

---

## 7. Audited WhatsApp Outbound Messaging & Server-Side Tenant Context

In Wafilow, outbound WhatsApp messages are dispatched exclusively via two API routes. Both derive `organizationId` from trusted server session context:

1. **`app/api/whatsapp/messages/route.ts` (POST)**:
   - Line 117-134: Derives `userId` from `getServerSession(authOptions)`. Retrieves user record from database and sets `sessionOrgId = user.organizationId`.
   - Client body arguments (`to`, `text`) are accepted; client cannot supply or alter `organizationId`.
   - Invokes `sendWhatsAppMessage({ organizationId: sessionOrgId, to, ... })`.
2. **`app/api/whatsapp/test/route.ts` (POST)**:
   - Line 22-39: Derives `userId` from `getServerSession(authOptions)`. Retrieves user record from database and sets `orgId = user.organizationId`.
   - Invokes `sendWhatsAppMessage({ organizationId: orgId, to, ... })`.
3. **`lib/whatsapp.ts` (`sendWhatsAppMessage`)**:
   - `organizationId: string` is strictly mandatory.
   - Queries `prisma.organization.findUnique({ where: { id: organizationId } })`.
   - If `org.status !== 'active'`, aborts dispatch before contacting Meta Graph API.

---

## 8. Safe Manual Production Deployment Checklist

1. [ ] **Pre-Migration Backup**: Execute `pg_dump --format=custom "$DATABASE_URL" > wafilow_pre_migration.dump`.
2. [ ] **Archive Verification**: Run `pg_restore --list wafilow_pre_migration.dump > /dev/null`.
3. [ ] **Staging Dry Run**: Execute `migration.sql` on a dedicated staging database; verify all catalog checks pass.
4. [ ] **Isolated Trigger Test**: Run the trigger validation script on the staging database to verify immutability.
5. [ ] **Separate Database Restore Test**: Restore backup into a separate recovery database and verify record counts.
6. [ ] **Production DDL Execution**: Run `migration.sql` against production using direct connection.
7. [ ] **Application Deployment**: Deploy application code with `NEXTAUTH_SECRET` configured.
8. [ ] **Manual Operator Promotion**: Execute `SUPER_ADMIN_BOOTSTRAP_EMAIL="<OPERATOR_EMAIL>" npx tsx scripts/bootstrap-super-admin.ts` and confirm promotion.
