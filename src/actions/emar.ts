'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'
import { createNotification } from '@/actions/notifications'
import { startOfMonth, endOfMonth, addHours } from 'date-fns'

// ─────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────

const medicationSchema = z.object({
  residentId: z.string().min(1),
  name: z.string().min(1, 'Medication name is required'),
  genericName: z.string().optional(),
  dose: z.string().min(1, 'Dose is required'),
  unit: z.string().min(1, 'Unit is required'),
  route: z.enum([
    'ORAL', 'SUBLINGUAL', 'TOPICAL', 'TRANSDERMAL', 'INHALED',
    'SUBCUTANEOUS', 'INTRAMUSCULAR', 'INTRAVENOUS', 'RECTAL',
    'EYE_DROP', 'EAR_DROP', 'NASAL', 'OTHER',
  ]),
  frequency: z.string().min(1, 'Frequency is required'),
  scheduledTimes: z.array(z.string()).min(1, 'At least one scheduled time required'),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  prescribedBy: z.string().optional(),
  isControlled: z.boolean().default(false),
  isPRN: z.boolean().default(false),
  prnIndication: z.string().optional(),
  prnMinIntervalHours: z.number().int().min(1).default(4),
  currentStock: z.number().int().min(0).default(0),
  reorderLevel: z.number().int().min(1).default(7),
  notes: z.string().optional(),
})

const administrationSchema = z.object({
  medicationId: z.string().min(1),
  residentId: z.string().min(1),
  status: z.enum(['GIVEN', 'REFUSED', 'OMITTED', 'NOT_AVAILABLE']),
  scheduledTime: z.string().min(1),
  administeredAt: z.string().optional(),
  outcome: z.string().optional(),
  witnessId: z.string().optional(),
  marCode: z.enum(['G', 'R', 'S', 'P', 'M', 'H', 'D', 'N', 'L', 'Q', 'O']).optional(),
  roundSlot: z.enum(['MORNING', 'LUNCHTIME', 'TEA_TIME', 'EVENING', 'NIGHT', 'PRN']).optional(),
  painScoreBefore: z.number().int().min(0).max(10).optional(),
  painScoreAfter: z.number().int().min(0).max(10).optional(),
})

const cdRegisterSchema = z.object({
  medicationId: z.string().min(1),
  transactionType: z.enum(['ADMINISTERED', 'RECEIVED', 'RETURNED', 'DESTROYED', 'DISCREPANCY']),
  quantity: z.number().int(),
  witnessId: z.string().min(1),
  notes: z.string().optional(),
})

// ─────────────────────────────────────────────
// MEDICATION CRUD
// ─────────────────────────────────────────────

export async function getMedications(residentId: string) {
  const session = await getServerSession()
  const user = session.user as any

  return prisma.medication.findMany({
    where: {
      residentId,
      organisationId: user.organisationId,
      deletedAt: null,
    },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
  })
}

export async function createMedication(data: z.infer<typeof medicationSchema>) {
  const session = await getServerSession()
  const user = session.user as any

  const validated = medicationSchema.parse(data)

  // Verify resident belongs to org
  const resident = await prisma.resident.findFirst({
    where: { id: validated.residentId, organisationId: user.organisationId },
  })
  if (!resident) throw new Error('Resident not found')

  const medication = await prisma.medication.create({
    data: {
      ...validated,
      organisationId: user.organisationId,
      startDate: new Date(validated.startDate),
      endDate: validated.endDate ? new Date(validated.endDate) : undefined,
    },
  })

  await logAudit({
    organisationId: user.organisationId,
    userId: user.id,
    action: 'CREATE',
    entityType: 'Medication',
    entityId: medication.id,
    after: medication,
  })

  revalidatePath(`/residents/${validated.residentId}`)
  return { success: true, medication }
}

export async function updateMedication(
  id: string,
  data: Partial<z.infer<typeof medicationSchema>>
) {
  const session = await getServerSession()
  const user = session.user as any

  const existing = await prisma.medication.findFirst({
    where: { id, organisationId: user.organisationId, deletedAt: null },
  })
  if (!existing) throw new Error('Medication not found')

  const medication = await prisma.medication.update({
    where: { id },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
  })

  await logAudit({
    organisationId: user.organisationId,
    userId: user.id,
    action: 'UPDATE',
    entityType: 'Medication',
    entityId: id,
    before: existing,
    after: medication,
  })

  revalidatePath(`/residents/${existing.residentId}`)
  return { success: true, medication }
}

export async function updateMedicationStock(id: string, newStock: number) {
  const session = await getServerSession()
  const user = session.user as any

  const existing = await prisma.medication.findFirst({
    where: { id, organisationId: user.organisationId, deletedAt: null },
  })
  if (!existing) throw new Error('Medication not found')

  const medication = await prisma.medication.update({
    where: { id },
    data: { currentStock: newStock },
  })

  await logAudit({
    organisationId: user.organisationId,
    userId: user.id,
    action: 'UPDATE',
    entityType: 'Medication',
    entityId: id,
    before: { currentStock: existing.currentStock },
    after: { currentStock: newStock },
  })

  revalidatePath(`/emar/${existing.residentId}`)
  return { success: true }
}

