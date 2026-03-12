import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getWeekRota, getStaffList } from '@/actions/staff'
import { RotaCalendar } from '@/components/staff/rota-calendar'
import { CalendarDays } from 'lucide-react'

export default async function RotaPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const user = session.user as any
  if (!['MANAGER', 'ADMIN'].includes(user.role)) redirect('/dashboard')

  // Default to current week Monday
  const today = new Date()
  const dayOfWeek = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  monday.setHours(0, 0, 0, 0)
  const weekStart = monday.toISOString().split('T')[0]

  const [rotaResult, staffResult] = await Promise.all([
    getWeekRota(weekStart),
    getStaffList(),
  ])

  const shifts = 'shifts' in rotaResult ? rotaResult.shifts : []
  const allStaff = 'staff' in staffResult ? staffResult.staff : []

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <CalendarDays className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rota</h1>
          <p className="text-sm text-gray-500">Weekly rota calendar and shift management</p>
        </div>
      </div>

      <RotaCalendar
        initialShifts={shifts as any}
        allStaff={allStaff as any}
        initialWeekStart={weekStart}
      />
    </div>
  )
}
