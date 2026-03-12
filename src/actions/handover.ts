"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

export async function generateHandoverReport(shift: string, shiftDate: string) {
  const session = await getServerSession()
  const user = session.user as any
  const orgId = user.organisationId as string

  // Parse shift window
  const date = new Date(shiftDate)
  let startHour = 7, endHour = 15
  if (shift === "AFTERNOON") { startHour = 15; endHour = 23 }
  if (shift === "NIGHT") { startHour = 23; endHour = 31 } // crosses midnight

  const from = new Date(date)
  from.setHours(startHour, 0, 0, 0)
  const to = new Date(date)
  to.setHours(endHour, 0, 0, 0)

  if (!orgId) return { error: "Unauthorised" }

  const [careNotes, residents, incidents] = await Promise.all([
    prisma.careNote.findMany({
      where: {
        organisationId: orgId,
        createdAt: { gte: from, lte: to },
      },
      include: {
        resident: { select: { firstName: true, lastName: true, roomNumber: true } },
        author: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.resident.findMany({
      where: { organisationId: orgId, status: "ADMITTED" },
      include: { medicalHistory: { select: { diagnoses: true } } },
      orderBy: [{ lastName: "asc" }],
    }),
    prisma.incident.findMany({
      where: {
        organisationId: orgId,
        createdAt: { gte: from, lte: to },
      },
      include: { resident: { select: { firstName: true, lastName: true, roomNumber: true } } },
      take: 20,
    }),
  ])

  return {
    success: true,
    data: {
      shift,
      shiftDate,
      careNotes,
      residents: residents.map((r: any) => ({
        id: r.id,
        name: `${r.firstName} ${r.lastName}`,
        room: r.roomNumber,
        dnacpr: r.dnacprInPlace ?? false,
        diagnosis: r.medicalHistory?.diagnoses?.[0] ?? "",
      })),
      incidents,
    },
  }
}

export async function saveHandoverReport(data: {
  shift: string
  shiftDate: string
  content: string
  aiGenerated: boolean
}) {
  const session = await getServerSession()
  const user = session.user as any

  const report = await prisma.handoverReport.create({
    data: {
      organisationId: user.organisationId,
      authorId: user.id,
      shift: data.shift as any,
      shiftDate: new Date(data.shiftDate),
      content: { text: data.content, aiGenerated: data.aiGenerated },
    },
  })

  await prisma.auditLog.create({
    data: {
      organisationId: user.organisationId,
      userId: user.id,
      action: "CREATE",
      entityType: "HandoverReport",
      entityId: report.id,
    },
  })

  revalidatePath("/handover")
  return { success: true, reportId: report.id }
}

export async function getHandoverReports(page = 1, limit = 10) {
  const session = await getServerSession()
  const user = session.user as any

  const skip = (page - 1) * limit
  const [reports, total] = await Promise.all([
    prisma.handoverReport.findMany({
      where: { organisationId: user.organisationId },
      include: { author: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    prisma.handoverReport.count({
      where: { organisationId: user.organisationId },
    }),
  ])
  return { reports, total }
}
