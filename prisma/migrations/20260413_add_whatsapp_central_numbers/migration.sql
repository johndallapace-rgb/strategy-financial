-- CreateTable
CREATE TABLE "WhatsappCentralNumber" (
    "id" UUID NOT NULL,
    "countryCode" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappCentralNumber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappCentralNumber_phoneNumberId_key" ON "WhatsappCentralNumber"("phoneNumberId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappCentralNumber_countryCode_key" ON "WhatsappCentralNumber"("countryCode");

-- CreateIndex
CREATE INDEX "WhatsappCentralNumber_active_idx" ON "WhatsappCentralNumber"("active");

