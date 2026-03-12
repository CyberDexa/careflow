import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getStaffMember } from '@/actions/staff'
import { StaffDetailClient } from '@/components/staff/staff-detail-client'

interface Props { params: Promise<{ id: string }> }

export default async function StaffDetailPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect('/login')
  const user = session.user as any
  if (!['MANAGER', 'ADMIN'].includes(user.role)) redirect('/dashboard')

  const result = await getStaffMember(id)
  if ('error' in result) redirect('/staff')

  return (
    <StaffDetailClient
      staffUser={result.staffUser as any}
      currentUserId={user.id}
    />
  )
}
