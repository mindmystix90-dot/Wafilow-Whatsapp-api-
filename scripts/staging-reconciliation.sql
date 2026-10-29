-- ==============================================================================
-- WAFILOW — STAGING DATABASE SCHEMA RECONCILIATION SCRIPT
-- ==============================================================================
-- TARGET: Neon branch "wafilow-staging" ONLY
-- ZERO CREDENTIAL COPIES | STRICT RECONCILIATION | NON-DESTRUCTIVE DDL
--
-- Instructions:
-- 1. Open Neon Console: https://console.neon.tech
-- 2. Select Project -> Select Branch: "wafilow-staging"
-- 3. Open "SQL Editor", paste this script, and click "Run".
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- SAFETY GUARD: Branch Identity Assertion
-- Hard-aborts if not connected to "wafilow-staging".
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    current_branch TEXT := current_setting('neon.branch_name', true);
BEGIN
    IF current_branch IS DISTINCT FROM 'wafilow-staging' THEN
        RAISE EXCEPTION 'SAFETY HALT: Active branch is "%". This script is restricted to "wafilow-staging". Aborting.', current_branch;
    END IF;
    RAISE NOTICE 'Branch verified: %. Proceeding with staging reconciliation.', current_branch;
END $$;

-- ------------------------------------------------------------------------------
-- STEP 1: Alter Existing Tables (Add Missing Columns with Type Validation)
-- ------------------------------------------------------------------------------

-- 1.1 Table: Contact -> environment
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Contact' AND column_name = 'environment'
    ) THEN
        ALTER TABLE "Contact" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'production';
        RAISE NOTICE 'Added column Contact.environment';
    ELSE
        -- Validate data type if already present
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'Contact' AND column_name = 'environment' AND data_type = 'text'
        ) THEN
            RAISE EXCEPTION 'TYPE CONFLICT: Column Contact.environment exists but is not text.';
        END IF;
    END IF;
END $$;

-- 1.2 Table: Conversation -> environment
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Conversation' AND column_name = 'environment'
    ) THEN
        ALTER TABLE "Conversation" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'production';
        RAISE NOTICE 'Added column Conversation.environment';
    ELSE
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'Conversation' AND column_name = 'environment' AND data_type = 'text'
        ) THEN
            RAISE EXCEPTION 'TYPE CONFLICT: Column Conversation.environment exists but is not text.';
        END IF;
    END IF;
END $$;

-- 1.3 Table: Message -> environment
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Message' AND column_name = 'environment'
    ) THEN
        ALTER TABLE "Message" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'production';
        RAISE NOTICE 'Added column Message.environment';
    ELSE
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'Message' AND column_name = 'environment' AND data_type = 'text'
        ) THEN
            RAISE EXCEPTION 'TYPE CONFLICT: Column Message.environment exists but is not text.';
        END IF;
    END IF;
END $$;

-- 1.4 Table: User -> status, sessionVersion & Indexes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'status'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
        RAISE NOTICE 'Added column User.status';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'sessionVersion'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 1;
        RAISE NOTICE 'Added column User.sessionVersion';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "User_status_idx" ON "User"("status");
CREATE INDEX IF NOT EXISTS "User_role_status_idx" ON "User"("role", "status");
CREATE INDEX IF NOT EXISTS "User_organizationId_idx" ON "User"("organizationId");

-- 1.5 Table: Organization -> status, planTier, monthlyLimit & Indexes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Organization' AND column_name = 'status'
    ) THEN
        ALTER TABLE "Organization" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
        RAISE NOTICE 'Added column Organization.status';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Organization' AND column_name = 'planTier'
    ) THEN
        ALTER TABLE "Organization" ADD COLUMN "planTier" TEXT NOT NULL DEFAULT 'starter';
        RAISE NOTICE 'Added column Organization.planTier';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Organization' AND column_name = 'monthlyLimit'
    ) THEN
        ALTER TABLE "Organization" ADD COLUMN "monthlyLimit" INTEGER;
        RAISE NOTICE 'Added column Organization.monthlyLimit';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Organization_status_idx" ON "Organization"("status");
CREATE INDEX IF NOT EXISTS "Organization_planTier_idx" ON "Organization"("planTier");

-- ------------------------------------------------------------------------------
-- STEP 2: Create WhatsAppConnection Table, Constraints & Indexes
-- (NO credentials or data copied from Organization)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "WhatsAppConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "wabaId" TEXT,
    "phoneNumberId" TEXT,
    "displayPhoneNumber" TEXT,
    "verifiedName" TEXT,
    "accessToken" TEXT,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "lastCheckedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppConnection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WhatsAppConnection_phoneNumberId_idx" ON "WhatsAppConnection"("phoneNumberId");
CREATE INDEX IF NOT EXISTS "WhatsAppConnection_wabaId_idx" ON "WhatsAppConnection"("wabaId");
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppConnection_organizationId_environment_key" ON "WhatsAppConnection"("organizationId", "environment");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WhatsAppConnection_organizationId_fkey'
    ) THEN
        ALTER TABLE "WhatsAppConnection" ADD CONSTRAINT "WhatsAppConnection_organizationId_fkey" 
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Added foreign key WhatsAppConnection_organizationId_fkey';
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- STEP 3: Create AuditLog Table, Constraints & Indexes
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt" DESC);

-- ------------------------------------------------------------------------------
-- STEP 4: Create PasswordResetToken Table, Constraints & Indexes
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PasswordResetToken_userId_fkey'
    ) THEN
        ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Added foreign key PasswordResetToken_userId_fkey';
    END IF;
END $$;

COMMIT;
