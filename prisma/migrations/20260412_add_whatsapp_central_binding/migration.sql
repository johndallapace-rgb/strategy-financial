-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WhatsappCentralBindingStatus') THEN
    CREATE TYPE "WhatsappCentralBindingStatus" AS ENUM ('active', 'disabled');
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "WhatsappCentralBinding" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "phoneDigits" TEXT,
  "whatsappUserId" TEXT,
  "status" "WhatsappCentralBindingStatus" NOT NULL DEFAULT 'active',
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WhatsappCentralBinding_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'WhatsappCentralBinding_organizationId_fkey'
  ) THEN
    ALTER TABLE "WhatsappCentralBinding"
    ADD CONSTRAINT "WhatsappCentralBinding_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'WhatsappCentralBinding_userId_fkey'
  ) THEN
    ALTER TABLE "WhatsappCentralBinding"
    ADD CONSTRAINT "WhatsappCentralBinding_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsappCentralBinding_phoneDigits_key" ON "WhatsappCentralBinding"("phoneDigits");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsappCentralBinding_whatsappUserId_key" ON "WhatsappCentralBinding"("whatsappUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WhatsappCentralBinding_organizationId_status_createdAt_idx"
ON "WhatsappCentralBinding"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WhatsappCentralBinding_userId_idx" ON "WhatsappCentralBinding"("userId");
