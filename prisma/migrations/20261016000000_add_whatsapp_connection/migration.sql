-- CreateTable
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

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WhatsAppConnection_phoneNumberId_idx" ON "WhatsAppConnection"("phoneNumberId");
CREATE INDEX IF NOT EXISTS "WhatsAppConnection_wabaId_idx" ON "WhatsAppConnection"("wabaId");
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppConnection_organizationId_environment_key" ON "WhatsAppConnection"("organizationId", "environment");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WhatsAppConnection_organizationId_fkey'
    ) THEN
        ALTER TABLE "WhatsAppConnection" ADD CONSTRAINT "WhatsAppConnection_organizationId_fkey" 
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterTable (Add environment column to Contact, Conversation, Message with safe production default)
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "environment" TEXT NOT NULL DEFAULT 'production';
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "environment" TEXT NOT NULL DEFAULT 'production';
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "environment" TEXT NOT NULL DEFAULT 'production';
