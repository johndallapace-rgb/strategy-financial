BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MembershipRole') THEN
    CREATE TYPE "MembershipRole" AS ENUM ('owner', 'admin', 'member');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionPlan') THEN
    CREATE TYPE "SubscriptionPlan" AS ENUM ('starter', 'pro', 'enterprise');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionStatus') THEN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'inactive');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingCycle') THEN
    CREATE TYPE "BillingCycle" AS ENUM ('monthly', 'yearly');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Organization" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "User" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL UNIQUE,
  "name" text,
  "passwordHash" text NOT NULL,
  "passwordSalt" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Membership" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "role" "MembershipRole" NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "Membership_organizationId_userId_key" UNIQUE ("organizationId", "userId")
);

CREATE INDEX IF NOT EXISTS "Membership_userId_idx" ON "Membership" ("userId");
CREATE INDEX IF NOT EXISTS "Membership_organizationId_idx" ON "Membership" ("organizationId");

CREATE TABLE IF NOT EXISTS "Session" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tokenHash" text NOT NULL UNIQUE,
  "userId" uuid NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "organizationId" uuid NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session" ("userId");
CREATE INDEX IF NOT EXISTS "Session_organizationId_idx" ON "Session" ("organizationId");
CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session" ("expiresAt");

CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL UNIQUE REFERENCES "Organization"("id") ON DELETE CASCADE,
  "plan" "SubscriptionPlan" NOT NULL,
  "status" "SubscriptionStatus" NOT NULL,
  "billingCycle" "BillingCycle" NOT NULL,
  "trialEndsAt" timestamptz,
  "currentPeriodStart" timestamptz,
  "currentPeriodEnd" timestamptz,
  "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

INSERT INTO "Organization" ("id", "name", "slug")
VALUES ('00000000-0000-0000-0000-000000000000', 'Workspace Principal', 'default')
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "organizationId" uuid;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "organizationId" uuid;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "organizationId" uuid;
ALTER TABLE "RecurringRule" ADD COLUMN IF NOT EXISTS "organizationId" uuid;
ALTER TABLE "AlertRule" ADD COLUMN IF NOT EXISTS "organizationId" uuid;

UPDATE "Account" SET "organizationId" = '00000000-0000-0000-0000-000000000000' WHERE "organizationId" IS NULL;
UPDATE "Category" SET "organizationId" = '00000000-0000-0000-0000-000000000000' WHERE "organizationId" IS NULL;
UPDATE "Transaction" SET "organizationId" = '00000000-0000-0000-0000-000000000000' WHERE "organizationId" IS NULL;
UPDATE "RecurringRule" SET "organizationId" = '00000000-0000-0000-0000-000000000000' WHERE "organizationId" IS NULL;
UPDATE "AlertRule" SET "organizationId" = '00000000-0000-0000-0000-000000000000' WHERE "organizationId" IS NULL;

ALTER TABLE "Account" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Category" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Transaction" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "RecurringRule" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "AlertRule" ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "Account_organizationId_fkey";
ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_organizationId_fkey";
ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_organizationId_fkey";
ALTER TABLE "RecurringRule" DROP CONSTRAINT IF EXISTS "RecurringRule_organizationId_fkey";
ALTER TABLE "AlertRule" DROP CONSTRAINT IF EXISTS "AlertRule_organizationId_fkey";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Account_organizationId_fkey') THEN
    ALTER TABLE "Account"
      ADD CONSTRAINT "Account_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Category_organizationId_fkey') THEN
    ALTER TABLE "Category"
      ADD CONSTRAINT "Category_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Transaction_organizationId_fkey') THEN
    ALTER TABLE "Transaction"
      ADD CONSTRAINT "Transaction_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RecurringRule_organizationId_fkey') THEN
    ALTER TABLE "RecurringRule"
      ADD CONSTRAINT "RecurringRule_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AlertRule_organizationId_fkey') THEN
    ALTER TABLE "AlertRule"
      ADD CONSTRAINT "AlertRule_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Account_organizationId_type_idx" ON "Account" ("organizationId", "type");

ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_name_type_key";
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = '"Category"'::regclass
      AND contype = 'u'
  LOOP
    IF c.def NOT LIKE '%organizationId%' THEN
      EXECUTE format('ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS %I', c.conname);
    END IF;
  END LOOP;
END $$;
DO $$
DECLARE i record;
BEGIN
  FOR i IN
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'Category'
  LOOP
    IF i.indexdef LIKE '%UNIQUE%'
      AND i.indexdef NOT LIKE '%organizationId%'
      AND i.indexname NOT LIKE '%_pkey'
    THEN
      EXECUTE format('DROP INDEX IF EXISTS %I', i.indexname);
    END IF;
  END LOOP;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Category_organizationId_name_type_key') THEN
    ALTER TABLE "Category" ADD CONSTRAINT "Category_organizationId_name_type_key" UNIQUE ("organizationId", "name", "type");
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "Category_organizationId_type_idx" ON "Category" ("organizationId", "type");

ALTER TABLE "AlertRule" DROP CONSTRAINT IF EXISTS "AlertRule_entityType_key";
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AlertRule_organizationId_entityType_key') THEN
    ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_organizationId_entityType_key" UNIQUE ("organizationId", "entityType");
  END IF;
END $$;

ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_recurringRuleId_date_key";
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Transaction_organizationId_recurringRuleId_date_key') THEN
    ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_organizationId_recurringRuleId_date_key" UNIQUE ("organizationId", "recurringRuleId", "date");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Transaction_organizationId_date_idx" ON "Transaction" ("organizationId", "date");
CREATE INDEX IF NOT EXISTS "Transaction_organizationId_entityType_date_idx" ON "Transaction" ("organizationId", "entityType", "date");
CREATE INDEX IF NOT EXISTS "Transaction_organizationId_type_date_idx" ON "Transaction" ("organizationId", "type", "date");
CREATE INDEX IF NOT EXISTS "Transaction_organizationId_source_idx" ON "Transaction" ("organizationId", "source");
CREATE INDEX IF NOT EXISTS "Transaction_organizationId_categoryId_idx" ON "Transaction" ("organizationId", "categoryId");
CREATE INDEX IF NOT EXISTS "Transaction_organizationId_accountId_idx" ON "Transaction" ("organizationId", "accountId");
CREATE INDEX IF NOT EXISTS "Transaction_organizationId_recurringRuleId_idx" ON "Transaction" ("organizationId", "recurringRuleId");

CREATE INDEX IF NOT EXISTS "RecurringRule_organizationId_active_idx" ON "RecurringRule" ("organizationId", "active");
CREATE INDEX IF NOT EXISTS "RecurringRule_organizationId_entityType_idx" ON "RecurringRule" ("organizationId", "entityType");
CREATE INDEX IF NOT EXISTS "RecurringRule_organizationId_dayOfMonth_idx" ON "RecurringRule" ("organizationId", "dayOfMonth");

COMMIT;
