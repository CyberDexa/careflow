import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { subDays } from 'date-fns'
import { PRNProtocolsClient } from '@/components/emar/prn-protocols-client'

export async function generateMetadata({ params }: { params: Promise<{ residentId: string }> }) {
  const { residentId } = await params
  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
    select: { firstName: true, lastName: true },
  })
  return { title: `PRN Protocols — ${resident?.firstName} ${resident?.lastName}` }
}

export default async function PRNProtocolsPage({
  params,
}: {
  params: Promise<{ residentId: string }>
}) {
  const { residentId } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')
  const user = session.user as any

  const resident = await prisma.resident.findFirst({
    where: { id: residentId, organisationId: user.organisationId, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, roomNumber: true },
  })
  if (!resident) notFound()

  // All active PRN medications for this resident
  const prnMeds = await prisma.medication.findMany({
    where: { residentId, organisationId: user.organisationId, isPRN: true, isActive: true, deletedAt: null },
    orderBy: { name: 'asc' },
  })

  // Last 30 days of PRN administrations
  const since = subDays(new Date(), 30)
  const history = await prisma.medicationAdministration.findMany({
    where: {
      residentId,
      organisationId: user.organisationId,
      medication: { isPRN: true },
      scheduledTime: { gte: since },
    },
    include: {
      medication: { select: { id: true, name: true, dose: true, unit: true } },
      administeredBy: { select: { firstName: true, lastName: true } },
    } as any,
    orderBy: { scheduledTime: 'desc' },
  }) as any[]

  const staff = await prisma.user.findMany({
    where: { organisationId: user.organisationId, isActive: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: 'asc' },
  })

  return (
    <PRNProtocolsClient
      resident={resident}
      prnMeds={prnMeds.map(m => ({
        id: m.id,
        name: m.name,
        dose: m.dose,
        unit: m.unit,
        route: m.route,
        prnIndication: m.prnIndication,
        prnMinIntervalHours: (m as any).prnMinIntervalHours ?? 4,
        currentStock: m.currentStock,
      }))}
      history={history.map(h => ({
        id: h.id,
        medicationId: h.medicationId,
        medicationName: h.medication.name,
        dose: h.medication.dose,
        unit: h.medication.unit,
        scheduledTime: h.scheduledTime.toISOString(),
        administeredAt: h.administeredAt?.toISOString() ?? null,
        status: h.status,
        outcome: h.outcome,
        marCode: (h as any).marCode ?? null,
        painScoreBefore: (h as any).painScoreBefore ?? null,
        painScoreAfter: (h as any).painScoreAfter ?? null,
        administeredBy: `${h.administeredBy.firstName} ${h.administeredBy.lastName}`,
      }))}
      staffList={staff}
      userRole={user.role}
      residentId={residentId}
    />
  )
}