export async function discontinueMedication(id: string) {
  const session = await getServerSession()
  const user = session.user as any

  const existing = await prisma.medication.findFirst({
    where: { id, organisationId: user.organisationId, deletedAt: null },
  })
  if (!existing) throw new Error('Medication not found')

  const medication = await prisma.medication.update({
    where: { id },
    data: { isActive: false, endDate: new Date() },
  })

  await logAudit({
    organisationId: user.organisationId,
    userId: user.id,
    action: 'UPDATE',
    entityType: 'Medication',
    entityId: id,
    after: { status: 'discontinued' },
  })

  revalidatePath(`/residents/${existing.residentId}`)
  return { success: true }
}

// ─────────────────────────────────────────────
// MAR GRID DATA
// ─────────────────────────────────────────────

export async function getMARGridData(residentId: string, month: Date) {
  const session = await getServerSession()
  const user = session.user as any

  const start = startOfMonth(month)
  const end = endOfMonth(month)

  const [medications, administrations] = await Promise.all([
    prisma.medication.findMany({
      where: {
        residentId,
        organisationId: user.organisationId,
        deletedAt: null,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.medicationAdministration.findMany({
      where: {
        residentId,
        organisationId: user.organisationId,
        scheduledTime: { gte: start, lte: end },
      },
      include: {
        administeredBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { scheduledTime: 'asc' },
    }),
  ])

  return { medications, administrations }
}

export async function getMedicationsDueNow(organisationId: string) {
  const now = new Date()
  const windowStart = new Date(now.getTime() - 30 * 60 * 1000) // -30 min
  const windowEnd = new Date(now.getTime() + 30 * 60 * 1000)   // +30 min

  return prisma.medicationAdministration.findMany({
    where: {
      organisationId,
      scheduledTime: { gte: windowStart, lte: windowEnd },
      status: 'PENDING',
    },
    include: {
      medication: {
        include: { resident: { select: { id: true, firstName: true, lastName: true, roomNumber: true } } },
      },
    },
    orderBy: { scheduledTime: 'asc' },
  })
}

// ─────────────────────────────────────────────
// RECORD ADMINISTRATION
// ─────────────────────────────────────────────

export async function recordAdministration(data: z.infer<typeof administrationSchema>) {
  const session = await getServerSession()
  const user = session.user as any

  const validated = administrationSchema.parse(data)

  const medication = await prisma.medication.findFirst({
    where: { id: validated.medicationId, organisationId: user.organisationId },
  })
  if (!medication) throw new Error('Medication not found')

  // Controlled drug: require witness
  if (medication.isControlled && !validated.witnessId) {
    throw new Error('Controlled drug requires a witness signature')
  }

  const administration = await prisma.medicationAdministration.create({
    data: {
      medicationId: validated.medicationId,
      residentId: validated.residentId,
      organisationId: user.organisationId,
      administeredById: user.id,
      witnessId: validated.witnessId,
      status: validated.status,
      scheduledTime: new Date(validated.scheduledTime),
      administeredAt: validated.status === 'GIVEN' ? new Date(validated.administeredAt ?? Date.now()) : undefined,
      outcome: validated.outcome,
      ...(validated.marCode ? { marCode: validated.marCode as any } : {}),
      ...(validated.roundSlot ? { roundSlot: validated.roundSlot as any } : {}),
      ...(validated.painScoreBefore !== undefined ? { painScoreBefore: validated.painScoreBefore } : {}),
      ...(validated.painScoreAfter !== undefined ? { painScoreAfter: validated.painScoreAfter } : {}),
      prnFollowUpDue: medication.isPRN && validated.status === 'GIVEN'
        ? addHours(new Date(), 1)
        : undefined,
      signedAt: new Date(),
    },
  })

  // Decrement stock on every successful administration
  if (validated.status === 'GIVEN' && medication.currentStock > 0) {
    await prisma.medication.update({
      where: { id: medication.id },
      data: { currentStock: { decrement: 1 } },
    })
  }

  // Update controlled drug register
  if (medication.isControlled && validated.status === 'GIVEN' && validated.witnessId) {
    const lastEntry = await prisma.controlledDrugRegister.findFirst({
      where: { medicationId: medication.id },
      orderBy: { createdAt: 'desc' },
    })
    const balanceBefore = lastEntry?.balanceAfter ?? medication.currentStock

    await prisma.controlledDrugRegister.create({
      data: {
        medicationId: medication.id,
        organisationId: user.organisationId,
        administeredById: user.id,
        witnessId: validated.witnessId,
        transactionType: 'ADMINISTERED',
        quantity: 1,
        balanceBefore,
        balanceAfter: balanceBefore - 1,
      },
    })
  }

  await logAudit({
    organisationId: user.organisationId,
    userId: user.id,
    action: 'CREATE',
    entityType: 'MedicationAdministration',
    entityId: administration.id,
    after: administration,
  })

  revalidatePath(`/residents/${validated.residentId}`)
  revalidatePath('/emar')
  return { success: true, administration }
}

// ─────────────────────────────────────────────
// MISSED DOSE ALERTS
// ─────────────────────────────────────────────

export async function checkAndCreateMissedDoseAlerts(organisationId: string) {
  const now = new Date()
  const cutoff = new Date(now.getTime() - 60 * 60 * 1000) // 1 hour ago

  // Find pending administrations that are past their window
  const missed = await prisma.medicationAdministration.findMany({
    where: {
      organisationId,
      status: 'PENDING',
      scheduledTime: { lt: cutoff },
    },
    include: {
      medication: {
        include: {
          resident: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  })

  for (const admin of missed) {
    await createNotification({
      organisationId,
      type: 'MEDICATION_MISSED',
      title: 'Missed Dose Alert',
      body: `${admin.medication.name} was not administered to ${admin.medication.resident.firstName} ${admin.medication.resident.lastName} (due ${admin.scheduledTime.toLocaleTimeString()})`,
      entityType: 'MedicationAdministration',
      entityId: admin.id,
    })
  }

  return missed.length
}

// ─────────────────────────────────────────────
// PRN FOLLOW-UP
// ─────────────────────────────────────────────

export async function recordPRNFollowUp(administrationId: string, note: string) {
  const session = await getServerSession()
  const user = session.user as any

  const admin = await prisma.medicationAdministration.findFirst({
    where: { id: administrationId, organisationId: user.organisationId },
  })
  if (!admin) throw new Error('Administration record not found')

  await prisma.medicationAdministration.update({
    where: { id: administrationId },
    data: { prnFollowUpNote: note },
  })

  revalidatePath('/emar')
  return { success: true }
}

// ─────────────────────────────────────────────
// CONTROLLED DRUG REGISTER
// ─────────────────────────────────────────────

export async function getCDRegister(medicationId: string) {
  const session = await getServerSession()
  const user = session.user as any

  const medication = await prisma.medication.findFirst({
    where: { id: medicationId, organisationId: user.organisationId },
  })
  if (!medication) throw new Error('Medication not found')

  return prisma.controlledDrugRegister.findMany({
    where: { medicationId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function receiveCDStock(data: z.infer<typeof cdRegisterSchema>) {
  const session = await getServerSession()
  const user = session.user as any

  const validated = cdRegisterSchema.parse(data)

  const medication = await prisma.medication.findFirst({
    where: { id: validated.medicationId, organisationId: user.organisationId },
  })
  if (!medication) throw new Error('Medication not found')

  const lastEntry = await prisma.controlledDrugRegister.findFirst({
    where: { medicationId: medication.id },
    orderBy: { createdAt: 'desc' },
  })
  const balanceBefore = lastEntry?.balanceAfter ?? medication.currentStock

  const entry = await prisma.controlledDrugRegister.create({
    data: {
      medicationId: validated.medicationId,
      organisationId: user.organisationId,
      administeredById: user.id,
      witnessId: validated.witnessId,
      transactionType: validated.transactionType,
      quantity: validated.quantity,
      balanceBefore,
      balanceAfter: balanceBefore + validated.quantity,
      notes: validated.notes,
    },
  })

  // Update medication stock
  await prisma.medication.update({
    where: { id: validated.medicationId },
    data: { currentStock: balanceBefore + validated.quantity },
  })

  revalidatePath('/emar')
  return { success: true, entry }
}

// ─────────────────────────────────────────────
// MONTHLY MEDICATION AUDIT
// ─────────────────────────────────────────────

export async function generateMonthlyAudit(residentId: string, month: Date) {
  const session = await getServerSession()
  const user = session.user as any
  if (!['MANAGER', 'SENIOR_CARER'].includes(user.role)) throw new Error('Insufficient permissions')

  const start = startOfMonth(month)
  const end = endOfMonth(month)

  const administrations = await prisma.medicationAdministration.findMany({
    where: {
      residentId,
      organisationId: user.organisationId,
      scheduledTime: { gte: start, lte: end },
    },
    include: { medication: { select: { name: true, dose: true } } },
  })

  const total = administrations.length
  const given = administrations.filter(a => a.status === 'GIVEN').length
  const refused = administrations.filter(a => a.status === 'REFUSED').length
  const omitted = administrations.filter(a => a.status === 'OMITTED').length
  const notAvailable = administrations.filter(a => a.status === 'NOT_AVAILABLE').length
  const pending = administrations.filter(a => a.status === 'PENDING').length

  const reportData = {
    month: start.toISOString(),
    total,
    given,
    refused,
    omitted,
    notAvailable,
    pending,
    adherenceRate: total > 0 ? Math.round((given / (total - pending)) * 100) : 0,
  }

  // Check if an audit record exists for this month
  const existingAudit = await prisma.medicationAudit.findFirst({
    where: { residentId, organisationId: user.organisationId, auditMonth: start },
  })

  const audit = existingAudit
    ? await prisma.medicationAudit.update({
        where: { id: existingAudit.id },
        data: { reportData, generatedAt: new Date() },
      })
    : await prisma.medicationAudit.create({
        data: {
          residentId,
          organisationId: user.organisationId,
          auditMonth: start,
          reportData,
        },
      })

  return { success: true, audit, reportData }
}
