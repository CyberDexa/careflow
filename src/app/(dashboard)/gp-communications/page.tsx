import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getGPCommunications, getOverdueFollowUps } from '@/actions/gp-communications'
import { GPCommList } from '@/components/gp-communications/gp-comm-list'
import { NewGPCommForm } from '@/components/gp-communications/new-gp-comm-form'
import { Stethoscope } from 'lucide-react'

export const metadata = { title: 'GP Communications' }

export default async function GPCommunicationsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const user = session.user as any

  const [communications, overdue, residents] = await Promise.all([
    getGPCommunications(),
    getOverdueFollowUps(),
    prisma.resident.findMany({
      where: { organisationId: user.organisationId, status: 'ADMITTED', deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { lastName: 'asc' },
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">GP Communications</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            {communications.length} communication{communications.length !== 1 ? 's' : ''}
            {overdue.length > 0 ? ` · ${overdue.length} overdue` : ''}
          </p>
        </div>
        <NewGPCommForm residents={residents} />
      </div>

      <GPCommList
        communications={communications as any}
        userRole={user.role}
        overdueCount={overdue.length}
      />
    </div>
  )
}
