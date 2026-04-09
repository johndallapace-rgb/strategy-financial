BEGIN;

ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "stripeSubscriptionCreatedAt" timestamptz;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "stripeLastEventCreatedAt" timestamptz;

ALTER TABLE "StripeWebhookEvent" ADD COLUMN IF NOT EXISTS "stripeCreatedAt" timestamptz;
ALTER TABLE "StripeWebhookEvent" ADD COLUMN IF NOT EXISTS "outcome" text NOT NULL DEFAULT 'processed';
ALTER TABLE "StripeWebhookEvent" ADD COLUMN IF NOT EXISTS "note" text;

COMMIT;

