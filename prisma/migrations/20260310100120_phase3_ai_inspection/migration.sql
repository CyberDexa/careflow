-- CreateEnum
CREATE TYPE "PatternAlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "PatternAlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'ACTION_TAKEN', 'DISMISSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "InspectionRating" AS ENUM ('OUTSTANDING', 'GOOD', 'REQUIRES_IMPROVEMENT', 'INADEQUATE');

-- CreateTable
CREATE TABLE "PatternAlert" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "severity" "PatternAlertSeverity" NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "recommendation" TEXT,
    "status" "PatternAlertStatus" NOT NULL DEFAULT 'OPEN',
    "dismissReason" TEXT,
    "actionNote" TEXT,
    "acknowledgedById" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatternAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegulatoryStandard" (
    "id" TEXT NOT NULL,
    "regulatoryBody" "RegulatoryBody" NOT NULL,
    "domain" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dataMapping" JSONB NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RegulatoryStandard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceEvidence" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "standardId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityDate" TIMESTAMP(3) NOT NULL,
    "residentId" TEXT,
    "residentName" TEXT,
    "summary" TEXT NOT NULL,
    "isRecent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockInspectionReport" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "regulatoryBody" "RegulatoryBody" NOT NULL,
    "overallRating" "InspectionRating",
    "domainRatings" JSONB NOT NULL,
    "reportContent" TEXT NOT NULL,
    "strengthsSummary" TEXT,
    "gapsSummary" TEXT,
    "actionPlan" JSONB,
    "evidenceSnapshot" JSONB NOT NULL,
    "generatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockInspectionReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatternAlert_residentId_idx" ON "PatternAlert"("residentId");

-- CreateIndex
CREATE INDEX "PatternAlert_organisationId_status_idx" ON "PatternAlert"("organisationId", "status");

-- CreateIndex
CREATE INDEX "PatternAlert_organisationId_severity_idx" ON "PatternAlert"("organisationId", "severity");

-- CreateIndex
CREATE INDEX "RegulatoryStandard_regulatoryBody_domain_idx" ON "RegulatoryStandard"("regulatoryBody", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "RegulatoryStandard_regulatoryBody_code_key" ON "RegulatoryStandard"("regulatoryBody", "code");

-- CreateIndex
CREATE INDEX "ComplianceEvidence_organisationId_standardId_idx" ON "ComplianceEvidence"("organisationId", "standardId");

-- CreateIndex
CREATE INDEX "ComplianceEvidence_organisationId_entityType_idx" ON "ComplianceEvidence"("organisationId", "entityType");

-- CreateIndex
CREATE INDEX "MockInspectionReport_organisationId_idx" ON "MockInspectionReport"("organisationId");

-- CreateIndex
CREATE INDEX "MockInspectionReport_organisationId_createdAt_idx" ON "MockInspectionReport"("organisationId", "createdAt");

-- AddForeignKey
ALTER TABLE "PatternAlert" ADD CONSTRAINT "PatternAlert_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceEvidence" ADD CONSTRAINT "ComplianceEvidence_standardId_fkey" FOREIGN KEY ("standardId") REFERENCES "RegulatoryStandard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
