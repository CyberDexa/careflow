'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'

const staffProfileSchema = z.object({
  userId: z.string(),
  jobTitle: z.string().optional(),
  employeeRef: z.string().optional(),
  contractedHours: z.number().min(0).max(168).optional(),
  startDate: z.string().optional(),
  dbs: z.string().optional(),
  dbsExpiry: z.string().optional(),
  phone: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  notes: z.string().optional(),
})

const trainingRecordSchema = z.object({
  staffProfileId: z.string(),
  trainingType: z.string(),
  completedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  certificateUrl: z.string().optional(),
  notes: z.string().optional(),
  isCompleted: z.boolean().optional(),
})

const supervisionSchema = z.object({
  staffProfileId: z.string(),
  supervisorId: z.string(),
  supervisedAt: z.string(),
  nextDueAt: z.string().optional(),
  summary: z.string().optional(),
  actionPoints: z.string().optional(),
})

const rotaShiftSchema = z.object({
  staffProfileId: z.string(),
  date: z.string(),
  shiftType: z.enum(['MORNING', 'AFTERNOON', 'NIGHT']),
  startTime: z.string(),
  endTime: z.string(),
  role: z.string().optional(),
  notes: z.string().optional(),
})

export async function getStaffList() {
  const session = await auth()
  if (!session) return { error: 'Unauthorised' }
  const user = session.user as any

  const staffUsers = await prisma.user.findMany({
    where: { organisationId: user.organisationId, deletedAt: null, isActive: true },
    include: {
      staffProfile: {
        include: {
          trainingRecords: { orderBy: { trainingType: 'asc' } },
          supervisionLogs: { orderBy: { supervisedAt: 'desc' }, take: 1 },
        },
      },
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })

  return { staff: staffUsers }
}

export async function getStaffMember(userId: string) {
  const session = await auth()
  if (!session) return { error: 'Unauthorised' }
  const user = session.user as any

  const staffUser = await prisma.user.findFirst({
    where: { id: userId, organisationId: user.organisationId },
    include: {
      staffProfile: {
        include: {
          trainingRecords: { orderBy: { trainingType: 'asc' } },
          supervisionLogs: { orderBy: { supervisedAt: 'desc' } },
          rotaShifts: {
            where: { date: { gte: new Date(Date.now() - 28 * 86400000) } },
            orderBy: { date: 'asc' },
          },
        },
      },
    },
  })

  if (!staffUser) return { error: 'Staff member not found' }
  return { staffUser }
}

export async function upsertStaffProfile(data: z.infer<typeof staffProfileSchema>) {
  const session = await auth()
  if (!session) return { error: 'Unauthorised' }
  const user = session.user as any
  if (!['MANAGER', 'ADMIN'].includes(user.role)) return { error: 'Unauthorised' }

  const parsed = staffProfileSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const targetUser = await prisma.user.findFirst({
    where: { id: parsed.data.userId, organisationId: user.organisationId },
  })
  if (!targetUser) return { error: 'User not found' }

  const profile = await prisma.staffProfile.upsert({
    where: { userId: parsed.data.userId },
    create: {
      userId: parsed.data.userId,
      organisationId: user.organisationId,
      jobTitle: parsed.data.jobTitle,
      employeeRef: parsed.data.employeeRef,
      contractedHours: parsed.data.contractedHours,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      dbs: parsed.data.dbs,
      dbsExpiry: parsed.data.dbsExpiry ? new Date(parsed.data.dbsExpiry) : undefined,
      phone: parsed.data.phone,
      emergencyName: parsed.data.emergencyName,
      emergencyPhone: parsed.data.emergencyPhone,
      notes: parsed.data.notes,
    },
    update: {
      jobTitle: parsed.data.jobTitle,
      employeeRef: parsed.data.employeeRef,
      contractedHours: parsed.data.contractedHours,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      dbs: parsed.data.dbs,
      dbsExpiry: parsed.data.dbsExpiry ? new Date(parsed.data.dbsExpiry) : undefined,
      phone: parsed.data.phone,
      emergencyName: parsed.data.emergencyName,
      emergencyPhone: parsed.data.emergencyPhone,
      notes: parsed.data.notes,
    },
  })

  revalidatePath('/staff')
  revalidatePath(`/staff/${parsed.data.userId}`)
  return { success: true, profile }
}

export async function upsertTrainingRecord(data: z.infer<typeof trainingRecordSchema>) {
  const session = await auth()
  if (!session) return { error: 'Unauthorised' }
  const user = session.user as any
  if (!['MANAGER', 'ADMIN', 'SENIOR_CARER'].includes(user.role)) return { error: 'Unauthorised' }

  const parsed = trainingRecordSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const existing = await prisma.trainingRecord.findFirst({
    where: {
      staffProfileId: parsed.data.staffProfileId,
      trainingType: parsed.data.trainingType as any,
    },
  })

  const trainingData = {
    trainingType: parsed.data.trainingType as any,
    completedAt: parsed.data.completedAt ? new Date(parsed.data.completedAt) : undefined,
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
    certificateUrl: parsed.data.certificateUrl,
    notes: parsed.data.notes,
    isCompleted: parsed.data.isCompleted ?? false,
  }

  if (existing) {
    await prisma.trainingRecord.update({ where: { id: existing.id }, data: trainingData })
  } else {
    await prisma.trainingRecord.create({
      data: {
        staffProfileId: parsed.data.staffProfileId,
        organisationId: user.organisationId,
        ...trainingData,
      },
    })
  }

  revalidatePath('/staff')
  return { success: true }
}

export async function createSupervisionLog(data: z.infer<typeof supervisionSchema>) {
  const session = await auth()
  if (!session) return { error: 'Unauthorised' }
  const user = session.user as any
  if (!['MANAGER', 'ADMIN'].includes(user.role)) return { error: 'Unauthorised' }

  const parsed = supervisionSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  await prisma.supervisionLog.create({
    data: {
      staffProfileId: parsed.data.staffProfileId,
      organisationId: user.organisationId,
      supervisorId: parsed.data.supervisorId,
      supervisedAt: new Date(parsed.data.supervisedAt),
      nextDueAt: parsed.data.nextDueAt ? new Date(parsed.data.nextDueAt) : undefined,
      summary: parsed.data.summary,
      actionPoints: parsed.data.actionPoints,
    },
  })

  revalidatePath('/staff')
  return { success: true }
}

export async function createRotaShift(data: z.infer<typeof rotaShiftSchema>) {
  const session = await auth()
  if (!session) return { error: 'Unauthorised' }
  const user = session.user as any
  if (!['MANAGER', 'ADMIN'].includes(user.role)) return { error: 'Unauthorised' }

  const parsed = rotaShiftSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Check for conflicts
  const conflicting = await prisma.rotaShift.findFirst({
    where: {
      staffProfileId: parsed.data.staffProfileId,
      date: new Date(parsed.data.date),
      shiftType: parsed.data.shiftType as any,
    },
  })
  if (conflicting) return { error: 'Staff member already has a shift of that type on this date' }

  const shift = await prisma.rotaShift.create({
    data: {
      organisationId: user.organisationId,
      staffProfileId: parsed.data.staffProfileId,
      date: new Date(parsed.data.date),
      shiftType: parsed.data.shiftType as any,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      role: parsed.data.role,
      notes: parsed.data.notes,
    },
  })

  revalidatePath('/staff/rota')
  return { success: true, shift }
}

export async function deleteRotaShift(shiftId: string) {
  const session = await auth()
  if (!session) return { error: 'Unauthorised' }
  const user = session.user as any
  if (!['MANAGER', 'ADMIN'].includes(user.role)) return { error: 'Unauthorised' }

  await prisma.rotaShift.delete({ where: { id: shiftId } })
  revalidatePath('/staff/rota')
  return { success: true }
}

export async function getWeekRota(weekStart: string) {
  const session = await auth()
  if (!session) return { error: 'Unauthorised' }
  const user = session.user as any

  const start = new Date(weekStart)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)

  const shifts = await prisma.rotaShift.findMany({
    where: {
      organisationId: user.organisationId,
      date: { gte: start, lt: end },
    },
    include: {
      staffProfile: {
        include: { user: { select: { firstName: true, lastName: true, role: true } } },
      },
    },
    orderBy: [{ date: 'asc' }, { shiftType: 'asc' }],
  })

  return { shifts }
}

