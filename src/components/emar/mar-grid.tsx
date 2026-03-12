'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format, getDaysInMonth, startOfMonth } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { recordAdministration } from '@/actions/emar'
import { CheckCircle2, XCircle, AlertCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react'

type AdministrationStatus = 'GIVEN' | 'REFUSED' | 'OMITTED' | 'NOT_AVAILABLE' | 'PENDING'

interface Medication {
  id: string
  name: string
  dose: string
  unit: string
  route: string
  scheduledTimes: string[]
  isControlled: boolean
  isPRN: boolean
}

interface Administration {
  id: string
  medicationId: string
  status: AdministrationStatus
  scheduledTime: Date | string
  administeredAt: Date | string | null
  outcome: string | null
}

interface MARGridProps {
  residentId: string
  medications: Medication[]
  administrations: Administration[]
  initialMonth?: Date
  staffList?: Array<{ id: string; firstName: string; lastName: string }>
}

const STATUS_CONFIG: Record<AdministrationStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  GIVEN:         { label: 'Given',       color: 'bg-green-500',   icon: CheckCircle2 },
  REFUSED:       { label: 'Refused',     color: 'bg-red-400',     icon: XCircle },
  OMITTED:       { label: 'Omitted',     color: 'bg-amber-400',   icon: AlertCircle },
  NOT_AVAILABLE: { label: 'N/A',         color: 'bg-slate-400',   icon: AlertCircle },
  PENDING:       { label: 'Pending',     color: 'bg-slate-200',   icon: Clock },
}

