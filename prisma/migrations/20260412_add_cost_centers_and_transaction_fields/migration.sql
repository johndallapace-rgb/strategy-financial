-- CreateTable
CREATE TABLE IF NOT EXISTS "CostCenter" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "isSystemDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CostCenter_org_name_key" ON "CostCenter"("organizationId", "name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CostCenter_org_idx" ON "CostCenter"("organizationId");

-- AddForeignKey
ALTER TABLE "CostCenter"
ADD CONSTRAINT "CostCenter_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "isSystemDefault" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "dueDate" DATE,
  ADD COLUMN IF NOT EXISTS "subcategoryId" UUID,
  ADD COLUMN IF NOT EXISTS "costCenterId" UUID;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_org_subcategory_idx" ON "Transaction"("organizationId", "subcategoryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_org_costCenter_idx" ON "Transaction"("organizationId", "costCenterId");

-- AddForeignKey
ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_subcategoryId_fkey"
FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_costCenterId_fkey"
FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

