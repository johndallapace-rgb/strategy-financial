-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ApiCredentialStatus') THEN
    CREATE TYPE "ApiCredentialStatus" AS ENUM ('active', 'disabled');
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ApiCredential" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "apiKeyHash" TEXT NOT NULL,
  "status" "ApiCredentialStatus" NOT NULL DEFAULT 'active',
  "scopes" TEXT[] NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiCredential_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ApiCredential_organizationId_fkey'
  ) THEN
    ALTER TABLE "ApiCredential"
    ADD CONSTRAINT "ApiCredential_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ApiCredential_apiKeyHash_key" ON "ApiCredential"("apiKeyHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApiCredential_organizationId_status_createdAt_idx"
ON "ApiCredential"("organizationId", "status", "createdAt");
