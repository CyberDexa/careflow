'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  createPharmacy,
  generateMonthlyOrder,
  updateOrderStatus,
  resolveStockAlert,
} from '@/actions/pharmacy'
import { Building2, Plus, Package, AlertCircle, CheckCircle2, Truck } from 'lucide-react'

interface Pharmacy {
  id: string
  name: string
  contactName: string | null
  phone: string | null
  email: string | null
  address: string | null
  accountNumber: string | null
}

interface StockAlert {
  id: string
  alertType: string
  currentStock: number
  reorderLevel: number
  medication: {
    name: string
    dose: string
    unit: string
    resident: { firstName: string; lastName: string }
  }
}

interface PrescriptionOrder {
  id: string
  status: string
  orderMonth: Date | string
  createdAt: Date | string
  pharmacy: { name: string }
  lineItems: unknown
}

const ORDER_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  DRAFT:      { label: 'Draft',      variant: 'secondary' },
  SUBMITTED:  { label: 'Submitted',  variant: 'outline' },
  CONFIRMED:  { label: 'Confirmed',  variant: 'default' },
  DISPENSED:  { label: 'Dispensed',  variant: 'default' },
  DELIVERED:  { label: 'Delivered',  variant: 'default' },
  CANCELLED:  { label: 'Cancelled',  variant: 'destructive' },
}

const ORDER_NEXT_STATUS: Record<string, string> = {
  DRAFT:     'SUBMITTED',
  SUBMITTED: 'CONFIRMED',
  CONFIRMED: 'DISPENSED',
  DISPENSED: 'DELIVERED',
}

interface PharmacyDashboardProps {
  pharmacies: Pharmacy[]
  orders: PrescriptionOrder[]
  stockAlerts: StockAlert[]
  userRole: string
}

export function PharmacyDashboard({ pharmacies, orders, stockAlerts, userRole }: PharmacyDashboardProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)

  // Add pharmacy form
  const [pharmName, setPharmName] = useState('')
  const [pharmContact, setPharmContact] = useState('')
  const [pharmPhone, setPharmPhone] = useState('')
  const [pharmEmail, setPharmEmail] = useState('')
  const [pharmAddress, setPharmAddress] = useState('')
  const [pharmAccount, setPharmAccount] = useState('')

  // Generate order form
  const [selectedPharmacy, setSelectedPharmacy] = useState(pharmacies[0]?.id ?? '')
  const [orderMonth, setOrderMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })

  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const isManager = ['MANAGER', 'ADMIN'].includes(userRole)

  const handleAddPharmacy = () => {
    if (!pharmName) return
    startTransition(async () => {
      await createPharmacy({
        name: pharmName,
        contactName: pharmContact || undefined,
        phone: pharmPhone || undefined,
        email: pharmEmail || undefined,
        address: pharmAddress || undefined,
        accountNumber: pharmAccount || undefined,
      })
      setAddOpen(false)
      setPharmName('')
      router.refresh()
    })
  }

  const handleGenerateOrder = () => {
    if (!selectedPharmacy) return
    startTransition(async () => {
      await generateMonthlyOrder({ pharmacyId: selectedPharmacy, orderMonth })
      setOrderOpen(false)
      router.refresh()
    })
  }

  const handleUpdateOrderStatus = (orderId: string, status: string) => {
    startTransition(async () => {
      await updateOrderStatus(orderId, status as any)
      router.refresh()
    })
  }

  const handleResolveAlert = (alertId: string) => {
    startTransition(async () => {
      await resolveStockAlert(alertId)
      router.refresh()
    })
  }

  return (
    <div className="space-y-8">
      {/* Stock Alerts */}
      {stockAlerts.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Stock Alerts ({stockAlerts.length})
          </h2>
          <div className="space-y-2">
            {stockAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3"
              >
                <div className="text-sm">
                  <span className="font-medium">
                    {alert.medication.name} {alert.medication.dose} {alert.medication.unit}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    — {alert.medication.resident.firstName} {alert.medication.resident.lastName}
                  </span>
                  <span className="ml-2 text-amber-700">
                    {alert.alertType === 'OUT_OF_STOCK' ? 'Out of stock' : `${alert.currentStock} remaining (reorder at ${alert.reorderLevel})`}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolveAlert(alert.id)}
                  disabled={isPending}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Resolve
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pharmacies */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Linked Pharmacies ({pharmacies.length})
          </h2>
          {isManager && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Pharmacy
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Pharmacy</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div>
                    <Label>Name *</Label>
                    <Input className="mt-1" value={pharmName} onChange={(e) => setPharmName(e.target.value)} placeholder="City Pharmacy" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Contact Name</Label>
                      <Input className="mt-1" value={pharmContact} onChange={(e) => setPharmContact(e.target.value)} />
                    </div>
                    <div>
                      <Label>Account Number</Label>
                      <Input className="mt-1" value={pharmAccount} onChange={(e) => setPharmAccount(e.target.value)} />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input className="mt-1" value={pharmPhone} onChange={(e) => setPharmPhone(e.target.value)} />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" className="mt-1" value={pharmEmail} onChange={(e) => setPharmEmail(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Textarea className="mt-1" rows={2} value={pharmAddress} onChange={(e) => setPharmAddress(e.target.value)} />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddPharmacy} disabled={isPending || !pharmName}>Add</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        {pharmacies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pharmacies linked yet</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {pharmacies.map((p) => (
              <Card key={p.id}>
                <CardContent className="py-4 px-5">
                  <p className="font-medium">{p.name}</p>
                  {p.contactName && <p className="text-sm text-muted-foreground">{p.contactName}</p>}
                  {p.phone && <p className="text-sm text-muted-foreground">{p.phone}</p>}
                  {p.email && <p className="text-sm text-muted-foreground">{p.email}</p>}
                  {p.accountNumber && <p className="text-xs text-muted-foreground mt-1">Acc: {p.accountNumber}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Prescription Orders ({orders.length})
          </h2>
          {isManager && pharmacies.length > 0 && (
            <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Generate Monthly Order
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Monthly Prescription Order</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label>Pharmacy *</Label>
                    <Select value={selectedPharmacy} onValueChange={setSelectedPharmacy}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {pharmacies.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Order Month *</Label>
                    <Input
                      type="date"
                      className="mt-1"
                      value={orderMonth}
                      onChange={(e) => setOrderMonth(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      All active medications for admitted residents will be included automatically.
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOrderOpen(false)}>Cancel</Button>
                    <Button onClick={handleGenerateOrder} disabled={isPending}>
                      {isPending ? 'Generating...' : 'Generate Order'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const cfg = ORDER_STATUS_CONFIG[order.status] ?? { label: order.status, variant: 'secondary' as const }
              const nextStatus = ORDER_NEXT_STATUS[order.status]
              const lineCount = Array.isArray(order.lineItems) ? order.lineItems.length : 0
              return (
                <Card key={order.id}>
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {format(new Date(order.orderMonth), 'MMMM yyyy')}
                          </span>
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {order.pharmacy.name}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {lineCount} medication{lineCount !== 1 ? 's' : ''} · Created {format(new Date(order.createdAt), 'dd MMM yyyy')}
                        </p>
                      </div>
                      {isManager && nextStatus && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateOrderStatus(order.id, nextStatus)}
                          disabled={isPending}
                          className="shrink-0"
                        >
                          {nextStatus === 'DELIVERED' ? (
                            <><Truck className="h-3.5 w-3.5 mr-1" />Mark Delivered</>
                          ) : (
                            <>Mark {ORDER_STATUS_CONFIG[nextStatus]?.label}</>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
