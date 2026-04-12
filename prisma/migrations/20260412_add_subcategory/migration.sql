-- CreateTable
CREATE TABLE IF NOT EXISTS "Subcategory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "categoryId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Subcategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Subcategory_org_category_name_key" ON "Subcategory"("organizationId", "categoryId", "name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Subcategory_org_category_idx" ON "Subcategory"("organizationId", "categoryId");

-- AddForeignKey
ALTER TABLE "Subcategory"
ADD CONSTRAINT "Subcategory_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subcategory"
ADD CONSTRAINT "Subcategory_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
