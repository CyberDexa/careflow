import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getComplianceOverview, getMockInspectionReports } from '@/actions/inspection-readiness'
import { prisma } from '@/lib/prisma'
import { InspectionDashboard } from '@/components/inspection/inspection-dashboard'
import { MockReportViewer } from '@/components/inspection/mock-report-viewer'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { ClipboardCheck, FileText } from 'lucide-react'

export default async function InspectionPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const user = session.user as any
  if (!['MANAGER', 'ADMIN'].includes(user.role)) redirect('/dashboard')

  const [overviewResult, reportsResult, org] = await Promise.all([
    getComplianceOverview(),
    getMockInspectionReports(),
    prisma.organisation.findUnique({
      where: { id: user.organisationId },
      select: { name: true, regulatoryBody: true },
    }),
  ])

  const domainGroups =
    'domainGroups' in overviewResult ? (overviewResult.domainGroups as Record<string, unknown[]>) : {}
  const body: string =
    'body' in overviewResult ? (overviewResult.body as string) : 'CQC'
  const totalStandards: number =
    'totalStandards' in overviewResult ? (overviewResult.totalStandards as number) : 0
  const reports = 'reports' in reportsResult ? reportsResult.reports : []

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <ClipboardCheck className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inspection Readiness</h1>
          <p className="text-sm text-gray-500">
            Real-time compliance mapping against{' '}
            {body === 'CQC' ? 'CQC KLOEs' : 'Care Inspectorate Quality Framework'} standards
          </p>
        </div>
      </div>

      <Tabs defaultValue="compliance">
        <TabsList>
          <TabsTrigger value="compliance" className="gap-1.5">
            <ClipboardCheck className="h-4 w-4" />
            KLOE Compliance
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Mock Inspection Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compliance" className="mt-4">
          <InspectionDashboard
            initialDomainGroups={domainGroups as Parameters<typeof InspectionDashboard>[0]['initialDomainGroups']}
            initialBody={body}
            totalStandards={totalStandards}
          />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <MockReportViewer
            initialReports={reports as unknown as Parameters<typeof MockReportViewer>[0]['initialReports']}
            orgName={org?.name || 'Care Home'}
            currentBody={(org?.regulatoryBody || 'CQC') as string}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