export async function getOrgTrainingCompliance() {
  const session = await auth()
  if (!session) return { error: 'Unauthorised' }
  const user = session.user as any

  const profiles = await prisma.staffProfile.findMany({
    where: { organisationId: user.organisationId },
    include: {
      trainingRecords: true,
      user: { select: { firstName: true, lastName: true, role: true } },
    },
  })

  const TRAINING_TYPES = [
    'MOVING_AND_HANDLING', 'SAFEGUARDING_ADULTS', 'FIRE_SAFETY', 'INFECTION_CONTROL',
    'FIRST_AID', 'FOOD_HYGIENE', 'DEMENTIA_AWARENESS', 'MENTAL_CAPACITY_ACT',
    'MEDICATION_MANAGEMENT', 'DATA_PROTECTION', 'HEALTH_AND_SAFETY', 'EQUALITY_AND_DIVERSITY',
  ]

  const now = new Date()
  const warnDate = new Date(now.getTime() + 30 * 86400000) // 30 days

  const staffCompliance = profiles.map((p) => {
    const completed = p.trainingRecords.filter((r) => r.isCompleted).length
    const expired = p.trainingRecords.filter(
      (r) => r.isCompleted && r.expiresAt && r.expiresAt < now
    ).length
    const expiringSoon = p.trainingRecords.filter(
      (r) => r.isCompleted && r.expiresAt && r.expiresAt >= now && r.expiresAt <= warnDate
    ).length
    return {
      profile: p,
      completed,
      expired,
      expiringSoon,
      total: TRAINING_TYPES.length,
      percent: Math.round((completed / TRAINING_TYPES.length) * 100),
    }
  })

  const orgPercent =
    profiles.length === 0
      ? 0
      : Math.round(
          staffCompliance.reduce((s, c) => s + c.percent, 0) / staffCompliance.length
        )

  return { staffCompliance, orgPercent }
}
