import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getMedications } from '@/actions/emar'
import { MedicationStockClient } from '@/components/emar/medication-stock-client'
import { format } from 'date-fns'
import NextLink from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Clock } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ residentId: string }> }) {
  const { residentId } = await params
  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
    select: { firstName: true, lastName: true },
  })
  return { title: `Medications — ${resident?.firstName} ${resident?.lastName}` }
}

export default async function MedicationsPage({
  params,
}: {
  params: Promise<{ residentId: string }>
}) {
  const { residentId } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')
  const user = session.user as any

  const [resident, staff] = await Promise.all([
    prisma.resident.findFirst({
      where: { id: residentId, organisationId: user.organisationId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, roomNumber: true, dateOfBirth: true },
    }),
    prisma.user.findMany({
      where: { organisationId: user.organisationId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: 'asc' },
    }),
  ])

  if (!resident) notFound()

  const medications = await getMedications(residentId)

  const activeMeds = medications.filter((m) => m.isActive)
  const controlledMeds = activeMeds.filter((m) => m.isControlled)
  const lowStockMeds = activeMeds.filter((m) => m.currentStock <= m.reorderLevel)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <NextLink href={`/emar/${residentId}`}>
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />Back
            </Button>
          </NextLink>
          <div>
            <h1 className="text-2xl font-bold">Medications</h1>
            <p className="text-muted-foreground text-sm">{resident.firstName} {resident.lastName}</p>
          </div>
        </div>
        <NextLink href={`/emar/${residentId}`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Clock className="h-4 w-4" />eMAR Chart
          </Button>
        </NextLink>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Active Prescriptions</p>
          <p className="text-2xl font-bold">{activeMeds.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Stock Items</p>
          <p className="text-2xl font-bold">{activeMeds.length}</p>
        </div>
        <div className={`rounded-xl border p-4 ${lowStockMeds.length > 0 ? 'border-amber-400/60 bg-amber-500/5' : 'bg-card'}`}>
          <p className="text-xs text-muted-foreground mb-1">Low Stock</p>
          <p className={`text-2xl font-bold ${lowStockMeds.length > 0 ? 'text-amber-500' : ''}`}>{lowStockMeds.length}</p>
        </div>
        <div className={`rounded-xl border p-4 ${controlledMeds.length > 0 ? 'border-red-400/60 bg-red-500/5' : 'bg-card'}`}>
          <p className="text-xs text-muted-foreground mb-1">Controlled Drugs</p>
          <p className={`text-2xl font-bold ${controlledMeds.length > 0 ? 'text-red-500' : ''}`}>{controlledMeds.length}</p>
        </div>
      </div>

      <MedicationStockClient
        residentId={residentId}
        medications={medications as any}
        staffList={staff}
        userRole={user.role}
      />
    </div>
  )
}
