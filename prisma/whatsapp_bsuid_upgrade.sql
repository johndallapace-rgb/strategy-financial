BEGIN;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "whatsappUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "whatsappUsername" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'User_whatsappUserId_key'
  ) THEN
    CREATE UNIQUE INDEX "User_whatsappUserId_key" ON "User"("whatsappUserId");
  END IF;
END $$;

COMMIT;

