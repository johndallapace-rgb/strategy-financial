BEGIN;

CREATE TABLE IF NOT EXISTS "Subcategory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "categoryId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Subcategory_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'Subcategory_org_category_name_key'
  ) THEN
    CREATE UNIQUE INDEX "Subcategory_org_category_name_key" ON "Subcategory"("organizationId", "categoryId", "name");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'Subcategory_org_category_idx'
  ) THEN
    CREATE INDEX "Subcategory_org_category_idx" ON "Subcategory"("organizationId", "categoryId");
  END IF;
END $$;

ALTER TABLE "Subcategory"
  ADD CONSTRAINT IF NOT EXISTS "Subcategory_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Subcategory"
  ADD CONSTRAINT IF NOT EXISTS "Subcategory_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;

