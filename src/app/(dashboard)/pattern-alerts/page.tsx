import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getPatternAlerts } from '@/actions/pattern-recognition'
import { PatternAlertDashboard } from '@/components/pattern-recognition/pattern-alert-dashboard'
import { Brain } from 'lucide-react'

export default async function PatternAlertsPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const user = session.user as any
  if (!['MANAGER', 'ADMIN'].includes(user.role)) redirect('/dashboard')

  const result = await getPatternAlerts({ status: 'OPEN' })
  const alerts = 'alerts' in result ? result.alerts : []

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Brain className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Pattern Alerts</h1>
              <p className="text-sm text-gray-500">
                AI-identified clinical patterns and emerging risks across all residents
              </p>
            </div>
          </div>
        </div>
      </div>

      <PatternAlertDashboard
        initialAlerts={alerts as unknown as Parameters<typeof PatternAlertDashboard>[0]['initialAlerts']}
        showResidentCol
      />
    </div>
  )
}
