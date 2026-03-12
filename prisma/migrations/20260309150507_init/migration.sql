-- CreateEnum
CREATE TYPE "RegulatoryBody" AS ENUM ('CQC', 'CARE_INSPECTORATE', 'CSSIW', 'RQIA');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'SENIOR_CARER', 'CARE_STAFF');

-- CreateEnum
CREATE TYPE "ResidentStatus" AS ENUM ('ENQUIRY', 'PRE_ASSESSED', 'ADMITTED', 'HOSPITAL', 'DISCHARGED');

-- CreateEnum
CREATE TYPE "MobilityLevel" AS ENUM ('INDEPENDENT', 'SUPERVISED', 'ONE_PERSON_ASSIST', 'TWO_PERSON_ASSIST', 'HOIST', 'BEDBOUND');

-- CreateEnum
CREATE TYPE "ContinenceLevel" AS ENUM ('CONTINENT', 'OCCASIONALLY_INCONTINENT', 'FREQUENTLY_INCONTINENT', 'TOTALLY_INCONTINENT', 'CATHETERISED', 'STOMA');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('PRE_ADMISSION', 'ADMISSION', 'MONTHLY_REVIEW', 'UNPLANNED_REVIEW');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "AssessmentDomainType" AS ENUM ('PRE_ADMISSION_PERSONAL', 'PRE_ADMISSION_CARE_NEEDS', 'PRE_ADMISSION_MEDICAL', 'PRE_ADMISSION_SOCIAL', 'PRE_ADMISSION_COMMUNICATION', 'PRE_ADMISSION_PREFERENCES', 'ADVANCE_CARE_PLAN', 'CALL_BELL_RISK', 'CLINICAL_FRAILTY_SCORE', 'CONTINENCE_ASSESSMENT', 'DEPENDENCY_RATING', 'EATING_DRINKING_CHOKING', 'FALLS_RISK', 'INTERESTS_ACTIVITIES', 'BED_RAILS_ASSESSMENT', 'MUST_NUTRITIONAL', 'MATTRESS_CHECK', 'MOBILITY_FUNCTION', 'MULTIFACTORIAL_FALLS', 'NUTRITIONAL_ASSESSMENT', 'ORAL_HEALTH', 'PEEP', 'PAIN_ASSESSMENT', 'PERSONAL_HYGIENE', 'WATERLOW', 'MENTAL_CAPACITY');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "CarePlanCategory" AS ENUM ('PERSONAL_CARE', 'NUTRITION_HYDRATION', 'MOBILITY', 'SKIN_INTEGRITY', 'CONTINENCE', 'MENTAL_HEALTH', 'COMMUNICATION', 'MEDICATION', 'SOCIAL_ACTIVITIES', 'END_OF_LIFE', 'SLEEP_REST', 'ORAL_HEALTH', 'SENSORY', 'INFECTION_CONTROL', 'FALLS_PREVENTION');

-- CreateEnum
CREATE TYPE "CarePlanStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'UNDER_REVIEW', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CareNoteCategory" AS ENUM ('PERSONAL_CARE', 'FOOD_FLUID', 'MOBILITY', 'WELLBEING', 'BEHAVIOUR', 'HEALTH_CONCERN', 'SOCIAL', 'SLEEP', 'CONTINENCE', 'GENERAL');

-- CreateEnum
CREATE TYPE "Shift" AS ENUM ('MORNING', 'AFTERNOON', 'NIGHT');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('FALL', 'MEDICATION_ERROR', 'SKIN_INTEGRITY', 'BEHAVIOURAL', 'SAFEGUARDING', 'HEALTH_DETERIORATION', 'NEAR_MISS', 'COMPLAINT', 'ENVIRONMENTAL', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'UNDER_INVESTIGATION', 'CLOSED');

-- CreateEnum
CREATE TYPE "BodyMapEntryType" AS ENUM ('SKIN_TEAR', 'PRESSURE_DAMAGE', 'WOUND', 'BRUISE', 'RASH', 'SWELLING', 'NEW_MARK', 'OTHER');

