-- CreateEnum
CREATE TYPE "MedicationRoute" AS ENUM ('ORAL', 'SUBLINGUAL', 'TOPICAL', 'TRANSDERMAL', 'INHALED', 'SUBCUTANEOUS', 'INTRAMUSCULAR', 'INTRAVENOUS', 'RECTAL', 'EYE_DROP', 'EAR_DROP', 'NASAL', 'OTHER');

-- CreateEnum
CREATE TYPE "AdministrationStatus" AS ENUM ('GIVEN', 'REFUSED', 'OMITTED', 'NOT_AVAILABLE', 'PENDING');

-- CreateEnum
CREATE TYPE "CDTransactionType" AS ENUM ('ADMINISTERED', 'RECEIVED', 'RETURNED', 'DESTROYED', 'DISCREPANCY');

-- CreateEnum
CREATE TYPE "GPCommunicationType" AS ENUM ('PRESCRIPTION_REQUEST', 'CLINICAL_CONCERN', 'MEDICATION_REVIEW', 'URGENT_REFERRAL', 'ROUTINE_UPDATE', 'OTHER');

-- CreateEnum
CREATE TYPE "GPCommunicationStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'FOLLOW_UP_OVERDUE', 'CLOSED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CONFIRMED', 'DISPENSED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockAlertType" AS ENUM ('LOW_STOCK', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "RiskDomain" AS ENUM ('FALLS', 'PRESSURE_ULCER', 'MEDICATION', 'SAFEGUARDING');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'HIGH_RISK_SCORE';
ALTER TYPE "NotificationType" ADD VALUE 'GP_COMMUNICATION_OVERDUE';
ALTER TYPE "NotificationType" ADD VALUE 'PHARMACY_ORDER_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'STOCK_ALERT';

-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "dose" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "route" "MedicationRoute" NOT NULL,
    "frequency" TEXT NOT NULL,
    "scheduledTimes" TEXT[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "prescribedBy" TEXT,
    "isControlled" BOOLEAN NOT NULL DEFAULT false,
    "isPRN" BOOLEAN NOT NULL DEFAULT false,
    "prnIndication" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 7,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationAdministration" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "administeredById" TEXT NOT NULL,
    "witnessId" TEXT,
    "status" "AdministrationStatus" NOT NULL,
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "administeredAt" TIMESTAMP(3),
    "outcome" TEXT,
    "prnFollowUpDue" TIMESTAMP(3),
    "prnFollowUpNote" TEXT,
    "signedAt" TIMESTAMP(3),
    "witnessSigned" BOOLEAN NOT NULL DEFAULT false,
    "witnessSignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicationAdministration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlledDrugRegister" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "administeredById" TEXT NOT NULL,
    "witnessId" TEXT NOT NULL,
    "transactionType" "CDTransactionType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ControlledDrugRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationAudit" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "auditMonth" TIMESTAMP(3) NOT NULL,
    "reportData" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exportedAt" TIMESTAMP(3),

    CONSTRAINT "MedicationAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GPCommunication" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" "GPCommunicationType" NOT NULL,
    "status" "GPCommunicationStatus" NOT NULL DEFAULT 'DRAFT',
    "subject" TEXT NOT NULL,
    "aiDraftContent" TEXT,
    "finalContent" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "sentMethod" TEXT,
    "recipientEmail" TEXT,
    "followUpDate" TIMESTAMP(3),
    "followUpReceived" BOOLEAN NOT NULL DEFAULT false,
    "gpResponseNotes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GPCommunication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pharmacy" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "accountNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pharmacy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionOrder" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "orderMonth" TIMESTAMP(3) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "lineItems" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "dispensedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrescriptionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAlert" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "alertType" "StockAlertType" NOT NULL,
    "currentStock" INTEGER NOT NULL,
    "reorderLevel" INTEGER NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskProfile" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "fallScore" INTEGER NOT NULL DEFAULT 0,
    "pressureUlcerScore" INTEGER NOT NULL DEFAULT 0,
    "medicationScore" INTEGER NOT NULL DEFAULT 0,
    "safeguardingScore" INTEGER NOT NULL DEFAULT 0,
    "combinedScore" INTEGER NOT NULL DEFAULT 0,
    "fallRiskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "pressureUlcerRiskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "medicationRiskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "safeguardingRiskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "overallRiskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "aiRecommendations" TEXT,
    "lastCalculatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskFactor" (
    "id" TEXT NOT NULL,
    "riskProfileId" TEXT NOT NULL,
    "domain" "RiskDomain" NOT NULL,
    "description" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAcknowledgement" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "acknowledgedById" TEXT NOT NULL,
    "domain" "RiskDomain" NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskAcknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Medication_residentId_idx" ON "Medication"("residentId");

-- CreateIndex
CREATE INDEX "Medication_organisationId_idx" ON "Medication"("organisationId");

-- CreateIndex
CREATE INDEX "MedicationAdministration_medicationId_idx" ON "MedicationAdministration"("medicationId");

-- CreateIndex
CREATE INDEX "MedicationAdministration_residentId_idx" ON "MedicationAdministration"("residentId");

-- CreateIndex
CREATE INDEX "MedicationAdministration_organisationId_scheduledTime_idx" ON "MedicationAdministration"("organisationId", "scheduledTime");

-- CreateIndex
CREATE INDEX "ControlledDrugRegister_medicationId_idx" ON "ControlledDrugRegister"("medicationId");

-- CreateIndex
CREATE INDEX "ControlledDrugRegister_organisationId_createdAt_idx" ON "ControlledDrugRegister"("organisationId", "createdAt");

-- CreateIndex
CREATE INDEX "MedicationAudit_residentId_idx" ON "MedicationAudit"("residentId");

-- CreateIndex
CREATE INDEX "MedicationAudit_organisationId_auditMonth_idx" ON "MedicationAudit"("organisationId", "auditMonth");

-- CreateIndex
CREATE INDEX "GPCommunication_residentId_idx" ON "GPCommunication"("residentId");

-- CreateIndex
CREATE INDEX "GPCommunication_organisationId_idx" ON "GPCommunication"("organisationId");

-- CreateIndex
CREATE INDEX "GPCommunication_organisationId_status_idx" ON "GPCommunication"("organisationId", "status");

-- CreateIndex
CREATE INDEX "Pharmacy_organisationId_idx" ON "Pharmacy"("organisationId");

-- CreateIndex
CREATE INDEX "PrescriptionOrder_organisationId_idx" ON "PrescriptionOrder"("organisationId");

-- CreateIndex
CREATE INDEX "PrescriptionOrder_pharmacyId_idx" ON "PrescriptionOrder"("pharmacyId");

-- CreateIndex
CREATE INDEX "StockAlert_organisationId_isResolved_idx" ON "StockAlert"("organisationId", "isResolved");

-- CreateIndex
CREATE UNIQUE INDEX "RiskProfile_residentId_key" ON "RiskProfile"("residentId");

-- CreateIndex
CREATE INDEX "RiskProfile_organisationId_idx" ON "RiskProfile"("organisationId");

-- CreateIndex
CREATE INDEX "RiskProfile_organisationId_overallRiskLevel_idx" ON "RiskProfile"("organisationId", "overallRiskLevel");

-- CreateIndex
CREATE INDEX "RiskFactor_riskProfileId_idx" ON "RiskFactor"("riskProfileId");

-- CreateIndex
CREATE INDEX "RiskAcknowledgement_residentId_idx" ON "RiskAcknowledgement"("residentId");

-- CreateIndex
CREATE INDEX "RiskAcknowledgement_organisationId_idx" ON "RiskAcknowledgement"("organisationId");

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationAdministration" ADD CONSTRAINT "MedicationAdministration_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlledDrugRegister" ADD CONSTRAINT "ControlledDrugRegister_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GPCommunication" ADD CONSTRAINT "GPCommunication_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pharmacy" ADD CONSTRAINT "Pharmacy_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionOrder" ADD CONSTRAINT "PrescriptionOrder_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionOrder" ADD CONSTRAINT "PrescriptionOrder_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskProfile" ADD CONSTRAINT "RiskProfile_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskFactor" ADD CONSTRAINT "RiskFactor_riskProfileId_fkey" FOREIGN KEY ("riskProfileId") REFERENCES "RiskProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
