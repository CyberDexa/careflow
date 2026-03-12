"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/auth-helpers"

// ─── Create / start a new assessment ────────────────────────────────────────
export async function startAssessment(residentId: string, assessmentType: string) {
  const session = await getServerSession()
  const user = session.user as any

  // Verify resident belongs to same org
  const resident = await prisma.resident.findFirst({
    where: { id: residentId, organisationId: user.organisationId, deletedAt: null },
  })
  if (!resident) return { error: "Resident not found" }

  // Check for an existing IN_PROGRESS of same type
  const existing = await prisma.residentAssessment.findFirst({
    where: {
      residentId,
      type: assessmentType as any,
      status: "IN_PROGRESS",
    },
    orderBy: { createdAt: "desc" },
  })
  if (existing) return { assessmentId: existing.id }

  const assessment = await prisma.residentAssessment.create({
    data: {
      residentId,
      type: assessmentType as any,
      status: "IN_PROGRESS",
    },
  })

  return { assessmentId: assessment.id }
}

const saveDomainSchema = z.object({
  assessmentId: z.string().min(1, "Assessment ID required"),
  domainType: z.string().min(1, "Domain type required"),
  content: z.record(z.string(), z.any()),
  score: z.number().nullable().optional(),
  markComplete: z.boolean().optional(),
})

// ─── Save / upsert a single domain's content ────────────────────────────────
export async function saveAssessmentDomain(
  assessmentId: string,
  domainType: string,
  content: Record<string, any>,
  score?: number | null,
  markComplete = false,
) {
  const session = await getServerSession()
  const user = session.user as any

  const parsed = saveDomainSchema.safeParse({ assessmentId, domainType, content, score, markComplete })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Security: verify assessment belongs to org
  const assessment = await prisma.residentAssessment.findFirst({
    where: {
      id: assessmentId,
      resident: { organisationId: user.organisationId },
    },
  })
  if (!assessment) return { error: "Assessment not found" }

  await prisma.assessmentDomain.upsert({
    where: { assessmentId_domainType: { assessmentId, domainType: domainType as any } },
    create: {
      assessmentId,
      domainType: domainType as any,
      content: content as any,
      score: score ?? null,
      completedById: user.id,
      isComplete: markComplete,
      completedAt: markComplete ? new Date() : null,
    },
    update: {
      content: content as any,
      score: score ?? null,
      completedById: user.id,
      isComplete: markComplete,
      completedAt: markComplete ? new Date() : null,
    },
  })

  // Create version snapshot
  const allDomains = await prisma.assessmentDomain.findMany({ where: { assessmentId } })
  await prisma.assessmentVersion.create({
    data: {
      assessmentId,
      snapshot: { domains: allDomains, savedAt: new Date().toISOString(), domainType } as any,
      createdBy: user.id,
    },
  })

  return { success: true }
}

// ─── Mark a single domain as complete ───────────────────────────────────────
export async function markDomainComplete(assessmentId: string, domainType: string) {
  const session = await getServerSession()
  const user = session.user as any

  const assessment = await prisma.residentAssessment.findFirst({
    where: { id: assessmentId, resident: { organisationId: user.organisationId } },
  })
  if (!assessment) return { error: "Assessment not found" }

  await prisma.assessmentDomain.updateMany({
    where: { assessmentId, domainType: domainType as any },
    data: { isComplete: true, completedAt: new Date(), completedById: user.id },
  })

  revalidatePath(`/residents/${assessment.residentId}`)
  return { success: true }
}

