-- AlterTable
ALTER TABLE "Category" ADD COLUMN "isSystemDefault" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Subcategory" ADD COLUMN "isSystemDefault" BOOLEAN NOT NULL DEFAULT false;

