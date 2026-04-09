BEGIN;

ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "stripeCustomerId" text;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" text;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "stripePriceId" text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_stripeCustomerId_key') THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_stripeCustomerId_key" UNIQUE ("stripeCustomerId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_stripeSubscriptionId_key') THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_stripeSubscriptionId_key" UNIQUE ("stripeSubscriptionId");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Subscription_stripeCustomerId_idx" ON "Subscription" ("stripeCustomerId");
CREATE INDEX IF NOT EXISTS "Subscription_stripeSubscriptionId_idx" ON "Subscription" ("stripeSubscriptionId");

COMMIT;

