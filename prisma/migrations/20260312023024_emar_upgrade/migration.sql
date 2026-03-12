-- CreateEnum
CREATE TYPE "MARCode" AS ENUM ('G', 'R', 'S', 'P', 'M', 'H', 'D', 'N', 'L', 'Q', 'O');

-- CreateEnum
CREATE TYPE "RoundSlot" AS ENUM ('MORNING', 'LUNCHTIME', 'TEA_TIME', 'EVENING', 'NIGHT', 'PRN');

-- AlterTable
ALTER TABLE "Medication" ADD COLUMN     "prnMinIntervalHours" INTEGER DEFAULT 4;

-- AlterTable
ALTER TABLE "MedicationAdministration" ADD COLUMN     "marCode" "MARCode",
ADD COLUMN     "painScoreAfter" INTEGER,
ADD COLUMN     "painScoreBefore" INTEGER,
ADD COLUMN     "roundSlot" "RoundSlot";

-- CreateIndex
CREATE INDEX "GroupMembership_orgId_idx" ON "GroupMembership"("orgId");

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalAccess" ADD CONSTRAINT "ProfessionalAccess_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalAccess" ADD CONSTRAINT "ProfessionalAccess_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
