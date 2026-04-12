-- AlterTable
ALTER TABLE "SmartDraft" ADD COLUMN IF NOT EXISTS "batchItemIndex" INTEGER NOT NULL DEFAULT 0;

-- DropIndex
DROP INDEX IF EXISTS "SmartDraft_whatsappMessageId_key";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SmartDraft_whatsappMessageId_batchItemIndex_key"
ON "SmartDraft"("whatsappMessageId", "batchItemIndex");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SmartDraft_whatsappMessageId_idx" ON "SmartDraft"("whatsappMessageId");
