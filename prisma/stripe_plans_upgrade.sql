BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'free' AND enumtypid = '"SubscriptionPlan"'::regtype) THEN
    ALTER TYPE "SubscriptionPlan" ADD VALUE 'free';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'basic' AND enumtypid = '"SubscriptionPlan"'::regtype) THEN
    ALTER TYPE "SubscriptionPlan" ADD VALUE 'basic';
  END IF;
END $$;

COMMIT;
