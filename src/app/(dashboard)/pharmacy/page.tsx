import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getPharmacies, getPrescriptionOrders, getActiveStockAlerts } from '@/actions/pharmacy'
import { PharmacyDashboard } from '@/components/pharmacy/pharmacy-dashboard'
import { Building2 } from 'lucide-react'

export const metadata = { title: 'Pharmacy' }

export default async function PharmacyPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const user = session.user as any

  const [pharmacies, orders, stockAlerts] = await Promise.all([
    getPharmacies(),
    getPrescriptionOrders(),
    getActiveStockAlerts(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Pharmacy</h1>
        </div>
        <p className="text-muted-foreground text-sm mt-0.5">
          Prescription orders, linked pharmacies, and stock alerts
        </p>
      </div>

      <PharmacyDashboard
        pharmacies={pharmacies}
        orders={orders as any}
        stockAlerts={stockAlerts as any}
        userRole={user.role}
      />
    </div>
  )
}
