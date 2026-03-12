"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { z } from "zod"

// ── Create / update group ─────────────────────────────────────────────────────

const groupSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Name required"),
  description: z.string().optional(),
})

export async function upsertOrganisationGroup(input: z.infer<typeof groupSchema>) {
  const session = await auth()
  const user = session?.user as any
  if (!user || user.role !== "ADMIN") return { error: "Unauthorised" }

  const parsed = groupSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { id, name, description } = parsed.data

  if (id) {
    const group = await prisma.organisationGroup.update({
      where: { id },
      data: { name, description },
    })
    return { group }
  }

  const group = await prisma.organisationGroup.create({
    data: { name, description },
  })

  // Auto-add the ADMIN's org as first member
  await prisma.groupMembership.create({
    data: { groupId: group.id, orgId: user.organisationId },
  })

  // Make this ADMIN the group OWNER
  await prisma.groupUser.create({
    data: { groupId: group.id, userId: user.id, role: "OWNER" },
  })

  await logAudit({
    organisationId: user.organisationId,
    userId: user.id,
    action: "GROUP_CREATED",
    entityType: "OrganisationGroup",
    entityId: group.id,
    after: { name },
  })

  return { group }
}

// ── Get groups for current user ───────────────────────────────────────────────

export async function getMyGroups() {
  const session = await auth()
  const user = session?.user as any
  if (!user) return { error: "Unauthorised" }

  const groupUsers = await prisma.groupUser.findMany({
    where: { userId: user.id },
    include: {
      group: {
        include: {
          memberships: {
            include: {
              organisation: {
                select: { id: true, name: true },
              },
            },
          },
          groupUsers: { select: { role: true, userId: true } },
        },
      },
    },
  })

  return { groups: groupUsers.map((gu) => ({ ...gu.group, myRole: gu.role })) }
}

// ── Add org to group ──────────────────────────────────────────────────────────

export async function addOrgToGroup(groupId: string, orgId: string) {
  const session = await auth()
  const user = session?.user as any
  if (!user || user.role !== "ADMIN") return { error: "Unauthorised" }

  // Must be OWNER or ADMIN of this group
  const membership = await prisma.groupUser.findFirst({
    where: { groupId, userId: user.id, role: { in: ["OWNER", "ADMIN"] } },
  })
  if (!membership) return { error: "You don't have permission to manage this group" }

  const already = await prisma.groupMembership.findUnique({
    where: { groupId_orgId: { groupId, orgId } },
  })
  if (already) return { error: "Organisation is already in this group" }

  const entry = await prisma.groupMembership.create({
    data: { groupId, orgId },
  })
  return { entry }
}

// ── Remove org from group ─────────────────────────────────────────────────────

export async function removeOrgFromGroup(groupId: string, orgId: string) {
  const session = await auth()
  const user = session?.user as any
  if (!user || user.role !== "ADMIN") return { error: "Unauthorised" }

  const membership = await prisma.groupUser.findFirst({
    where: { groupId, userId: user.id, role: { in: ["OWNER", "ADMIN"] } },
  })
  if (!membership) return { error: "You don't have permission to manage this group" }

  await prisma.groupMembership.delete({
    where: { groupId_orgId: { groupId, orgId } },
  })
  return { success: true }
}

// ── Get aggregate stats for a group ──────────────────────────────────────────

export async function getGroupStats(groupId: string) {
  const session = await auth()
  const user = session?.user as any
  if (!user) return { error: "Unauthorised" }

  const groupUser = await prisma.groupUser.findFirst({
    where: { groupId, userId: user.id },
  })
  if (!groupUser) return { error: "No access to this group" }

  const memberships = await prisma.groupMembership.findMany({
    where: { groupId },
    include: { organisation: { select: { id: true, name: true } } },
  })

  const orgIds = memberships.map((m) => m.orgId)
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [residentCounts, incidentCounts, openCarePlans, staffCounts] = await Promise.all([
    // Residents per org
    prisma.resident.groupBy({
      by: ["organisationId"],
      where: { organisationId: { in: orgIds }, status: { not: "DISCHARGED" } },
      _count: { _all: true },
    }),
    // Incidents last 30 days per org
    prisma.incident.groupBy({
      by: ["organisationId"],
      where: { organisationId: { in: orgIds }, occurredAt: { gte: thirtyDaysAgo } },
      _count: { _all: true },
    }),
    // Open care plans per org
    prisma.carePlan.groupBy({
      by: ["organisationId"],
      where: { organisationId: { in: orgIds }, status: { in: ["DRAFT", "PENDING_APPROVAL"] } },
      _count: { _all: true },
    }),
    // Active staff per org
    prisma.user.groupBy({
      by: ["organisationId"],
      where: { organisationId: { in: orgIds }, isActive: true },
      _count: { _all: true },
    }),
  ])

  const orgs = memberships.map((m) => {
    const orgId = m.orgId
    return {
      id: orgId,
      name: m.organisation.name,
      residents: residentCounts.find((r) => r.organisationId === orgId)?._count._all ?? 0,
      incidents30d: incidentCounts.find((i) => i.organisationId === orgId)?._count._all ?? 0,
      openCarePlans: openCarePlans.find((c) => c.organisationId === orgId)?._count._all ?? 0,
      activeStaff: staffCounts.find((s) => s.organisationId === orgId)?._count._all ?? 0,
    }
  })

  return { orgs, groupId, myRole: groupUser.role }
}

// ── Add a group user (grant access) ──────────────────────────────────────────

export async function addGroupUser(groupId: string, userId: string, role: "ADMIN" | "VIEWER") {
  const session = await auth()
  const user = session?.user as any
  if (!user || user.role !== "ADMIN") return { error: "Unauthorised" }

  const isOwner = await prisma.groupUser.findFirst({
    where: { groupId, userId: user.id, role: "OWNER" },
  })
  if (!isOwner) return { error: "Only group owners can add users" }

  const existing = await prisma.groupUser.findFirst({
    where: { groupId, userId },
  })
  if (existing) return { error: "User already has access" }

  const entry = await prisma.groupUser.create({
    data: { groupId, userId, role },
  })
  return { entry }
}
