'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  format, startOfWeek, endOfWeek, addWeeks, subWeeks,
  eachDayOfInterval, isSameDay, isAfter, isBefore, startOfDay,
} from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { recordAdministration } from '@/actions/emar'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'

// ─── UK MAR Code definitions ─────────────────────────────────────────────────
const MAR_CODES = {
  G: { label: 'Given',          color: 'bg-green-600 text-white',   ring: 'ring-green-500' },
  R: { label: 'Refused',        color: 'bg-red-500 text-white',     ring: 'ring-red-400' },
  S: { label: 'Sleeping',       color: 'bg-blue-400 text-white',    ring: 'ring-blue-300' },
  P: { label: 'Pulse abnormal', color: 'bg-orange-500 text-white',  ring: 'ring-orange-400' },
  M: { label: 'Self-admin',     color: 'bg-purple-500 text-white',  ring: 'ring-purple-400' },
  H: { label: 'Hospitalised',   color: 'bg-gray-600 text-white',    ring: 'ring-gray-500' },
  D: { label: 'Destroyed',      color: 'bg-gray-800 text-white',    ring: 'ring-gray-700' },
  N: { label: 'Nausea',         color: 'bg-yellow-600 text-white',  ring: 'ring-yellow-500' },
  L: { label: 'On Leave',       color: 'bg-cyan-500 text-white',    ring: 'ring-cyan-400' },
  Q: { label: 'Not required',   color: 'bg-slate-400 text-white',   ring: 'ring-slate-300' },
  O: { label: 'Other',          color: 'bg-pink-500 text-white',    ring: 'ring-pink-400' },
} as const

type MARCode = keyof typeof MAR_CODES

// ─── Round slots ──────────────────────────────────────────────────────────────
const ROUND_SLOTS = [
  { key: 'morning',   label: 'AM',    hour: 8  },
  { key: 'lunchtime', label: 'Lunch', hour: 12 },
  { key: 'tea_time',  label: 'Tea',   hour: 15 },
  { key: 'evening',   label: 'Eve',   hour: 18 },
  { key: 'night',     label: 'Night', hour: 22 },
  { key: 'prn',       label: 'PRN',   hour: 10 },
] as const

type RoundSlotKey = typeof ROUND_SLOTS[number]['key']

