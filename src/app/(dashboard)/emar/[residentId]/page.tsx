import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getMedications, getMARGridData } from '@/actions/emar'
import { MedicationList } from '@/components/emar/medication-list'
import { MARGrid } from '@/components/emar/mar-grid'
import { CDRegister } from '@/components/emar/cd-register'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Pill } from 'lucide-react'
import { startOfMonth } from 'date-fns'

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">eMAR</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {resident.firstName} {resident.lastName} · Room {resident.roomNumber}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{activeMeds.length} active med{activeMeds.length !== 1 ? 's' : ''}</Badge>
          {controlledMeds.length > 0 && (
            <Badge variant="destructive">{controlledMeds.length} CD</Badge>
          )}
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
            medications={medications}
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
