"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/auth-helpers"
import {
  residentPersonalSchema,
  residentMedicalSchema,
  residentContactSchema,
  residentAdmissionSchema,
  type ResidentPersonalInput,
  type ResidentMedicalInput,
  type ResidentContactInput,
} from "@/lib/validations"

export async function createResident(formData: {
  personal: ResidentPersonalInput
  medical: ResidentMedicalInput
  contacts: ResidentContactInput[]
  admission?: any
}) {
  const session = await getServerSession()
  const user = session.user as any

  const personalParsed = residentPersonalSchema.safeParse(formData.personal)
  if (!personalParsed.success) {
    return { error: personalParsed.error.issues[0].message }
  }

  const medicalParsed = residentMedicalSchema.safeParse(formData.medical)
  if (!medicalParsed.success) {
    return { error: medicalParsed.error.issues[0].message }
  }

  const { firstName, lastName, preferredName, dateOfBirth, nhsNumber, roomNumber, ...personalRest } = personalParsed.data
  const {
    diagnoses, allergies, vaccinationAlerts, currentMedications,
    mobilityLevel, mobilityAids, continenceLevel,
    dietaryNeeds, textureModified, textureLevel, fluidThickened, fluidThickness,
    skinIntegrityNotes, smokingStatus, alcoholUse, additionalNeeds,
    dnacprInPlace, dnacprDate, mentalCapacity, doLsAuthorised,
    gpName, gpPractice, gpPhone, gpAddress,
  } = medicalParsed.data

  const resident = await prisma.resident.create({
    data: {
      organisationId: user.organisationId,
      status: "ENQUIRY",
      firstName,
      lastName,
      preferredName,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      nhsNumber,
      roomNumber,
      ...personalRest,
      dnacprInPlace,
      dnacprDate: dnacprDate ? new Date(dnacprDate) : null,
      mentalCapacity,
      doLsAuthorised,
      gpName, gpPractice, gpPhone, gpAddress,
      admissionDate: formData.admission?.admissionDate ? new Date(formData.admission.admissionDate) : null,
      expectedStayType: formData.admission?.expectedStayType,
      fundingType: formData.admission?.fundingType,
      referralSource: formData.admission?.referralSource,
      notes: formData.admission?.notes,
      medicalHistory: {
        create: {
          diagnoses,
          allergies,
          vaccinationAlerts,
          currentMedications,
          mobilityLevel: mobilityLevel as any,
          mobilityAids,
          continenceLevel: continenceLevel as any,
          dietaryNeeds,
          textureModified,
          textureLevel,
          fluidThickened,
          fluidThickness,
          skinIntegrityNotes,
          smokingStatus,
          alcoholUse,
          additionalNeeds,
        },
      },
      contacts: formData.contacts.length > 0 ? {
        create: formData.contacts.map((c) => ({
          relationship: c.relationship,
          firstName: c.firstName,
          lastName: c.lastName,
          phone: c.phone,
          email: c.email || null,
          address: c.address,
          isNextOfKin: c.isNextOfKin,
          isPoa: c.isPoa,
          isEmergency: c.isEmergency,
          notes: c.notes,
        })),
      } : undefined,
    },
  })

  // Audit log
  await prisma.auditLog.create({
    data: {
      organisationId: user.organisationId,
      userId: user.id,
      action: "CREATE_RESIDENT",
      entityType: "Resident",
      entityId: resident.id,
      after: { firstName, lastName },
    },
  })

  revalidatePath("/residents")
  redirect(`/residents/${resident.id}`)
}

export async function updateResidentStatus(residentId: string, status: string) {
  const session = await getServerSession()
  const user = session.user as any

  const resident = await prisma.resident.findFirst({
    where: { id: residentId, organisationId: user.organisationId, deletedAt: null },
  })
  if (!resident) return { error: "Resident not found" }

  await prisma.resident.update({
    where: { id: residentId },
    data: { status: status as any },
  })

  revalidatePath(`/residents/${residentId}`)
  revalidatePath("/residents")
}

export async function softDeleteResident(residentId: string) {
  const session = await getServerSession()
  const user = session.user as any

  if (!["ADMIN", "MANAGER"].includes(user.role)) {
    return { error: "Insufficient permissions" }
  }

  await prisma.resident.update({
    where: { id: residentId, organisationId: user.organisationId },
    data: { deletedAt: new Date(), status: "DISCHARGED" },
  })

  revalidatePath("/residents")
  redirect("/residents")
}

export async function updateResidentPhoto(residentId: string, photoUrl: string) {
  const session = await getServerSession()
  const user = session.user as any

  if (!photoUrl.startsWith("data:image/")) {
    return { error: "Invalid image format" }
  }
  // ~500KB base64 limit (≈375KB raw image)
  if (photoUrl.length > 700_000) {
    return { error: "Image too large. Please use a smaller photo." }
  }

  const resident = await prisma.resident.findFirst({
    where: { id: residentId, organisationId: user.organisationId, deletedAt: null },
  })
  if (!resident) return { error: "Resident not found" }

  await prisma.resident.update({
    where: { id: residentId },
    data: { photoUrl },
  })

  revalidatePath(`/residents/${residentId}`)
}
