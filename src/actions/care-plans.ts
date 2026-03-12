"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

export async function saveCarePlan(data: {
  residentId: string
  category: string
  needsAssessment: string
  goals: string[]
  interventions: string[]
  outcomes: string[]
  reviewDate?: string
  riskFlags?: string[]
  aiGenerated?: boolean
}) {
  const session = await getServerSession()
  const user = session.user as any

  // Verify resident
  const resident = await prisma.resident.findFirst({
    where: { id: data.residentId, organisationId: user.organisationId },
    select: { id: true },
  })
  if (!resident) return { error: "Resident not found" }

  const plan = await prisma.carePlan.create({
    data: {
      organisationId: user.organisationId,
      residentId: data.residentId,
      category: data.category as any,
      status: "DRAFT",
      needsAssessment: data.needsAssessment,
      goals: data.goals,
      interventions: data.interventions,
      outcomes: data.outcomes,
      reviewDate: data.reviewDate
        ? new Date(data.reviewDate)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // default 30-day review
      generatedByAi: data.aiGenerated ?? false,
    },
  })

  await prisma.auditLog.create({
    data: {
      organisationId: user.organisationId,
      userId: user.id,
      action: "CREATE",
      entityType: "CarePlan",
      entityId: plan.id,
    },
  })

  revalidatePath(`/residents/${data.residentId}`)
  return { success: true, planId: plan.id }
}

export async function approveCarePlan(planId: string) {
  const session = await getServerSession()
  const user = session.user as any

  const plan = await prisma.carePlan.findFirst({
    where: { id: planId, organisationId: user.organisationId },
  })
  if (!plan) return { error: "Not found" }

  await prisma.carePlan.update({
    where: { id: planId },
    data: {
      status: "ACTIVE",
      approvedById: user.id,
      approvedAt: new Date(),
    },
  })

  revalidatePath(`/residents/${plan.residentId}`)
  return { success: true }
}

export async function getResidentCarePlans(residentId: string) {
  const session = await getServerSession()
  const user = session.user as any

  return prisma.carePlan.findMany({
    where: { residentId, organisationId: user.organisationId },
    include: {
      approvedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

// ─── Add a timestamped progress note to a care plan ──────────────────────────
export async function addCarePlanProgressNote(carePlanId: string, note: string) {
  const session = await getServerSession()
  const user = session.user as any

  const trimmed = note.trim()
  if (!trimmed) return { error: "Note cannot be empty" }

  const plan = await prisma.carePlan.findFirst({
    where: { id: carePlanId, organisationId: user.organisationId, deletedAt: null },
  })
  if (!plan) return { error: "Care plan not found" }

  await prisma.carePlanProgressNote.create({
    data: { carePlanId, note: trimmed, createdBy: user.id },
  })

  await prisma.auditLog.create({
    data: {
      organisationId: user.organisationId,
      userId: user.id,
      action: "CREATE",
      entityType: "CarePlanProgressNote",
      entityId: carePlanId,
    },
  })

  revalidatePath(`/residents/${plan.residentId}/care-plans/${carePlanId}`)
  return { success: true }
}

// ─── Update an existing care plan (fields only) ──────────────────────────────
export async function updateCarePlan(planId: string, data: {
  needsAssessment?: string
  goals?: string[]
  interventions?: string[]
  outcomes?: string[]
  reviewDate?: string
}) {
  const session = await getServerSession()
  const user = session.user as any

  const plan = await prisma.carePlan.findFirst({
    where: { id: planId, organisationId: user.organisationId, deletedAt: null },
  })
  if (!plan) return { error: "Not found" }

  await prisma.carePlan.update({
    where: { id: planId },
    data: {
      needsAssessment: data.needsAssessment,
      goals: data.goals,
      interventions: data.interventions,
      outcomes: data.outcomes,
      reviewDate: data.reviewDate ? new Date(data.reviewDate) : undefined,
    },
  })

  await prisma.auditLog.create({
    data: {
      organisationId: user.organisationId,
      userId: user.id,
      action: "UPDATE",
      entityType: "CarePlan",
      entityId: planId,
    },
  })

  revalidatePath(`/residents/${plan.residentId}/care-plans/${planId}`)
  return { success: true }
}
