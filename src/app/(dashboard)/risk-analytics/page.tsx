import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getOrgRiskDashboard } from '@/actions/risk-analytics'
import { RiskDashboardTable } from '@/components/risk-analytics/risk-dashboard-table'
import { Activity, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export const metadata = { title: 'Risk Analytics' }

export default async function RiskAnalyticsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const user = session.user as any

  if (!['MANAGER', 'ADMIN'].includes(user.role)) {
    redirect('/dashboard')
  }

  const profiles = await getOrgRiskDashboard()

  const highRiskCount = profiles.filter(
    (p) => p.overallRiskLevel === 'HIGH' || p.overallRiskLevel === 'VERY_HIGH'
  ).length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Risk Analytics</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            AI-powered risk scoring across all admitted residents
          </p>
        </div>
        {highRiskCount > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
            <ShieldAlert className="h-4 w-4" />
            {highRiskCount} resident{highRiskCount > 1 ? 's' : ''} HIGH or VERY HIGH risk
          </div>
        )}
      </div>

      <div className="bg-card border rounded-xl p-6">
        <RiskDashboardTable profiles={profiles as any} />
      </div>
    </div>
  )
}
