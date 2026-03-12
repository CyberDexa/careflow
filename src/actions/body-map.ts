"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const addEntrySchema = z.object({
  residentId: z.string().min(1),
  bodyRegion: z.string().min(1, "Body region required"),
  type: z.enum([
    "SKIN_TEAR",
    "PRESSURE_DAMAGE",
    "WOUND",
    "BRUISE",
    "RASH",
    "SWELLING",
    "NEW_MARK",
    "OTHER",
  ]),
  severity: z.enum(["MINOR", "MODERATE", "SEVERE"]),
  description: z.string().min(3, "Description required"),
  photoUrls: z.array(z.string()).optional(),
})

export async function addBodyMapEntry(
  data: z.infer<typeof addEntrySchema>
) {
  const session = await getServerSession()
  const user = session.user as any

  const parsed = addEntrySchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const resident = await prisma.resident.findFirst({
    where: { id: parsed.data.residentId, organisationId: user.organisationId },
    select: { id: true },
  })
  if (!resident) return { error: "Resident not found" }

  await prisma.bodyMapEntry.create({
    data: {
      residentId: parsed.data.residentId,
      authorId: user.id,
      bodyRegion: parsed.data.bodyRegion,
      type: parsed.data.type,
      severity: parsed.data.severity,
      description: parsed.data.description,
      photoUrls: parsed.data.photoUrls ?? [],
    },
  })

  revalidatePath(`/residents/${parsed.data.residentId}/body-map`)
  revalidatePath(`/residents/${parsed.data.residentId}`)
  return { success: true }
}

export async function resolveBodyMapEntry(
  entryId: string,
  resolvedNotes: string
) {
  const session = await getServerSession()
  const user = session.user as any

  // Verify it belongs to this org
  const entry = await prisma.bodyMapEntry.findFirst({
    where: {
      id: entryId,
      resident: { organisationId: user.organisationId },
    },
    select: { id: true, residentId: true },
  })
  if (!entry) return { error: "Not found" }

  await prisma.bodyMapEntry.update({
    where: { id: entryId },
    data: {
      isResolved: true,
      resolvedAt: new Date(),
      resolvedNotes: resolvedNotes || null,
    },
  })

  revalidatePath(`/residents/${entry.residentId}/body-map`)
  return { success: true }
}

export async function getBodyMapEntries(residentId: string) {
  const session = await getServerSession()
  const user = session.user as any

  const resident = await prisma.resident.findFirst({
    where: { id: residentId, organisationId: user.organisationId },
    select: { id: true },
  })
  if (!resident) return []

  return prisma.bodyMapEntry.findMany({
    where: { residentId, deletedAt: null },
    include: {
      author: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}