export function MARGrid({ residentId, medications, administrations, initialMonth, staffList = [] }: MARGridProps) {
  const [currentMonth, setCurrentMonth] = useState(initialMonth ?? startOfMonth(new Date()))
  const [selectedCell, setSelectedCell] = useState<{
    medicationId: string
    scheduledTime: string
    existingAdmin?: Administration
  } | null>(null)
  const [adminStatus, setAdminStatus] = useState<AdministrationStatus>('GIVEN')
  const [adminOutcome, setAdminOutcome] = useState('')
  const [witnessId, setWitnessId] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const daysInMonth = getDaysInMonth(currentMonth)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Build a lookup for fast access: medicationId-dateKey -> status
  const adminLookup = new Map<string, Administration>()
  for (const admin of administrations) {
    const d = new Date(admin.scheduledTime)
    const key = `${admin.medicationId}-${format(d, 'yyyy-MM-dd')}-${format(d, 'HH:mm')}`
    adminLookup.set(key, admin)
  }

  const handleCellClick = (med: Medication, day: number, time: string) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const [h, m] = time.split(':')
    date.setHours(parseInt(h), parseInt(m), 0, 0)
    const key = `${med.id}-${format(date, 'yyyy-MM-dd')}-${time}`
    const existing = adminLookup.get(key)

    setSelectedCell({
      medicationId: med.id,
      scheduledTime: date.toISOString(),
      existingAdmin: existing,
    })
    const existingStatus = existing?.status
    setAdminStatus(
      existingStatus && existingStatus !== 'PENDING' ? existingStatus : 'GIVEN'
    )
    setAdminOutcome(existing?.outcome ?? '')
  }

  const handleRecord = () => {
    if (!selectedCell) return
    startTransition(async () => {
      await recordAdministration({
        medicationId: selectedCell.medicationId,
        residentId,
        status: adminStatus as 'GIVEN' | 'REFUSED' | 'OMITTED' | 'NOT_AVAILABLE',
        scheduledTime: selectedCell.scheduledTime,
        administeredAt: adminStatus === 'GIVEN' ? new Date().toISOString() : undefined,
        outcome: adminOutcome || undefined,
        witnessId: witnessId || undefined,
      })
      setSelectedCell(null)
      router.refresh()
    })
  }

  const selectedMed = selectedCell
    ? medications.find(m => m.id === selectedCell.medicationId)
    : null

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentMonth(prev => {
            const d = new Date(prev)
            d.setMonth(d.getMonth() - 1)
            return startOfMonth(d)
          })}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold">{format(currentMonth, 'MMMM yyyy')} MAR</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentMonth(prev => {
            const d = new Date(prev)
            d.setMonth(d.getMonth() + 1)
            return startOfMonth(d)
          })}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {(Object.entries(STATUS_CONFIG) as [AdministrationStatus, typeof STATUS_CONFIG[AdministrationStatus]][]).map(([status, config]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={cn('h-3 w-3 rounded-sm', config.color)} />
            <span className="text-muted-foreground">{config.label}</span>
          </div>
        ))}
      </div>

      {medications.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No active medications to display</p>
      ) : (
        /* Grid — horizontal scroll for wide tables */
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr>
                <th className="sticky left-0 bg-card z-10 text-left p-2 border-b border-r min-w-[180px]">
                  Medication
                </th>
                <th className="sticky left-[180px] bg-card z-10 p-2 border-b border-r text-left min-w-[60px]">
                  Time
                </th>
                {days.map(d => (
                  <th key={d} className={cn(
                    'p-1 border-b border-r text-center w-7 min-w-[28px]',
                    d === new Date().getDate() &&
                    currentMonth.getMonth() === new Date().getMonth() &&
                    currentMonth.getFullYear() === new Date().getFullYear()
                      ? 'bg-primary/10 font-bold'
                      : ''
                  )}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {medications.map(med =>
                med.scheduledTimes.map((time, timeIdx) => {
                  const isFirstTime = timeIdx === 0
                  return (
                    <tr key={`${med.id}-${time}`} className="hover:bg-muted/30">
                      {isFirstTime ? (
                        <td
                          className="sticky left-0 bg-card z-10 p-2 border-b border-r font-medium"
                          rowSpan={med.scheduledTimes.length}
                        >
                          <div className="flex items-center gap-1">
                            <span>{med.name}</span>
                            {med.isControlled && <Badge variant="destructive" className="text-[10px] px-1 py-0">CD</Badge>}
                            {med.isPRN && <Badge variant="secondary" className="text-[10px] px-1 py-0">PRN</Badge>}
                          </div>
                          <span className="text-muted-foreground font-normal">
                            {med.dose} {med.unit} {med.route.replace(/_/g, ' ')}
                          </span>
                        </td>
                      ) : null}
                      <td className="sticky left-[180px] bg-card z-10 p-2 border-b border-r text-muted-foreground">
                        {time}
                      </td>
                      {days.map(day => {
                        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                        const key = `${med.id}-${format(date, 'yyyy-MM-dd')}-${time}`
                        const admin = adminLookup.get(key)
                        const config = admin ? STATUS_CONFIG[admin.status] : null
                        const isFuture = date > new Date()

                        return (
                          <td
                            key={day}
                            className={cn(
                              'border-b border-r text-center cursor-pointer transition-opacity p-0.5',
                              isFuture ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-80'
                            )}
                            onClick={() => !isFuture && handleCellClick(med, day, time)}
                          >
                            {config ? (
                              <div className={cn('h-5 w-5 rounded-sm mx-auto', config.color)} title={config.label} />
                            ) : (
                              <div className="h-5 w-5 rounded-sm mx-auto border border-dashed border-muted-foreground/30" />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Administration Dialog */}
      <Dialog open={!!selectedCell} onOpenChange={() => setSelectedCell(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Administration</DialogTitle>
          </DialogHeader>
          {selectedMed && selectedCell && (
            <div className="space-y-4 py-2">
              <div className="text-sm bg-muted rounded p-3">
                <p className="font-medium">{selectedMed.name}</p>
                <p className="text-muted-foreground">
                  {selectedMed.dose} {selectedMed.unit} — {selectedMed.route.replace(/_/g, ' ')}
                </p>
                <p className="text-muted-foreground">
                  Scheduled: {format(new Date(selectedCell.scheduledTime), 'dd MMM yyyy HH:mm')}
                </p>
              </div>

              <div>
                <Label>Administration Status</Label>
                <Select value={adminStatus} onValueChange={(v) => setAdminStatus(v as AdministrationStatus)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GIVEN">✓ Given</SelectItem>
                    <SelectItem value="REFUSED">✗ Refused by resident</SelectItem>
                    <SelectItem value="OMITTED">⚠ Omitted</SelectItem>
                    <SelectItem value="NOT_AVAILABLE">— Not available</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {adminStatus !== 'GIVEN' && (
                <div>
                  <Label>Reason / Notes *</Label>
                  <Textarea
                    className="mt-1"
                    placeholder="Enter reason..."
                    value={adminOutcome}
                    onChange={(e) => setAdminOutcome(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {selectedMed.isControlled && adminStatus === 'GIVEN' && (
                <div>
                  <Label>Witness Signature *</Label>
                  <Select value={witnessId} onValueChange={setWitnessId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select witness..." />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.firstName} {s.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Required for controlled drug administration</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedCell(null)}>Cancel</Button>
                <Button
                  onClick={handleRecord}
                  disabled={isPending || (adminStatus !== 'GIVEN' && !adminOutcome) || (selectedMed.isControlled && adminStatus === 'GIVEN' && !witnessId)}
                >
                  {isPending ? 'Saving...' : 'Record'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
