'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { getCDRegister, receiveCDStock } from '@/actions/emar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { Package, Plus, TrendingDown, TrendingUp } from 'lucide-react'

interface CDMedication {
  id: string
  name: string
  dose: string
  unit: string
  currentStock: number
}

interface CDRegisterEntry {
  id: string
  transactionType: string
  quantity: number
  balanceBefore: number
  balanceAfter: number
  notes: string | null
  createdAt: Date | string
}

interface CDRegisterProps {
  medications: CDMedication[]
  staffList?: Array<{ id: string; firstName: string; lastName: string }>
  userRole?: string
}

const TRANSACTION_COLORS: Record<string, string> = {
  ADMINISTERED: 'text-red-600',
  RECEIVED:     'text-green-600',
  RETURNED:     'text-blue-600',
  DESTROYED:    'text-amber-600',
  DISCREPANCY:  'text-red-800',
}

export function CDRegister({ medications, staffList = [], userRole }: CDRegisterProps) {
  const [selectedMedId, setSelectedMedId] = useState(medications[0]?.id ?? '')
  const [entries, setEntries] = useState<CDRegisterEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  // Receive stock form state
  const [quantity, setQuantity] = useState('')
  const [witnessId, setWitnessId] = useState('')
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const selectedMed = medications.find((m) => m.id === selectedMedId)

  const loadEntries = async (medId: string) => {
    setLoading(true)
    try {
      const data = await getCDRegister(medId)
      setEntries(data as CDRegisterEntry[])
    } finally {
      setLoading(false)
    }
  }

  const handleMedChange = (medId: string) => {
    setSelectedMedId(medId)
    loadEntries(medId)
  }

  // Load initial entries for first medication
  useState(() => {
    if (medications[0]?.id) loadEntries(medications[0].id)
  })

  const handleReceiveStock = () => {
    if (!selectedMedId || !quantity || !witnessId) return
    startTransition(async () => {
      await receiveCDStock({
        medicationId: selectedMedId,
        transactionType: 'RECEIVED',
        quantity: parseInt(quantity),
        witnessId,
        notes: notes || undefined,
      })
      setOpen(false)
      setQuantity('')
      setNotes('')
      await loadEntries(selectedMedId)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Medication selector */}
      {medications.length > 1 && (
        <div className="flex items-center gap-2">
          <Label className="shrink-0">Controlled Drug:</Label>
          <Select value={selectedMedId} onValueChange={handleMedChange}>
            <SelectTrigger className="w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {medications.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name} {m.dose} {m.unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedMed && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-destructive" />
                {selectedMed.name} {selectedMed.dose} {selectedMed.unit}
                <Badge variant="destructive">CD</Badge>
              </CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  Current balance: <strong>{selectedMed.currentStock}</strong>
                </span>
                {(userRole === 'MANAGER' || userRole === 'SENIOR_CARER' || userRole === 'ADMIN') && (
                  <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-1" />
                        Receive Stock
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Receive Stock — {selectedMed.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div>
                          <Label>Quantity Received *</Label>
                          <Input
                            type="number"
                            className="mt-1"
                            min={1}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="e.g. 28"
                          />
                        </div>
                        <div>
                          <Label>Witness *</Label>
                          <Select value={witnessId} onValueChange={setWitnessId}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select witness..." />
                            </SelectTrigger>
                            <SelectContent>
                              {staffList.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.firstName} {s.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Notes</Label>
                          <Textarea
                            className="mt-1"
                            placeholder="e.g. Dispensed by City Pharmacy, batch 12345"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                          <Button
                            onClick={handleReceiveStock}
                            disabled={isPending || !quantity || !witnessId}
                          >
                            {isPending ? 'Saving...' : 'Confirm Receipt'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Loading register...</p>
            ) : entries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No entries yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="text-sm w-full">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-2 pr-4">Date / Time</th>
                      <th className="text-left py-2 pr-4">Transaction</th>
                      <th className="text-right py-2 pr-4">Qty</th>
                      <th className="text-right py-2 pr-4">Balance Before</th>
                      <th className="text-right py-2 pr-4">Balance After</th>
                      <th className="text-left py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                          {format(new Date(e.createdAt), 'dd MMM yyyy HH:mm')}
                        </td>
                        <td className={`py-2 pr-4 font-medium ${TRANSACTION_COLORS[e.transactionType] ?? ''}`}>
                          <span className="flex items-center gap-1">
                            {e.transactionType === 'RECEIVED' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {e.transactionType.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-right">{e.quantity}</td>
                        <td className="py-2 pr-4 text-right text-muted-foreground">{e.balanceBefore}</td>
                        <td className="py-2 pr-4 text-right font-medium">{e.balanceAfter}</td>
                        <td className="py-2 text-muted-foreground text-xs">{e.notes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
