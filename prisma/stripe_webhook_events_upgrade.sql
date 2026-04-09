BEGIN;

CREATE TABLE IF NOT EXISTS "StripeWebhookEvent" (
  "id" text PRIMARY KEY,
  "type" text NOT NULL,
  "organizationId" uuid,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "processedAt" timestamptz,
  "attemptCount" integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "StripeWebhookEvent_organizationId_createdAt_idx" ON "StripeWebhookEvent" ("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "StripeWebhookEvent_processedAt_idx" ON "StripeWebhookEvent" ("processedAt");

COMMIT;

