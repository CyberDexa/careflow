'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'
import { startOfMonth } from 'date-fns'

// ─────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────

const pharmacySchema = z.object({
  name: z.string().min(1, 'Pharmacy name is required'),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  accountNumber: z.string().optional(),
  notes: z.string().optional(),
})

const prescriptionOrderSchema = z.object({
  pharmacyId: z.string().min(1),
  orderMonth: z.string().min(1),
  notes: z.string().optional(),
})

// ─────────────────────────────────────────────
// PHARMACY CRUD
// ─────────────────────────────────────────────

export async function getPharmacies() {
  const session = await getServerSession()
  const user = session.user as any

  return prisma.pharmacy.findMany({
    where: { organisationId: user.organisationId, isActive: true },
    orderBy: { name: 'asc' },
  })
}

export async function createPharmacy(data: z.infer<typeof pharmacySchema>) {
  const session = await getServerSession()
  const user = session.user as any
  if (!['MANAGER', 'ADMIN'].includes(user.role)) throw new Error('Insufficient permissions')

  const validated = pharmacySchema.parse(data)
  const pharmacy = await prisma.pharmacy.create({
    data: { ...validated, organisationId: user.organisationId },
  })

  await logAudit({
    organisationId: user.organisationId,
    userId: user.id,
    action: 'CREATE',
    entityType: 'Pharmacy',
    entityId: pharmacy.id,
    after: pharmacy,
  })

  revalidatePath('/pharmacy')
  return { success: true, pharmacy }
}

export async function updatePharmacy(id: string, data: Partial<z.infer<typeof pharmacySchema>>) {
  const session = await getServerSession()
  const user = session.user as any

  const existing = await prisma.pharmacy.findFirst({
    where: { id, organisationId: user.organisationId },
  })
  if (!existing) throw new Error('Pharmacy not found')

  const pharmacy = await prisma.pharmacy.update({ where: { id }, data })

  revalidatePath('/pharmacy')
  return { success: true, pharmacy }
}

// ─────────────────────────────────────────────
// PRESCRIPTION ORDERS
// ─────────────────────────────────────────────

export async function generateMonthlyOrder(data: z.infer<typeof prescriptionOrderSchema>) {
  const session = await getServerSession()
  const user = session.user as any
  if (!['MANAGER', 'ADMIN'].includes(user.role)) throw new Error('Insufficient permissions')

  const validated = prescriptionOrderSchema.parse(data)

  const orderMonth = startOfMonth(new Date(validated.orderMonth))

  // Get all active medications across all admitted residents in the org
  const medications = await prisma.medication.findMany({
    where: {
      organisationId: user.organisationId,
      isActive: true,
      deletedAt: null,
    },
    include: {
      resident: { select: { id: true, firstName: true, lastName: true, status: true } },
    },
  })

  const admittedMeds = medications.filter(m => m.resident.status === 'ADMITTED')

  const lineItems = admittedMeds.map(med => ({
    medicationId: med.id,
    residentId: med.residentId,
    residentName: `${med.resident.firstName} ${med.resident.lastName}`,
    name: med.name,
    genericName: med.genericName,
    dose: `${med.dose} ${med.unit}`,
    frequency: med.frequency,
    route: med.route,
    isControlled: med.isControlled,
    isPRN: med.isPRN,
    quantity: 28, // default 28-day supply
    notes: '',
  }))

  const order = await prisma.prescriptionOrder.create({
    data: {
      organisationId: user.organisationId,
      pharmacyId: validated.pharmacyId,
      createdById: user.id,
      orderMonth,
      lineItems,
      notes: validated.notes,
    },
  })

  await logAudit({
    organisationId: user.organisationId,
    userId: user.id,
    action: 'CREATE',
    entityType: 'PrescriptionOrder',
    entityId: order.id,
    after: { month: orderMonth, lineCount: lineItems.length },
  })

  revalidatePath('/pharmacy')
  return { success: true, order }
}

export async function getPrescriptionOrders() {
  const session = await getServerSession()
  const user = session.user as any

  return prisma.prescriptionOrder.findMany({
    where: {
      organisationId: user.organisationId,
      deletedAt: null,
    },
    include: {
      pharmacy: { select: { name: true, email: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function updateOrderStatus(
  id: string,
  status: 'SUBMITTED' | 'CONFIRMED' | 'DISPENSED' | 'DELIVERED' | 'CANCELLED'
) {
  const session = await getServerSession()
  const user = session.user as any

  const order = await prisma.prescriptionOrder.findFirst({
    where: { id, organisationId: user.organisationId, deletedAt: null },
  })
  if (!order) throw new Error('Order not found')

  const timestampField: Record<string, string> = {
    SUBMITTED: 'submittedAt',
    CONFIRMED: 'confirmedAt',
    DISPENSED: 'dispensedAt',
    DELIVERED: 'deliveredAt',
  }

  await prisma.prescriptionOrder.update({
    where: { id },
    data: {
      status,
      ...(timestampField[status] ? { [timestampField[status]]: new Date() } : {}),
    },
  })

  revalidatePath('/pharmacy')
  return { success: true }
}

export async function updateOrderLineItems(id: string, lineItems: unknown[]) {
  const session = await getServerSession()
  const user = session.user as any

  const order = await prisma.prescriptionOrder.findFirst({
    where: { id, organisationId: user.organisationId, status: 'DRAFT' },
  })
  if (!order) throw new Error('Order not found or already submitted')

  await prisma.prescriptionOrder.update({ where: { id }, data: { lineItems: lineItems as never } })

  revalidatePath('/pharmacy')
  return { success: true }
}

// ─────────────────────────────────────────────
// STOCK ALERTS
// ─────────────────────────────────────────────

export async function checkStockLevels(organisationId: string) {
  const lowStockMeds = await prisma.medication.findMany({
    where: {
      organisationId,
      isActive: true,
      deletedAt: null,
      currentStock: { lte: prisma.medication.fields.reorderLevel as never },
    },
  })

  // Simpler approach: fetch all and filter
  const allMeds = await prisma.medication.findMany({
    where: { organisationId, isActive: true, deletedAt: null },
    include: { resident: { select: { firstName: true, lastName: true } } },
  })

  const alerts = []
  for (const med of allMeds) {
    if (med.currentStock <= med.reorderLevel) {
      const existingAlert = await prisma.stockAlert.findFirst({
        where: { medicationId: med.id, isResolved: false },
      })
      if (!existingAlert) {
        const alert = await prisma.stockAlert.create({
          data: {
            medicationId: med.id,
            organisationId,
            alertType: med.currentStock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
            currentStock: med.currentStock,
            reorderLevel: med.reorderLevel,
          },
        })
        alerts.push(alert)
      }
    }
  }

  return alerts
}

export async function getActiveStockAlerts() {
  const session = await getServerSession()
  const user = session.user as any

  return prisma.stockAlert.findMany({
    where: { organisationId: user.organisationId, isResolved: false },
    include: {
      medication: {
        include: {
          resident: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function resolveStockAlert(id: string) {
  const session = await getServerSession()
  const user = session.user as any

  await prisma.stockAlert.update({
    where: { id },
    data: { isResolved: true, resolvedAt: new Date() },
  })

  revalidatePath('/pharmacy')
  return { success: true }
}