-- CreateEnum
CREATE TYPE "BodyMapSeverity" AS ENUM ('MINOR', 'MODERATE', 'SEVERE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('HIGH_SEVERITY_INCIDENT', 'CRITICAL_INCIDENT', 'CARE_PLAN_PENDING_APPROVAL', 'ASSESSMENT_OVERDUE', 'MEDICATION_MISSED', 'PATTERN_ALERT');

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CARE_HOME',
    "registrationNo" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "regulatoryBody" "RegulatoryBody" NOT NULL DEFAULT 'CQC',
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CARE_STAFF',
    "jobTitle" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resident" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "status" "ResidentStatus" NOT NULL DEFAULT 'ENQUIRY',
    "roomNumber" TEXT,
    "nhsNumber" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "preferredName" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "pronouns" TEXT,
    "nationality" TEXT,
    "religion" TEXT,
    "ethnicity" TEXT,
    "language" TEXT,
    "interpreterNeeded" BOOLEAN NOT NULL DEFAULT false,
    "admissionDate" TIMESTAMP(3),
    "expectedStayType" TEXT,
    "fundingType" TEXT,
    "referralSource" TEXT,
    "gpName" TEXT,
    "gpPractice" TEXT,
    "gpPhone" TEXT,
    "gpAddress" TEXT,
    "nhsLocalTeam" TEXT,
    "dnacprInPlace" BOOLEAN NOT NULL DEFAULT false,
    "dnacprDate" TIMESTAMP(3),
    "mentalCapacity" BOOLEAN NOT NULL DEFAULT true,
    "doLsAuthorised" BOOLEAN NOT NULL DEFAULT false,
    "photoUrl" TEXT,
    "notes" TEXT,
    "preAssessmentCompletedAt" TIMESTAMP(3),
    "admissionAssessmentApprovedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidentMedical" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "diagnoses" TEXT[],
    "allergies" TEXT[],
    "vaccinationAlerts" TEXT[],
    "currentMedications" TEXT,
    "mobilityLevel" "MobilityLevel" NOT NULL DEFAULT 'INDEPENDENT',
    "mobilityAids" TEXT[],
    "continenceLevel" "ContinenceLevel" NOT NULL DEFAULT 'CONTINENT',
    "dietaryNeeds" TEXT[],
    "textureModified" BOOLEAN NOT NULL DEFAULT false,
    "textureLevel" TEXT,
    "fluidThickened" BOOLEAN NOT NULL DEFAULT false,
    "fluidThickness" TEXT,
    "skinIntegrityNotes" TEXT,
    "smokingStatus" TEXT,
    "alcoholUse" TEXT,
    "additionalNeeds" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResidentMedical_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidentContact" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "isNextOfKin" BOOLEAN NOT NULL DEFAULT false,
    "isPoa" BOOLEAN NOT NULL DEFAULT false,
    "isEmergency" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResidentContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidentAssessment" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "type" "AssessmentType" NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "reviewDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResidentAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentDomain" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "domainType" "AssessmentDomainType" NOT NULL,
    "content" JSONB NOT NULL,
    "score" INTEGER,
    "riskLevel" "RiskLevel",
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentVersion" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "AssessmentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarePlan" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "category" "CarePlanCategory" NOT NULL,
    "status" "CarePlanStatus" NOT NULL DEFAULT 'DRAFT',
    "needsAssessment" TEXT,
    "goals" JSONB,
    "interventions" JSONB,
    "outcomes" JSONB,
    "aiPromptUsed" TEXT,
    "generatedByAi" BOOLEAN NOT NULL DEFAULT false,
    "reviewDate" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarePlanVersion" (
    "id" TEXT NOT NULL,
    "carePlanId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "CarePlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarePlanProgressNote" (
    "id" TEXT NOT NULL,
    "carePlanId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarePlanProgressNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareNote" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "category" "CareNoteCategory" NOT NULL,
    "shift" "Shift" NOT NULL,
    "content" TEXT NOT NULL,
    "aiSummary" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandoverReport" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "shift" "Shift" NOT NULL,
    "shiftDate" TIMESTAMP(3) NOT NULL,
    "content" JSONB NOT NULL,
    "manualAdditions" TEXT,
    "rawNotesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HandoverReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "witnesses" TEXT,
    "injuryDetails" TEXT,
    "firstAidGiven" BOOLEAN NOT NULL DEFAULT false,
    "firstAidDetails" TEXT,
    "familyNotified" BOOLEAN NOT NULL DEFAULT false,
    "gpNotified" BOOLEAN NOT NULL DEFAULT false,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentFollowUp" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyMapEntry" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "bodyRegion" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "BodyMapEntryType" NOT NULL,
    "severity" "BodyMapSeverity" NOT NULL,
    "photoUrls" TEXT[],
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedNotes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BodyMapEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organisationId_idx" ON "User"("organisationId");

-- CreateIndex
CREATE INDEX "Resident_organisationId_idx" ON "Resident"("organisationId");

-- CreateIndex
CREATE INDEX "Resident_organisationId_status_idx" ON "Resident"("organisationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ResidentMedical_residentId_key" ON "ResidentMedical"("residentId");

-- CreateIndex
CREATE INDEX "ResidentContact_residentId_idx" ON "ResidentContact"("residentId");

-- CreateIndex
CREATE INDEX "ResidentAssessment_residentId_idx" ON "ResidentAssessment"("residentId");

-- CreateIndex
CREATE INDEX "ResidentAssessment_residentId_type_idx" ON "ResidentAssessment"("residentId", "type");

-- CreateIndex
CREATE INDEX "AssessmentDomain_assessmentId_idx" ON "AssessmentDomain"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentDomain_assessmentId_domainType_key" ON "AssessmentDomain"("assessmentId", "domainType");

-- CreateIndex
CREATE INDEX "AssessmentVersion_assessmentId_idx" ON "AssessmentVersion"("assessmentId");

-- CreateIndex
CREATE INDEX "CarePlan_residentId_idx" ON "CarePlan"("residentId");

-- CreateIndex
CREATE INDEX "CarePlan_organisationId_idx" ON "CarePlan"("organisationId");

-- CreateIndex
CREATE INDEX "CarePlanVersion_carePlanId_idx" ON "CarePlanVersion"("carePlanId");

-- CreateIndex
CREATE INDEX "CarePlanProgressNote_carePlanId_idx" ON "CarePlanProgressNote"("carePlanId");

-- CreateIndex
CREATE INDEX "CareNote_residentId_idx" ON "CareNote"("residentId");

-- CreateIndex
CREATE INDEX "CareNote_organisationId_idx" ON "CareNote"("organisationId");

-- CreateIndex
CREATE INDEX "CareNote_organisationId_createdAt_idx" ON "CareNote"("organisationId", "createdAt");

-- CreateIndex
CREATE INDEX "HandoverReport_organisationId_idx" ON "HandoverReport"("organisationId");

-- CreateIndex
CREATE INDEX "HandoverReport_organisationId_shiftDate_idx" ON "HandoverReport"("organisationId", "shiftDate");

-- CreateIndex
CREATE INDEX "Incident_residentId_idx" ON "Incident"("residentId");

-- CreateIndex
CREATE INDEX "Incident_organisationId_idx" ON "Incident"("organisationId");

-- CreateIndex
CREATE INDEX "IncidentFollowUp_incidentId_idx" ON "IncidentFollowUp"("incidentId");

-- CreateIndex
CREATE INDEX "BodyMapEntry_residentId_idx" ON "BodyMapEntry"("residentId");

-- CreateIndex
CREATE INDEX "Notification_organisationId_isRead_idx" ON "Notification"("organisationId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_organisationId_idx" ON "AuditLog"("organisationId");

-- CreateIndex
CREATE INDEX "AuditLog_organisationId_entityType_idx" ON "AuditLog"("organisationId", "entityType");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resident" ADD CONSTRAINT "Resident_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentMedical" ADD CONSTRAINT "ResidentMedical_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentContact" ADD CONSTRAINT "ResidentContact_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentAssessment" ADD CONSTRAINT "ResidentAssessment_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentDomain" ADD CONSTRAINT "AssessmentDomain_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "ResidentAssessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentDomain" ADD CONSTRAINT "AssessmentDomain_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentVersion" ADD CONSTRAINT "AssessmentVersion_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "ResidentAssessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlanVersion" ADD CONSTRAINT "CarePlanVersion_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "CarePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlanProgressNote" ADD CONSTRAINT "CarePlanProgressNote_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "CarePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareNote" ADD CONSTRAINT "CareNote_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareNote" ADD CONSTRAINT "CareNote_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareNote" ADD CONSTRAINT "CareNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoverReport" ADD CONSTRAINT "HandoverReport_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoverReport" ADD CONSTRAINT "HandoverReport_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentFollowUp" ADD CONSTRAINT "IncidentFollowUp_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentFollowUp" ADD CONSTRAINT "IncidentFollowUp_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyMapEntry" ADD CONSTRAINT "BodyMapEntry_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyMapEntry" ADD CONSTRAINT "BodyMapEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
