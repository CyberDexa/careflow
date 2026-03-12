"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const incidentSchema = z.object({
  residentId: z.string().min(1),
  title: z.string().min(3, "Title required"),
  description: z.string().min(10, "Description required"),
  incidentDate: z.string(),
  incidentTime: z.string().optional(),
  location: z.string().optional(),
  type: z.string().optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  witnesses: z.string().optional(),
  immediateAction: z.string().optional(),
  bodyMapEntries: z.array(z.object({
    region: z.string(),
    description: z.string().optional(),
  })).optional(),
})

type IncidentInput = z.infer<typeof incidentSchema>

export async function createIncident(formData: IncidentInput) {
  const session = await getServerSession()
  const user = session.user as any

  const parsed = incidentSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const data = parsed.data

  // Verify resident belongs to this org
  const resident = await prisma.resident.findFirst({
    where: { id: data.residentId, organisationId: user.organisationId },
    select: { id: true },
  })
  if (!resident) return { error: "Resident not found" }

  const incidentDateTime = new Date(`${data.incidentDate}T${data.incidentTime ?? "00:00"}`)

  const incident = await prisma.incident.create({
    data: {
      organisationId: user.organisationId,
      residentId: data.residentId,
      reportedById: user.id,
      description: data.title ? `${data.title}\n\n${data.description}` : data.description,
      occurredAt: incidentDateTime,
      location: data.location,
      type: data.type as any,
      severity: data.severity,
      witnesses: data.witnesses,
      status: "OPEN",
    },
  })

  // Create body map entries if provided
  if (data.bodyMapEntries?.length) {
    await prisma.bodyMapEntry.createMany({
      data: data.bodyMapEntries.map((e) => ({
        residentId: data.residentId,
        authorId: user.id,
        bodyRegion: e.region,
        description: e.description ?? "Injury noted",
        type: "OTHER" as any,
        severity: "MINOR" as any,
      })),
    })
  }

  // Auto-notify managers + senior carers for HIGH / CRITICAL incidents
  if (data.severity === "HIGH" || data.severity === "CRITICAL") {
    const residentName = await prisma.resident.findUnique({
      where: { id: data.residentId },
      select: { firstName: true, lastName: true },
    })
    const name = residentName
      ? `${residentName.firstName} ${residentName.lastName}`
      : "a resident"

    await prisma.notification.create({
      data: {
        organisationId: user.organisationId,
        userId: null, // broadcast to all in org
        type:
          data.severity === "CRITICAL"
            ? "CRITICAL_INCIDENT"
            : "HIGH_SEVERITY_INCIDENT",
        title: `${data.severity} incident reported`,
        body: `A ${data.severity.toLowerCase()} severity incident involving ${name} has been reported and requires attention.`,
        entityType: "Incident",
        entityId: incident.id,
      },
    })
  }

  await prisma.auditLog.create({
    data: {
      organisationId: user.organisationId,
      userId: user.id,
      action: "CREATE",
      entityType: "Incident",
      entityId: incident.id,
    },
  })

  revalidatePath("/incidents")
  revalidatePath(`/residents/${data.residentId}`)

  return { success: true, incidentId: incident.id }
}

export async function addIncidentFollowUp(incidentId: string, note: string) {
  const session = await getServerSession()
  const user = session.user as any

  if (!note?.trim()) return { error: "Note is required" }

  const incident = await prisma.incident.findFirst({
    where: { id: incidentId, organisationId: user.organisationId },
    select: { id: true },
  })
  if (!incident) return { error: "Incident not found" }

  const followUp = await prisma.incidentFollowUp.create({
    data: {
      incidentId,
      authorId: user.id,
      note: note.trim(),
    },
  })

  await prisma.auditLog.create({
    data: {
      organisationId: user.organisationId,
      userId: user.id,
      action: "CREATE",
      entityType: "IncidentFollowUp",
      entityId: followUp.id,
    },
  })

  revalidatePath(`/incidents/${incidentId}`)
  return { success: true }
}

export async function updateIncidentStatus(incidentId: string, status: string, reviewNotes?: string) {
  const session = await getServerSession()
  const user = session.user as any

  const incident = await prisma.incident.findFirst({
    where: { id: incidentId, organisationId: user.organisationId },
    select: { id: true },
  })
  if (!incident) return { error: "Not found" }

  await prisma.incident.update({
    where: { id: incidentId },
    data: {
      status: status as any,
    },
  })

  revalidatePath("/incidents")
  return { success: true }
}

export async function getIncidents(options: {
  severity?: string
  status?: string
  search?: string
  page?: number
  limit?: number
} = {}) {
  const session = await getServerSession()
  const user = session.user as any

  const { severity, status, search, page = 1, limit = 20 } = options
  const skip = (page - 1) * limit

  const where: any = { organisationId: user.organisationId }
  if (severity) where.severity = severity
  if (status) where.status = status
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { resident: { firstName: { contains: search, mode: "insensitive" } } },
      { resident: { lastName: { contains: search, mode: "insensitive" } } },
    ]
  }

  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      include: {
        resident: { select: { firstName: true, lastName: true, roomNumber: true } },
        reportedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: limit,
      skip,
    }),
    prisma.incident.count({ where }),
  ])

  return { incidents, total }
}
