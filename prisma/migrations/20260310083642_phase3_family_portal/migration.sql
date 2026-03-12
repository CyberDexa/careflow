-- CreateEnum
CREATE TYPE "WellbeingMood" AS ENUM ('VERY_HAPPY', 'HAPPY', 'NEUTRAL', 'SAD', 'DISTRESSED');

-- CreateEnum
CREATE TYPE "WellbeingLevel" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'FAMILY_MESSAGE';
ALTER TYPE "NotificationType" ADD VALUE 'WELLBEING_REMINDER';

-- CreateTable
CREATE TABLE "FamilyUser" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "inviteToken" TEXT,
    "inviteExpiresAt" TIMESTAMP(3),
    "inviteAcceptedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FamilyUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMessage" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "fromFamilyUserId" TEXT,
    "fromStaffId" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WellbeingUpdate" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "mood" "WellbeingMood" NOT NULL,
    "appetite" "WellbeingLevel" NOT NULL,
    "sleep" "WellbeingLevel" NOT NULL,
    "activityLevel" "WellbeingLevel" NOT NULL,
    "note" TEXT,
    "photoUrls" TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WellbeingUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FamilyUser_email_key" ON "FamilyUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyUser_inviteToken_key" ON "FamilyUser"("inviteToken");

-- CreateIndex
CREATE INDEX "FamilyUser_residentId_idx" ON "FamilyUser"("residentId");

-- CreateIndex
CREATE INDEX "FamilyUser_organisationId_idx" ON "FamilyUser"("organisationId");

-- CreateIndex
CREATE INDEX "FamilyMessage_residentId_idx" ON "FamilyMessage"("residentId");

-- CreateIndex
CREATE INDEX "FamilyMessage_organisationId_idx" ON "FamilyMessage"("organisationId");

-- CreateIndex
CREATE INDEX "WellbeingUpdate_residentId_idx" ON "WellbeingUpdate"("residentId");

-- CreateIndex
CREATE INDEX "WellbeingUpdate_organisationId_createdAt_idx" ON "WellbeingUpdate"("organisationId", "createdAt");

-- AddForeignKey
ALTER TABLE "FamilyUser" ADD CONSTRAINT "FamilyUser_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMessage" ADD CONSTRAINT "FamilyMessage_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMessage" ADD CONSTRAINT "FamilyMessage_fromFamilyUserId_fkey" FOREIGN KEY ("fromFamilyUserId") REFERENCES "FamilyUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMessage" ADD CONSTRAINT "FamilyMessage_fromStaffId_fkey" FOREIGN KEY ("fromStaffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WellbeingUpdate" ADD CONSTRAINT "WellbeingUpdate_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WellbeingUpdate" ADD CONSTRAINT "WellbeingUpdate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