// ─── Submit formal assessment for manager approval ───────────────────────────
export async function submitForApproval(assessmentId: string) {
  const session = await getServerSession()
  const user = session.user as any

  const assessment = await prisma.residentAssessment.findFirst({
    where: { id: assessmentId, resident: { organisationId: user.organisationId } },
    include: { domains: true },
  })
  if (!assessment) return { error: "Assessment not found" }
  if (assessment.domains.length === 0) return { error: "No domains saved yet" }

  await prisma.residentAssessment.update({
    where: { id: assessmentId },
    data: { status: "PENDING_APPROVAL", completedAt: new Date() },
  })

  // Create notification for managers
  await prisma.notification.create({
    data: {
      organisationId: (await prisma.resident.findUnique({ where: { id: assessment.residentId }, select: { organisationId: true } }))!.organisationId,
      userId: null,
      type: "CARE_PLAN_PENDING_APPROVAL",
      title: "Assessment pending approval",
      body: `A ${assessment.type.replace("_", " ")} assessment has been submitted and requires manager approval.`,
      entityType: "ResidentAssessment",
      entityId: assessmentId,
    },
  })

  await prisma.auditLog.create({
    data: {
      organisationId: user.organisationId,
      userId: user.id,
      action: "SUBMIT_FOR_APPROVAL",
      entityType: "ResidentAssessment",
      entityId: assessmentId,
    },
  })

  revalidatePath(`/residents/${assessment.residentId}`)
  return { success: true }
}

// ─── Manager approves assessment → resident status → ADMITTED ────────────────
export async function approveAssessment(assessmentId: string) {
  const session = await getServerSession()
  const user = session.user as any

  if (user.role !== "MANAGER") return { error: "Only managers can approve assessments" }

  const assessment = await prisma.residentAssessment.findFirst({
    where: {
      id: assessmentId,
      resident: { organisationId: user.organisationId },
      status: "PENDING_APPROVAL",
    },
    include: { resident: { select: { id: true, status: true } } },
  })
  if (!assessment) return { error: "Assessment not found or not in PENDING_APPROVAL status" }

  await prisma.residentAssessment.update({
    where: { id: assessmentId },
    data: { status: "APPROVED", approvedAt: new Date(), approvedBy: user.id },
  })

  // If ADMISSION type and resident is PRE_ASSESSED, advance to ADMITTED
  if (assessment.type === "ADMISSION" && assessment.resident.status === "PRE_ASSESSED") {
    await prisma.resident.update({
      where: { id: assessment.residentId },
      data: { status: "ADMITTED", admissionDate: new Date() },
    }).catch(() => {})
  }

  await prisma.auditLog.create({
    data: {
      organisationId: user.organisationId,
      userId: user.id,
      action: "APPROVE_ASSESSMENT",
      entityType: "ResidentAssessment",
      entityId: assessmentId,
    },
  })

  revalidatePath(`/residents/${assessment.residentId}`)
  return { success: true }
}

// ─── Submit (finalise) an assessment ────────────────────────────────────────
export async function submitAssessment(assessmentId: string) {
  const session = await getServerSession()
  const user = session.user as any

  const assessment = await prisma.residentAssessment.findFirst({
    where: {
      id: assessmentId,
      resident: { organisationId: user.organisationId },
    },
    include: { domains: true },
  })
  if (!assessment) return { error: "Assessment not found" }
  if (assessment.domains.length === 0) return { error: "No domains completed" }

  // For PRE_ADMISSION: directly approve + advance resident to PRE_ASSESSED
  // For ADMISSION: move to PENDING_APPROVAL (manager must approve → ADMITTED)
  const isPreAdmission = assessment.type === "PRE_ADMISSION"

  await prisma.residentAssessment.update({
    where: { id: assessmentId },
    data: {
      status: isPreAdmission ? "APPROVED" : "PENDING_APPROVAL",
      completedAt: new Date(),
      ...(isPreAdmission && { approvedAt: new Date(), approvedBy: user.id }),
    },
  })

  if (isPreAdmission) {
    await prisma.resident.update({
      where: { id: assessment.residentId, status: "ENQUIRY" },
      data: { status: "PRE_ASSESSED", preAssessmentCompletedAt: new Date() },
    }).catch(() => {})
  } else {
    // Notify managers that an assessment is pending approval
    const resident = await prisma.resident.findUnique({
      where: { id: assessment.residentId },
      select: { organisationId: true, firstName: true, lastName: true },
    })
    if (resident) {
      await prisma.notification.create({
        data: {
          organisationId: resident.organisationId,
          userId: null,
          type: "CARE_PLAN_PENDING_APPROVAL",
          title: "Assessment pending approval",
          body: `An assessment for ${resident.firstName} ${resident.lastName} has been submitted and requires manager approval.`,
          entityType: "ResidentAssessment",
          entityId: assessmentId,
        },
      })
    }
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      organisationId: user.organisationId,
      userId: user.id,
      action: isPreAdmission ? "COMPLETE_PRE_ADMISSION_ASSESSMENT" : "SUBMIT_FOR_APPROVAL",
      entityType: "ResidentAssessment",
      entityId: assessmentId,
    },
  })

  revalidatePath(`/residents/${assessment.residentId}`)
  redirect(`/residents/${assessment.residentId}?tab=assessments`)
}

