BEGIN;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name = 'email'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'User_phone_key'
  ) THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_phone_key" UNIQUE ("phone");
  END IF;
END $$;

COMMIT;