// Map frequency string → which round slots it appears in
function getRoundsForFrequency(frequency: string): RoundSlotKey[] {
  const f = frequency.toLowerCase()
  if (f.includes('prn') || f.includes('as required')) return ['prn']
  if (f.includes('four times') || f.includes('qds') || f.includes('every 6')) return ['morning', 'lunchtime', 'tea_time', 'night']
  if (f.includes('three times') || f.includes('tds')) return ['morning', 'lunchtime', 'evening']
  if (f.includes('twice') || f.includes('bd') || f.includes('every 12')) return ['morning', 'evening']
  if (f.includes('night') || f.includes('nocte')) return ['night']
  if (f.includes('morning') || f.includes('mane')) return ['morning']
  if (f.includes('every 8')) return ['morning', 'tea_time', 'night']
  if (f.includes('every 4')) return ['morning', 'lunchtime', 'tea_time', 'evening', 'night']
  return ['morning'] // once daily default
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Medication {
  id: string
  name: string
  dose: string
  unit: string
  route: string
  frequency: string
  scheduledTimes: string[]
  isControlled: boolean
  isPRN: boolean
}

interface Administration {
  id: string
  medicationId: string
  status: string
  scheduledTime: Date | string
  administeredAt: Date | string | null
  outcome: string | null
  marCode?: string | null
  roundSlot?: string | null
}

interface MARGridProps {
  residentId: string
  medications: Medication[]
  administrations: Administration[]
  staffList?: Array<{ id: string; firstName: string; lastName: string }>
}

// ─── Pill cell ────────────────────────────────────────────────────────────────
function MARCell({
  marCode,
  status,
  isFuture,
  isToday,
  onClick,
}: {
  marCode?: string | null
  status?: string | null
  isFuture: boolean
  isToday: boolean
  onClick: () => void
}) {
  const code = marCode as MARCode | undefined
  const config = code ? MAR_CODES[code] : null

  // Legacy status fallback for entries without a MAR code
  const legacyColor =
    !config && status === 'GIVEN' ? 'bg-green-600 text-white' :
    !config && status === 'REFUSED' ? 'bg-red-500 text-white' :
    !config && status === 'OMITTED' ? 'bg-amber-500 text-white' :
    !config && status === 'NOT_AVAILABLE' ? 'bg-slate-400 text-white' : null

  const cellColor = config ? config.color : legacyColor

  return (
    <button
      type="button"
      disabled={isFuture}
      onClick={onClick}
      className={cn(
        'h-8 w-8 rounded-md text-[11px] font-bold border transition-all select-none',
        isToday ? 'ring-2 ring-primary/50' : '',
        isFuture ? 'opacity-25 cursor-not-allowed border-dashed border-muted-foreground/20 bg-transparent' : 'cursor-pointer hover:ring-2 hover:ring-primary/60',
        cellColor ?? 'bg-muted/40 border-muted-foreground/20 text-muted-foreground hover:bg-muted',
      )}
      title={config ? `${code} — ${config.label}` : status ?? 'Not recorded'}
    >
      {code ?? (status === 'GIVEN' ? 'G' : status === 'REFUSED' ? 'R' : '')}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function MARGrid({ residentId, medications, administrations, staffList = [] }: MARGridProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedCell, setSelectedCell] = useState<{
    medicationId: string
    roundSlot: RoundSlotKey
    date: Date
    existing?: Administration
  } | null>(null)
  const [marCode, setMarCode] = useState<MARCode>('G')
  const [painBefore, setPainBefore] = useState<string>('')
  const [painAfter, setPainAfter] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [witnessId, setWitnessId] = useState('')
  const [showLegend, setShowLegend] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) })
  const today = startOfDay(new Date())

  // Build lookup: medicationId + roundSlot + dateKey → Administration
  const adminLookup = new Map<string, Administration>()
  for (const admin of administrations) {
    const d = new Date(admin.scheduledTime)
    const dateKey = format(d, 'yyyy-MM-dd')
    const slot = admin.roundSlot?.toLowerCase() ?? 'morning'
    adminLookup.set(`${admin.medicationId}-${slot}-${dateKey}`, admin)
  }

  const openCell = (med: Medication, slot: RoundSlotKey, day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd')
    const existing = adminLookup.get(`${med.id}-${slot}-${dateKey}`)
    setSelectedCell({ medicationId: med.id, roundSlot: slot, date: day, existing })
    setMarCode((existing?.marCode as MARCode) ?? 'G')
    setPainBefore(existing ? String((existing as any).painScoreBefore ?? '') : '')
    setPainAfter('')
    setNotes(existing?.outcome ?? '')
    setWitnessId('')
  }

  const handleRecord = () => {
    if (!selectedCell) return
    const slotConfig = ROUND_SLOTS.find(s => s.key === selectedCell.roundSlot)!
    const scheduledTime = new Date(selectedCell.date)
    scheduledTime.setHours(slotConfig.hour, 0, 0, 0)

    startTransition(async () => {
      await recordAdministration({
        medicationId: selectedCell.medicationId,
        residentId,
        status: marCode === 'G' ? 'GIVEN' : marCode === 'R' ? 'REFUSED' : marCode === 'H' || marCode === 'D' ? 'NOT_AVAILABLE' : 'OMITTED',
        scheduledTime: scheduledTime.toISOString(),
        administeredAt: marCode === 'G' ? new Date().toISOString() : undefined,
        outcome: notes || undefined,
        witnessId: witnessId || undefined,
        marCode,
        roundSlot: selectedCell.roundSlot.toUpperCase() as any,
        painScoreBefore: painBefore ? parseInt(painBefore) : undefined,
        painScoreAfter: painAfter ? parseInt(painAfter) : undefined,
      } as any)
      setSelectedCell(null)
      router.refresh()
    })
  }

  const selectedMed = selectedCell ? medications.find(m => m.id === selectedCell.medicationId) : null

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setWeekStart(w => startOfWeek(subWeeks(w, 1), { weekStartsOn: 1 }))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="font-semibold text-sm">
            {format(weekStart, 'dd MMM')} – {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'dd MMM yyyy')}
          </p>
          <p className="text-xs text-muted-foreground">Weekly MAR Chart</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setWeekStart(w => startOfWeek(addWeeks(w, 1), { weekStartsOn: 1 }))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend toggle */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setShowLegend(v => !v)}>
          <Info className="h-3.5 w-3.5 mr-1" />{showLegend ? 'Hide' : 'Show'} MAR code legend
        </Button>
      </div>
      {showLegend && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 p-3 rounded-lg border bg-muted/30">
          {(Object.entries(MAR_CODES) as [MARCode, typeof MAR_CODES[MARCode]][]).map(([code, cfg]) => (
            <div key={code} className="flex items-center gap-2">
              <span className={cn('h-6 w-6 rounded text-[11px] font-bold flex items-center justify-center shrink-0', cfg.color)}>{code}</span>
              <span className="text-xs text-muted-foreground leading-tight">{cfg.label}</span>
            </div>
          ))}
        </div>
      )}

      {medications.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No active medications to display</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="text-xs border-collapse w-full min-w-[560px]">
            <thead>
              <tr className="bg-muted/50">
                <th className="sticky left-0 z-10 bg-muted/50 text-left px-3 py-2 border-r min-w-[160px] font-medium">Medication</th>
                <th className="px-2 py-2 border-r text-center font-medium text-muted-foreground w-14">Round</th>
                {weekDays.map(day => (
                  <th key={day.toISOString()} className={cn(
                    'px-1 py-2 text-center border-r min-w-[40px] font-medium',
                    isSameDay(day, today) ? 'bg-primary/10' : '',
                  )}>
                    <div className={cn('text-[10px] text-muted-foreground', isSameDay(day, today) ? 'text-primary font-semibold' : '')}>
                      {format(day, 'EEE')}
                    </div>
                    <div className={cn('font-semibold', isSameDay(day, today) ? 'text-primary' : '')}>
                      {format(day, 'd')}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {medications.map(med => {
                const rounds = getRoundsForFrequency(med.frequency)
                return rounds.map((slotKey, slotIdx) => {
                  const slot = ROUND_SLOTS.find(s => s.key === slotKey)!
                  const isFirstSlot = slotIdx === 0
                  return (
                    <tr key={`${med.id}-${slotKey}`} className="hover:bg-muted/20 border-t">
                      {isFirstSlot && (
                        <td
                          className="sticky left-0 z-10 bg-card px-3 py-2 border-r align-top"
                          rowSpan={rounds.length}
                        >
                          <div className="flex items-start gap-1 flex-wrap">
                            <span className="font-semibold leading-tight">{med.name}</span>
                            {med.isControlled && <Badge variant="destructive" className="text-[9px] px-1 py-0 leading-tight">CD</Badge>}
                            {med.isPRN && <Badge variant="secondary" className="text-[9px] px-1 py-0 leading-tight">PRN</Badge>}
                          </div>
                          <p className="text-muted-foreground text-[10px] mt-0.5 leading-tight">
                            {med.dose} {med.unit} · {med.route.replace(/_/g, ' ')}
                          </p>
                        </td>
                      )}
                      <td className="px-2 py-1 border-r text-center">
                        <span className="text-[10px] font-medium text-muted-foreground">{slot.label}</span>
                      </td>
                      {weekDays.map(day => {
                        const dateKey = format(day, 'yyyy-MM-dd')
                        const admin = adminLookup.get(`${med.id}-${slotKey}-${dateKey}`)
                        const isFuture = isAfter(startOfDay(day), today)
                        return (
                          <td key={day.toISOString()} className={cn(
                            'px-1 py-1 border-r text-center',
                            isSameDay(day, today) ? 'bg-primary/5' : '',
                          )}>
                            <div className="flex justify-center">
                              <MARCell
                                marCode={admin?.marCode}
                                status={admin?.status}
                                isFuture={isFuture}
                                isToday={isSameDay(day, today)}
                                onClick={() => !isFuture && openCell(med, slotKey, day)}
                              />
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Administration dialog */}
      <Dialog open={!!selectedCell} onOpenChange={() => setSelectedCell(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Administration</DialogTitle>
          </DialogHeader>
          {selectedMed && selectedCell && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-0.5">
                <p className="font-semibold">{selectedMed.name}</p>
                <p className="text-muted-foreground">{selectedMed.dose} {selectedMed.unit} · {selectedMed.route.replace(/_/g, ' ')}</p>
                <p className="text-muted-foreground">
                  {ROUND_SLOTS.find(s => s.key === selectedCell.roundSlot)?.label} round · {format(selectedCell.date, 'EEEE dd MMM yyyy')}
                </p>
              </div>

              {/* MAR code picker */}
              <div>
                <Label className="mb-2 block">MAR Code *</Label>
                <div className="grid grid-cols-6 gap-1.5">
                  {(Object.entries(MAR_CODES) as [MARCode, typeof MAR_CODES[MARCode]][]).map(([code, cfg]) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setMarCode(code)}
                      className={cn(
                        'h-10 rounded-md text-xs font-bold flex flex-col items-center justify-center gap-0.5 border-2 transition-all',
                        cfg.color,
                        marCode === code ? 'scale-105 border-white/60 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100',
                      )}
                      title={cfg.label}
                    >
                      <span className="text-sm font-black">{code}</span>
                      <span className="text-[8px] leading-none opacity-90 hidden sm:block">{cfg.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Selected: <strong>{marCode}</strong> — {MAR_CODES[marCode].label}</p>
              </div>

              {/* PRN pain scores */}
              {(selectedMed.isPRN || selectedCell.roundSlot === 'prn') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Pain score before (0–10)</Label>
                    <Input
                      type="number" min={0} max={10}
                      value={painBefore}
                      onChange={e => setPainBefore(e.target.value)}
                      placeholder="0–10"
                    />
                  </div>
                  <div>
                    <Label>Pain score after (0–10)</Label>
                    <Input
                      type="number" min={0} max={10}
                      value={painAfter}
                      onChange={e => setPainAfter(e.target.value)}
                      placeholder="0–10"
                    />
                  </div>
                </div>
              )}

              {/* Notes — required for non-G codes */}
              {marCode !== 'G' && (
                <div>
                  <Label>Reason / Notes *</Label>
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    placeholder={`Reason for ${MAR_CODES[marCode].label}…`}
                  />
                </div>
              )}

              {/* CD witness */}
              {selectedMed.isControlled && marCode === 'G' && staffList.length > 0 && (
                <div>
                  <Label>Witness (required for CD) *</Label>
                  <select
                    value={witnessId}
                    onChange={e => setWitnessId(e.target.value)}
                    className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select witness…</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedCell(null)}>Cancel</Button>
                <Button
                  onClick={handleRecord}
                  disabled={
                    isPending ||
                    (marCode !== 'G' && !notes.trim()) ||
                    (selectedMed.isControlled && marCode === 'G' && !witnessId)
                  }
                >
                  {isPending ? 'Saving…' : 'Record'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
