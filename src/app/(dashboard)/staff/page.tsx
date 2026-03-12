import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getStaffList, getOrgTrainingCompliance } from '@/actions/staff'
import { StaffListClient } from '@/components/staff/staff-list-client'
import { Users } from 'lucide-react'

export default async function StaffPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const user = session.user as any
  if (!['MANAGER', 'ADMIN'].includes(user.role)) redirect('/dashboard')

  const [staffResult, complianceResult] = await Promise.all([
    getStaffList(),
    getOrgTrainingCompliance(),
  ])

  const staff = 'staff' in staffResult ? staffResult.staff : []
  const orgPercent = 'orgPercent' in complianceResult ? (complianceResult.orgPercent ?? 0) : 0

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Users className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500">Training matrix, rotas, and supervision logs</p>
        </div>
      </div>

      <StaffListClient
        initialStaff={staff as any}
        orgTrainingPercent={orgPercent}
      />
    </div>
  )
}
