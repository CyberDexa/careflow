"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/auth-helpers"
import { careNoteSchema, type CareNoteInput } from "@/lib/validations"

export async function createCareNote(data: CareNoteInput) {
  const session = await getServerSession()
  const user = session.user as any

  const parsed = careNoteSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Verify resident belongs to same org
  const resident = await prisma.resident.findFirst({
    where: { id: parsed.data.residentId, organisationId: user.organisationId, deletedAt: null },
  })
  if (!resident) return { error: "Resident not found" }

  const note = await prisma.careNote.create({
    data: {
      residentId: parsed.data.residentId,
      organisationId: user.organisationId,
      authorId: user.id,
      category: parsed.data.category as any,
      shift: parsed.data.shift as any,
      content: parsed.data.content,
    },
  })

  await prisma.auditLog.create({
    data: {
      organisationId: user.organisationId,
      userId: user.id,
      action: "CREATE_CARE_NOTE",
      entityType: "CareNote",
      entityId: note.id,
    },
  })

  revalidatePath(`/residents/${parsed.data.residentId}`)
  revalidatePath("/care-notes")
  return { success: true, noteId: note.id }
}

export async function getCareNotes(options: {
  residentId?: string
  organisationId?: string
  page?: number
  limit?: number
  category?: string
  shift?: string
}) {
  const { residentId, organisationId, page = 1, limit = 20, category, shift } = options

  const where: any = { deletedAt: null }
  if (residentId) where.residentId = residentId
  if (organisationId) where.resident = { organisationId }
  if (category) where.category = category
  if (shift) where.shift = shift

  const [notes, total] = await Promise.all([
    prisma.careNote.findMany({
      where,
      include: {
        resident: { select: { id: true, firstName: true, lastName: true, roomNumber: true } },
        author: { select: { firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.careNote.count({ where }),
  ])

  return { notes, total, pages: Math.ceil(total / limit) }
}

export async function getResidentCareNotes(residentId: string) {
  const session = await getServerSession()
  const user = session.user as any

  return prisma.careNote.findMany({
    where: {
      residentId,
      deletedAt: null,
      resident: { organisationId: user.organisationId },
    },
    include: {
      author: { select: { firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}
