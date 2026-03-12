'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  MoreHorizontal, RefreshCw, Plus, CalendarIcon, Shield, AlertTriangle,
  PackagePlus, Ban, Pill, AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateMedicationStock, discontinueMedication } from '@/actions/emar'

interface Medication {
  id: string
  name: string
  genericName: string | null
  dose: string
  unit: string
  route: string
  frequency: string
  isControlled: boolean
  isPRN: boolean
  isActive: boolean
  currentStock: number
  reorderLevel: number
  batchNumber: string | null
  expiryDate: Date | string | null
  prescribedBy: string | null
  prnIndication: string | null
  startDate: Date | string
  endDate: Date | string | null
}

interface Props {
  residentId: string
  medications: Medication[]
  staffList: Array<{ id: string; firstName: string; lastName: string }>
  userRole: string
}

export function MedicationStockClient({ residentId, medications, staffList, userRole }: Props) {
  const [stockDialog, setStockDialog] = useState<{ id: string; name: string; current: number } | null>(null)
  const [stockAmount, setStockAmount] = useState(0)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const canEdit = ['MANAGER', 'ADMIN', 'SENIOR_CARER'].includes(userRole)

  const activeMeds = medications.filter(m => m.isActive)
  const controlledMeds = activeMeds.filter(m => m.isControlled)
  const lowStockMeds = activeMeds.filter(m => m.currentStock <= m.reorderLevel)
  const expiringMeds = activeMeds.filter(m => {
    if (!m.expiryDate) return false
    const d = new Date(m.expiryDate as string)
    const threeMonths = new Date()
    threeMonths.setMonth(threeMonths.getMonth() + 3)
    return d <= threeMonths
  })

  const handleStockUpdate = () => {
    if (!stockDialog) return
    startTransition(async () => {
      await updateMedicationStock(stockDialog.id, stockDialog.current + stockAmount)
      setStockDialog(null)
      setStockAmount(0)
      router.refresh()
    })
  }

  const handleDiscontinue = (id: string, name: string) => {
    if (!confirm(`Discontinue ${name}? This cannot be undone.`)) return
    startTransition(async () => {
      await discontinueMedication(id)
      router.refresh()
    })
  }

  const MedTable = ({ meds }: { meds: Medication[] }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b bg-muted/20">
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Medication</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Quantity</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Batch</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Expiry</th>
            <th className="px-4 py-3 text-center font-semibold text-muted-foreground w-16">Actions</th>
          </tr>
        </thead>
        <tbody>
          {meds.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-10 text-muted-foreground">
                <Pill className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No medications found
              </td>
            </tr>
          ) : meds.map(med => {
            const lowStock = med.currentStock <= med.reorderLevel
            return (
              <tr key={med.id} className="border-b hover:bg-muted/10 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <Pill className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <div className="font-medium text-blue-600">{med.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {med.dose}{med.unit} • {med.route.replace(/_/g, ' ').charAt(0).toUpperCase() + med.route.replace(/_/g, ' ').slice(1).toLowerCase()}
                      </div>
                      {med.isControlled && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 mt-1">
                          <Shield className="h-2.5 w-2.5 mr-0.5" />CD2
                        </Badge>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={med.isActive ? 'default' : 'secondary'}
                    className={cn('text-xs', med.isActive ? 'bg-green-100 text-green-700 border-green-200' : '')}>
                    {med.isActive ? 'Active' : 'Discontinued'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={cn('font-bold text-base', lowStock ? 'text-amber-500' : '')}>
                    {med.currentStock.toFixed(2)}
                  </span>
                  {lowStock && (
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      <span className="text-[10px] text-amber-500">Low</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-sm">
                  {med.batchNumber ?? '-'}
                </td>
                <td className="px-4 py-3">
                  {med.expiryDate ? (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {format(new Date(med.expiryDate as string), 'dd/MM/yyyy')}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {canEdit ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setStockDialog({ id: med.id, name: med.name, current: med.currentStock })}>
                          <PackagePlus className="h-4 w-4 mr-2" />Receive Stock
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDiscontinue(med.id, med.name)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Ban className="h-4 w-4 mr-2" />Discontinue
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  return (
    <>
      <Tabs defaultValue="stock">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="stock">
              <span className="mr-1.5">🇬🇧</span>UK Stock
            </TabsTrigger>
            <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
            <TabsTrigger value="alerts">
              Alerts
              {(lowStockMeds.length + expiringMeds.length) > 0 && (
                <Badge variant="destructive" className="ml-1.5 text-[10px] px-1 py-0">
                  {lowStockMeds.length + expiringMeds.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="controlled">Controlled Drugs</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.refresh()} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />Refresh
            </Button>
            {canEdit && (
              <Button
                size="sm"
                className="gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white"
                onClick={() => {
                  // Open first active med's stock dialog as "receive stock"
                  const first = activeMeds[0]
                  if (first) setStockDialog({ id: first.id, name: first.name, current: first.currentStock })
                }}
              >
                <Plus className="h-3.5 w-3.5" />Receive Stock
              </Button>
            )}
          </div>
        </div>

        {/* UK Stock tab */}
        <TabsContent value="stock">
          <div className="rounded-lg border bg-card">
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <h2 className="font-semibold">Medication Stock</h2>
              <Badge variant="secondary" className="text-xs">{activeMeds.length} active</Badge>
            </div>
            <MedTable meds={activeMeds} />
          </div>
        </TabsContent>

        {/* Prescriptions tab */}
        <TabsContent value="prescriptions">
          <div className="rounded-lg border bg-card">
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <h2 className="font-semibold">Active Prescriptions</h2>
              <Badge variant="secondary" className="text-xs">{activeMeds.length}</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Medication</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Dose / Route</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Frequency</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Prescribed By</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Start Date</th>
                  </tr>
                </thead>
                <tbody>
                  {activeMeds.map(med => (
                    <tr key={med.id} className="border-b hover:bg-muted/10">
                      <td className="px-4 py-3">
                        <div className="font-medium text-blue-600">{med.name}</div>
                        {med.genericName && <div className="text-xs text-muted-foreground">{med.genericName}</div>}
                        <div className="flex gap-1 mt-0.5">
                          {med.isControlled && <Badge variant="destructive" className="text-[10px] px-1 py-0">CD</Badge>}
                          {med.isPRN && <Badge variant="secondary" className="text-[10px] px-1 py-0">PRN</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{med.dose} {med.unit} · {med.route.replace(/_/g, ' ').toLowerCase()}</td>
                      <td className="px-4 py-3">{med.frequency}</td>
                      <td className="px-4 py-3 text-muted-foreground">{med.prescribedBy ? `Dr. ${med.prescribedBy}` : '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{format(new Date(med.startDate as string), 'dd/MM/yyyy')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Alerts tab */}
        <TabsContent value="alerts">
          <div className="space-y-4">
            {lowStockMeds.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h3 className="font-semibold text-amber-700">Low Stock Alerts</h3>
                  <Badge variant="outline" className="border-amber-300 text-amber-600 text-xs">{lowStockMeds.length}</Badge>
                </div>
                <div className="p-4 space-y-2">
                  {lowStockMeds.map(med => (
                    <div key={med.id} className="flex items-center justify-between py-2 px-3 bg-white rounded border border-amber-100">
                      <div>
                        <span className="font-medium text-sm">{med.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{med.dose} {med.unit}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-amber-600">{med.currentStock} remaining</span>
                        {canEdit && (
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => setStockDialog({ id: med.id, name: med.name, current: med.currentStock })}>
                            Receive
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {expiringMeds.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50/50">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <h3 className="font-semibold text-red-700">Expiring Soon (within 3 months)</h3>
                  <Badge variant="destructive" className="text-xs">{expiringMeds.length}</Badge>
                </div>
                <div className="p-4 space-y-2">
                  {expiringMeds.map(med => (
                    <div key={med.id} className="flex items-center justify-between py-2 px-3 bg-white rounded border border-red-100">
                      <span className="font-medium text-sm">{med.name}</span>
                      <span className="text-sm text-red-600 font-medium">
                        Expires {format(new Date(med.expiryDate as string), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {lowStockMeds.length === 0 && expiringMeds.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No alerts at this time</p>
                <p className="text-sm">All medications are adequately stocked and not expiring soon</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Controlled Drugs tab */}
        <TabsContent value="controlled">
          <div className="rounded-lg border bg-card">
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <Shield className="h-4 w-4 text-destructive" />
              <h2 className="font-semibold">Controlled Drugs</h2>
              <Badge variant="destructive" className="text-xs">{controlledMeds.length}</Badge>
            </div>
            <MedTable meds={controlledMeds} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Receive Stock dialog */}
      <Dialog open={!!stockDialog} onOpenChange={() => { setStockDialog(null); setStockAmount(0) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Receive Stock</DialogTitle>
          </DialogHeader>
          {stockDialog && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <p className="font-semibold">{stockDialog.name}</p>
                <p className="text-muted-foreground">Current stock: <strong>{stockDialog.current}</strong></p>
              </div>
              <div>
                <Label>Quantity to add</Label>
                <Input
                  type="number" min={1}
                  value={stockAmount || ''}
                  onChange={e => setStockAmount(parseInt(e.target.value) || 0)}
                  placeholder="e.g. 28"
                  className="mt-1"
                />
                {stockAmount > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    New total: <strong>{stockDialog.current + stockAmount}</strong>
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setStockDialog(null); setStockAmount(0) }}>Cancel</Button>
                <Button onClick={handleStockUpdate} disabled={isPending || stockAmount <= 0}>
                  {isPending ? 'Saving…' : 'Add Stock'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
