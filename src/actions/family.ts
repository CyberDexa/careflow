'use server'

import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/auth-helpers'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'

// ─────────────────────────────────────────────
// FAMILY USER MANAGEMENT (staff side)
// ─────────────────────────────────────────────

export async function getFamilyUsers(residentId?: string) {
  const session = await getServerSession()
  const user = session.user as any
  const where = residentId
    ? { organisationId: user.organisationId, residentId, deletedAt: null }
    : { organisationId: user.organisationId, deletedAt: null }

  return prisma.familyUser.findMany({
    where,
    include: { resident: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function inviteFamilyUser(data: {
  residentId: string
  email: string
  firstName: string
  lastName: string
  relationship: string
  phone?: string
}) {
  const session = await getServerSession()
  const user = session.user as any

  // Verify resident belongs to org
  const resident = await prisma.resident.findFirst({
    where: { id: data.residentId, organisationId: user.organisationId, deletedAt: null },
  })
  if (!resident) throw new Error('Resident not found')

  // Check if email already has a family account
  const existing = await prisma.familyUser.findUnique({ where: { email: data.email } })
  if (existing) throw new Error('A family account with this email already exists')

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const familyUser = await prisma.familyUser.create({
    data: {
      residentId: data.residentId,
      organisationId: user.organisationId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      relationship: data.relationship,
      phone: data.phone,
      inviteToken: token,
      inviteExpiresAt: expiresAt,
    },
  })

  revalidatePath(`/residents/${data.residentId}`)
  revalidatePath('/family-management')

  // In production: send invite email via Resend
  // For now: return the invite link so staff can share manually
  return {
    familyUser,
    inviteLink: `/family/accept-invite?token=${token}`,
  }
}

export async function deactivateFamilyUser(familyUserId: string) {
  const session = await getServerSession()
  const user = session.user as any

  await prisma.familyUser.updateMany({
    where: { id: familyUserId, organisationId: user.organisationId },
    data: { isActive: false },
  })

  revalidatePath('/family-management')
}

export async function reactivateFamilyUser(familyUserId: string) {
  const session = await getServerSession()
  const user = session.user as any

  await prisma.familyUser.updateMany({
    where: { id: familyUserId, organisationId: user.organisationId },
    data: { isActive: true },
  })

  revalidatePath('/family-management')
}

// ─────────────────────────────────────────────
// INVITE ACCEPTANCE (family side — no auth required)
// ─────────────────────────────────────────────

export async function getFamilyInvite(token: string) {
  return prisma.familyUser.findFirst({
    where: {
      inviteToken: token,
      inviteAcceptedAt: null,
      inviteExpiresAt: { gt: new Date() },
      deletedAt: null,
    },
    include: {
      resident: { select: { firstName: true, lastName: true } },
    },
  })
}

export async function acceptFamilyInvite(token: string, password: string) {
  const familyUser = await prisma.familyUser.findFirst({
    where: {
      inviteToken: token,
      inviteAcceptedAt: null,
      inviteExpiresAt: { gt: new Date() },
    },
  })
  if (!familyUser) throw new Error('Invalid or expired invite link')

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.familyUser.update({
    where: { id: familyUser.id },
    data: {
      passwordHash,
      inviteAcceptedAt: new Date(),
      inviteToken: null,
      inviteExpiresAt: null,
    },
  })

  return familyUser
}

// ─────────────────────────────────────────────
// WELLBEING UPDATES (staff side)
// ─────────────────────────────────────────────

export async function createWellbeingUpdate(data: {
  residentId: string
  mood: string
  appetite: string
  sleep: string
  activityLevel: string
  note?: string
  photoUrls?: string[]
}) {
  const session = await getServerSession()
  const user = session.user as any

  const resident = await prisma.resident.findFirst({
    where: { id: data.residentId, organisationId: user.organisationId, deletedAt: null },
  })
  if (!resident) throw new Error('Resident not found')

  const update = await prisma.wellbeingUpdate.create({
    data: {
      residentId: data.residentId,
      organisationId: user.organisationId,
      createdById: user.id,
      mood: data.mood as any,
      appetite: data.appetite as any,
      sleep: data.sleep as any,
      activityLevel: data.activityLevel as any,
      note: data.note,
      photoUrls: data.photoUrls ?? [],
      isPublished: true,
      publishedAt: new Date(),
    },
  })

  revalidatePath(`/residents/${data.residentId}`)
  return update
}

export async function getWellbeingUpdates(residentId: string, limitDays = 30) {
  const session = await getServerSession()
  const user = session.user as any

  const since = new Date()
  since.setDate(since.getDate() - limitDays)

  return prisma.wellbeingUpdate.findMany({
    where: {
      residentId,
      organisationId: user.organisationId,
      createdAt: { gte: since },
    },
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// ─────────────────────────────────────────────
// WELLBEING UPDATES (family portal — no staff session)
// ─────────────────────────────────────────────

export async function getWellbeingUpdatesForFamily(residentId: string, organisationId: string) {
  const since = new Date()
  since.setDate(since.getDate() - 30)

  return prisma.wellbeingUpdate.findMany({
    where: {
      residentId,
      organisationId,
      isPublished: true,
      createdAt: { gte: since },
    },
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// ─────────────────────────────────────────────
// MESSAGING (staff side)
// ─────────────────────────────────────────────

export async function sendMessageToFamily(data: {
  residentId: string
  body: string
  subject?: string
}) {
  const session = await getServerSession()
  const user = session.user as any

  const resident = await prisma.resident.findFirst({
    where: { id: data.residentId, organisationId: user.organisationId, deletedAt: null },
  })
  if (!resident) throw new Error('Resident not found')

  const message = await prisma.familyMessage.create({
    data: {
      residentId: data.residentId,
      organisationId: user.organisationId,
      fromStaffId: user.id,
      subject: data.subject,
      body: data.body,
    },
  })

  revalidatePath(`/residents/${data.residentId}/messages`)
  revalidatePath('/family-management')
  return message
}

export async function getMessagesForResident(residentId: string) {
  const session = await getServerSession()
  const user = session.user as any

  return prisma.familyMessage.findMany({
    where: { residentId, organisationId: user.organisationId },
    include: {
      fromFamilyUser: { select: { firstName: true, lastName: true, relationship: true } },
      fromStaff: { select: { firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function markMessagesRead(residentId: string) {
  const session = await getServerSession()
  const user = session.user as any

  // Mark messages from family as read (staff is reading them)
  await prisma.familyMessage.updateMany({
    where: {
      residentId,
      organisationId: user.organisationId,
      fromFamilyUserId: { not: null },
      isRead: false,
    },
    data: { isRead: true, readAt: new Date() },
  })

  revalidatePath('/family-management')
}

// ─────────────────────────────────────────────
// MESSAGING (family portal side)
// ─────────────────────────────────────────────

export async function sendMessageFromFamily(data: {
  residentId: string
  organisationId: string
  fromFamilyUserId: string
  body: string
  subject?: string
}) {
  const message = await prisma.familyMessage.create({
    data: {
      residentId: data.residentId,
      organisationId: data.organisationId,
      fromFamilyUserId: data.fromFamilyUserId,
      subject: data.subject,
      body: data.body,
    },
  })

  // Create in-app notification for staff
  await prisma.notification.create({
    data: {
      organisationId: data.organisationId,
      type: 'FAMILY_MESSAGE',
      title: 'New message from family',
      body: `A family member has sent a message. ${data.subject ? `Subject: ${data.subject}` : ''}`,
      entityType: 'FamilyMessage',
      entityId: message.id,
    },
  })

  return message
}

export async function getMessagesForFamilyUser(residentId: string, organisationId: string) {
  return prisma.familyMessage.findMany({
    where: { residentId, organisationId },
    include: {
      fromFamilyUser: { select: { firstName: true, lastName: true, relationship: true } },
      fromStaff: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// ─────────────────────────────────────────────
// FAMILY DATA READ (family portal side)
// ─────────────────────────────────────────────

export async function getResidentSummaryForFamily(residentId: string, organisationId: string) {
  return prisma.resident.findFirst({
    where: { id: residentId, organisationId, deletedAt: null },
    select: {
      id: true,
      firstName: true,
      preferredName: true,
      lastName: true,
      photoUrl: true,
      roomNumber: true,
      admissionDate: true,
    },
  })
}

export async function getCarePlansForFamily(residentId: string, organisationId: string) {
  return prisma.carePlan.findMany({
    where: {
      residentId,
      organisationId,
      status: 'ACTIVE',
      deletedAt: null,
    },
    select: {
      id: true,
      category: true,
      needsAssessment: true,
      goals: true,
      reviewDate: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  })
}
