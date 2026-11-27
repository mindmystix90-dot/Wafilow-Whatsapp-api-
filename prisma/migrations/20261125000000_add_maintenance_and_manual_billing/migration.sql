-- Additive, idempotent migration for TenantBilling, PlatformSetting, and FeatureGate
-- Safe to run on production Neon PostgreSQL without modifying or locking existing customer tables.

CREATE TABLE IF NOT EXISTS "TenantBilling" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planTier" TEXT NOT NULL DEFAULT 'starter',
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentStatus" TEXT NOT NULL DEFAULT 'paid',
    "paymentMethod" TEXT DEFAULT 'manual',
    "invoiceRef" TEXT,
    "notes" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "lastPaidAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantBilling_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TenantBilling_organizationId_key" ON "TenantBilling"("organizationId");
CREATE INDEX IF NOT EXISTS "TenantBilling_paymentStatus_idx" ON "TenantBilling"("paymentStatus");
CREATE INDEX IF NOT EXISTS "TenantBilling_planTier_idx" ON "TenantBilling"("planTier");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'TenantBilling'
      AND c.conname = 'TenantBilling_organizationId_fkey'
      AND c.contype = 'f'
  ) THEN
    ALTER TABLE "public"."TenantBilling"
      ADD CONSTRAINT "TenantBilling_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PlatformSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformSetting_key_key" ON "PlatformSetting"("key");

CREATE TABLE IF NOT EXISTS "FeatureGate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "allowedRoles" TEXT,
    "allowedOrgIds" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureGate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FeatureGate_key_key" ON "FeatureGate"("key");
CREATE INDEX IF NOT EXISTS "FeatureGate_enabled_idx" ON "FeatureGate"("enabled");
