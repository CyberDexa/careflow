import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getMedications, getMARGridData } from '@/actions/emar'
import { MedicationList } from '@/components/emar/medication-list'
import { MARGrid } from '@/components/emar/mar-grid'
import { CDRegister } from '@/components/emar/cd-register'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pill, Shield, PackageX, FlaskConical, Link } from 'lucide-react'
import { startOfMonth } from 'date-fns'
import NextLink from 'next/link'

export async function generateMetadata({ params }: { params: Promise<{ residentId: string }> }) {
  const { residentId } = await params
  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
    select: { firstName: true, lastName: true },
  })
  return { title: `eMAR — ${resident?.firstName} ${resident?.lastName}` }
}

export default async function EmarResidentPage({
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
      select: { id: true, firstName: true, lastName: true, roomNumber: true, status: true },
    }),
    prisma.user.findMany({
      where: { organisationId: user.organisationId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: 'asc' },
    }),
  ])

  if (!resident) notFound()

  const now = startOfMonth(new Date())
  const [medications, marData] = await Promise.all([
    getMedications(residentId),
    getMARGridData(residentId, now),
  ])

  const activeMeds = medications.filter((m) => m.isActive)
  const controlledMeds = activeMeds.filter((m) => m.isControlled)
  const prnMeds = activeMeds.filter((m) => m.isPRN)
  const lowStockMeds = activeMeds.filter((m) => m.currentStock <= m.reorderLevel)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">eMAR</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {resident.firstName} {resident.lastName} · Room {resident.roomNumber}
          </p>
        </div>
        {prnMeds.length > 0 && (
          <NextLink href={`/emar/${residentId}/prn-protocols`}>
            <Button variant="outline" size="sm">
              <FlaskConical className="h-4 w-4 mr-1" />PRN Protocols
            </Button>
          </NextLink>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Pill className="h-3.5 w-3.5" />Active Prescriptions
          </div>
          <p className="text-2xl font-bold">{activeMeds.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <FlaskConical className="h-3.5 w-3.5" />PRN Medications
          </div>
          <p className="text-2xl font-bold">{prnMeds.length}</p>
        </div>
        <div className={`rounded-xl border p-4 ${lowStockMeds.length > 0 ? 'border-amber-400/60 bg-amber-500/5' : 'bg-card'}`}>
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <PackageX className="h-3.5 w-3.5" />Low Stock
          </div>
          <p className={`text-2xl font-bold ${lowStockMeds.length > 0 ? 'text-amber-500' : ''}`}>{lowStockMeds.length}</p>
        </div>
        <div className={`rounded-xl border p-4 ${controlledMeds.length > 0 ? 'border-red-400/60 bg-red-500/5' : 'bg-card'}`}>
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Shield className="h-3.5 w-3.5" />Controlled Drugs
          </div>
          <p className={`text-2xl font-bold ${controlledMeds.length > 0 ? 'text-red-500' : ''}`}>{controlledMeds.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="medications">
        <TabsList>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="mar">MAR Chart</TabsTrigger>
          {controlledMeds.length > 0 && (
            <TabsTrigger value="cd-register">CD Register</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="medications" className="mt-4">
          <MedicationList
            residentId={residentId}
            medications={medications as any}
            userRole={user.role}
          />
        </TabsContent>

        <TabsContent value="mar" className="mt-4">
          <MARGrid
            residentId={residentId}
            medications={marData.medications.map((m) => ({
              id: m.id,
              name: m.name,
              dose: m.dose,
              unit: m.unit,
              route: m.route,
              scheduledTimes: m.scheduledTimes as string[],
              isControlled: m.isControlled,
              isPRN: m.isPRN,
              frequency: m.frequency,
            }))}
            administrations={marData.administrations.map((a) => ({
              id: a.id,
              medicationId: a.medicationId,
              status: a.status as any,
              scheduledTime: a.scheduledTime,
              administeredAt: a.administeredAt,
              outcome: a.outcome,
            }))}
            staffList={staff}
          />
        </TabsContent>

        {controlledMeds.length > 0 && (
          <TabsContent value="cd-register" className="mt-4">
            <CDRegister
              medications={controlledMeds.map((m) => ({
                id: m.id,
                name: m.name,
                dose: m.dose,
                unit: m.unit,
                currentStock: m.currentStock,
              }))}
              staffList={staff}
              userRole={user.role}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