const saveAndSubmitSchema = z.object({
  residentId: z.string().min(1, "Resident ID required"),
  domainType: z.string().min(1, "Domain type required"),
  content: z.record(z.string(), z.any()),
  score: z.number().nullable().optional(),
})

// ─── Save + redirect (for single-domain formal assessments) ─────────────────
export async function saveAndSubmitAssessment(
  residentId: string,
  domainType: string,
  content: Record<string, any>,
  score?: number | null,
) {
  const session = await getServerSession()
  const user = session.user as any

  const parsed = saveAndSubmitSchema.safeParse({ residentId, domainType, content, score })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const resident = await prisma.resident.findFirst({
    where: { id: residentId, organisationId: user.organisationId, deletedAt: null },
  })
  if (!resident) return { error: "Resident not found" }

  const assessment = await prisma.residentAssessment.create({
    data: {
      residentId,
      type: "ADMISSION",
      status: "APPROVED",
      completedAt: new Date(),
    },
  })

  await prisma.assessmentDomain.create({
    data: {
      assessmentId: assessment.id,
      domainType: domainType as any,
      content: content as any,
      score: score ?? null,
      completedById: user.id,
    },
  })

  await prisma.auditLog.create({
    data: {
      organisationId: user.organisationId,
      userId: user.id,
      action: "COMPLETE_ASSESSMENT",
      entityType: "ResidentAssessment",
      entityId: assessment.id,
    },
  })

  revalidatePath(`/residents/${residentId}`)
  redirect(`/residents/${residentId}?tab=assessments`)
}

// ─── Create a fresh monthly review assessment ───────────────────────────────
export async function createMonthlyReview(residentId: string) {
  const session = await getServerSession()
  const user = session.user as any

  if (!residentId?.trim()) return { error: "Resident ID required" }

  const resident = await prisma.resident.findFirst({
    where: { id: residentId, organisationId: user.organisationId, deletedAt: null, status: "ADMITTED" },
    select: { id: true },
  })
  if (!resident) return { error: "Admitted resident not found" }

  // Check there is no in-progress monthly review already
  const existing = await prisma.residentAssessment.findFirst({
    where: { residentId, type: "MONTHLY_REVIEW", status: "IN_PROGRESS" },
  })
  if (existing) return { assessmentId: existing.id }

  const assessment = await prisma.residentAssessment.create({
    data: {
      residentId,
      type: "MONTHLY_REVIEW",
      status: "IN_PROGRESS",
      reviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.auditLog.create({
    data: {
      organisationId: user.organisationId,
      userId: user.id,
      action: "CREATE",
      entityType: "ResidentAssessment",
      entityId: assessment.id,
    },
  })

  revalidatePath(`/residents/${residentId}/assessments`)
  return { assessmentId: assessment.id }
}

// ─── Get assessments for a resident ─────────────────────────────────────────
export async function getResidentAssessments(residentId: string) {
  const session = await getServerSession()
  const user = session.user as any

  return prisma.residentAssessment.findMany({
    where: {
      residentId,
      resident: { organisationId: user.organisationId },
    },
    include: {
      domains: { orderBy: { updatedAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  })
}
