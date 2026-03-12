-- CreateEnum
CREATE TYPE "TrainingType" AS ENUM ('MOVING_AND_HANDLING', 'SAFEGUARDING_ADULTS', 'FIRE_SAFETY', 'INFECTION_CONTROL', 'FIRST_AID', 'FOOD_HYGIENE', 'DEMENTIA_AWARENESS', 'MENTAL_CAPACITY_ACT', 'MEDICATION_MANAGEMENT', 'DATA_PROTECTION', 'HEALTH_AND_SAFETY', 'EQUALITY_AND_DIVERSITY');

-- CreateEnum
CREATE TYPE "GroupUserRole" AS ENUM ('OWNER', 'ADMIN', 'VIEWER');

-- CreateEnum
CREATE TYPE "ProfessionalAccessType" AS ENUM ('READ_ONLY', 'COMMENT');

-- CreateEnum
CREATE TYPE "CareNoteInputMethod" AS ENUM ('TYPED', 'VOICE');

-- AlterTable
ALTER TABLE "CareNote" ADD COLUMN     "audioUrl" TEXT,
ADD COLUMN     "inputMethod" "CareNoteInputMethod" NOT NULL DEFAULT 'TYPED',
ADD COLUMN     "transcriptionRaw" TEXT;

-- CreateTable
CREATE TABLE "StaffProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "employeeRef" TEXT,
    "jobTitle" TEXT,
    "contractedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "dbs" TEXT,
    "dbsExpiry" TIMESTAMP(3),
    "phone" TEXT,
    "emergencyName" TEXT,
    "emergencyPhone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotaShift" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "shiftType" "Shift" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "role" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RotaShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingRecord" (
    "id" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "trainingType" "TrainingType" NOT NULL,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "certificateUrl" TEXT,
    "notes" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupervisionLog" (
    "id" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "supervisedAt" TIMESTAMP(3) NOT NULL,
    "nextDueAt" TIMESTAMP(3),
    "summary" TEXT,
    "actionPoints" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupervisionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganisationGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganisationGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMembership" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupUser" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "GroupUserRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "profession" TEXT NOT NULL,
    "gmcNumber" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalAccess" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "grantedById" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "accessType" "ProfessionalAccessType" NOT NULL DEFAULT 'READ_ONLY',
    "notes" TEXT,

    CONSTRAINT "ProfessionalAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_userId_key" ON "StaffProfile"("userId");

-- CreateIndex
CREATE INDEX "StaffProfile_organisationId_idx" ON "StaffProfile"("organisationId");

-- CreateIndex
CREATE INDEX "RotaShift_organisationId_date_idx" ON "RotaShift"("organisationId", "date");

-- CreateIndex
CREATE INDEX "RotaShift_staffProfileId_idx" ON "RotaShift"("staffProfileId");

-- CreateIndex
CREATE INDEX "TrainingRecord_staffProfileId_idx" ON "TrainingRecord"("staffProfileId");

-- CreateIndex
CREATE INDEX "TrainingRecord_organisationId_trainingType_idx" ON "TrainingRecord"("organisationId", "trainingType");

-- CreateIndex
CREATE INDEX "SupervisionLog_staffProfileId_idx" ON "SupervisionLog"("staffProfileId");

-- CreateIndex
CREATE INDEX "SupervisionLog_organisationId_idx" ON "SupervisionLog"("organisationId");

-- CreateIndex
CREATE INDEX "GroupMembership_groupId_idx" ON "GroupMembership"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMembership_groupId_orgId_key" ON "GroupMembership"("groupId", "orgId");

-- CreateIndex
CREATE INDEX "GroupUser_groupId_idx" ON "GroupUser"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupUser_groupId_userId_key" ON "GroupUser"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalUser_email_key" ON "ProfessionalUser"("email");

-- CreateIndex
CREATE INDEX "ProfessionalAccess_professionalId_idx" ON "ProfessionalAccess"("professionalId");

-- CreateIndex
CREATE INDEX "ProfessionalAccess_organisationId_idx" ON "ProfessionalAccess"("organisationId");

-- CreateIndex
CREATE INDEX "ProfessionalAccess_residentId_idx" ON "ProfessionalAccess"("residentId");

-- CreateIndex
CREATE INDEX "ProfessionalAccess_expiresAt_idx" ON "ProfessionalAccess"("expiresAt");

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotaShift" ADD CONSTRAINT "RotaShift_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisionLog" ADD CONSTRAINT "SupervisionLog_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OrganisationGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupUser" ADD CONSTRAINT "GroupUser_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OrganisationGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalAccess" ADD CONSTRAINT "ProfessionalAccess_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
