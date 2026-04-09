BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "OrganizationInvite" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "invitedByUserId" uuid NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "role" "MembershipRole" NOT NULL,
  "tokenHash" text NOT NULL UNIQUE,
  "expiresAt" timestamptz,
  "acceptedAt" timestamptz,
  "acceptedByUserId" uuid REFERENCES "User"("id") ON DELETE SET NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "OrganizationInvite_organizationId_createdAt_idx"
  ON "OrganizationInvite" ("organizationId", "createdAt");

CREATE INDEX IF NOT EXISTS "OrganizationInvite_email_idx"
  ON "OrganizationInvite" ("email");

COMMIT;

