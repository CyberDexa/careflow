import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getResidentRiskProfile } from '@/actions/risk-analytics'
import { RiskProfileDetail } from '@/components/risk-analytics/risk-profile-detail'
import { Activity } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ residentId: string }> }) {
  const { residentId } = await params
  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
    select: { firstName: true, lastName: true },
  })
  return { title: `Risk Profile — ${resident?.firstName} ${resident?.lastName}` }
}

export default async function ResidentRiskPage({
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

  const profile = await getResidentRiskProfile(residentId)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/risk-analytics">
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            Risk Analytics
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">
              {resident.firstName} {resident.lastName}
            </h1>
          </div>
          {resident.roomNumber && (
            <p className="text-muted-foreground text-sm mt-0.5">Room {resident.roomNumber}</p>
          )}
        </div>
      </div>

      <RiskProfileDetail
        residentId={residentId}
        profile={profile as any}
      />
    </div>
  )
}
