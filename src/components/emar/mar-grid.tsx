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
import { ChevronLeft, ChevronRight, ClipboardList, User } from 'lucide-react'

// ─── UK MAR Code definitions ─────────────────────────────────────────────────
const MAR_CODES = {
  G: { label: 'Given',          bg: 'bg-green-600',  text: 'text-white' },
  R: { label: 'Refused',        bg: 'bg-red-500',    text: 'text-white' },
  S: { label: 'Sleeping',       bg: 'bg-yellow-400', text: 'text-gray-900' },
  P: { label: 'Pulse Abnormal', bg: 'bg-orange-500', text: 'text-white' },
  M: { label: 'Made Available', bg: 'bg-purple-500', text: 'text-white' },
  H: { label: 'Hospitalised',   bg: 'bg-gray-700',   text: 'text-white' },
  D: { label: 'Destroyed',      bg: 'bg-gray-900',   text: 'text-white' },
  N: { label: 'Nausea',         bg: 'bg-teal-500',   text: 'text-white' },
  L: { label: 'On Leave',       bg: 'bg-blue-500',   text: 'text-white' },
  Q: { label: 'Not Required',   bg: 'bg-slate-400',  text: 'text-white' },
  O: { label: 'Other',          bg: 'bg-pink-500',   text: 'text-white' },
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
  currentStock?: number
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
  administeredBy?: { firstName: string; lastName: string } | null
}

interface MARGridProps {
  residentId: string
  medications: Medication[]
  administrations: Administration[]
  staffList?: Array<{ id: string; firstName: string; lastName: string }>
}

// ─── Pill cell ────────────────────────────────────────────────────────────────
function MARCell({
  admin, isFuture, isToday, isPRN, onClick,
}: {
  admin?: Administration
  isFuture: boolean
  isToday: boolean
  isPRN: boolean
  onClick: () => void
}) {
  const code = admin?.marCode as MARCode | undefined
  const cfg = code ? MAR_CODES[code] : null
  const legacyGiven = !cfg && admin?.status === 'GIVEN'
  const legacyRefused = !cfg && admin?.status === 'REFUSED'
  const initials = admin?.administeredBy
    ? `${admin.administeredBy.firstName[0]}${admin.administeredBy.lastName[0]}`.toUpperCase()
    : admin?.administeredAt
      ? format(new Date(admin.administeredAt as string), 'HH:mm')
      : null

  let cellClass = ''
  let content: React.ReactNode = ''

  if (cfg || legacyGiven || legacyRefused) {
    const bgClass = cfg ? cfg.bg : legacyGiven ? 'bg-green-600' : 'bg-red-500'
    const txtClass = cfg ? cfg.text : 'text-white'
    cellClass = `${bgClass} ${txtClass} cursor-pointer hover:opacity-90`
    content = (
      <>
        <span className="text-[11px] font-bold leading-none">{code ?? (legacyGiven ? 'G' : 'R')}</span>
        {initials && <span className="text-[9px] leading-none opacity-80">{initials}</span>}
      </>
    )
  } else if (isFuture) {
    cellClass = 'bg-green-50 border-green-100 cursor-not-allowed'
    content = <span className="text-green-300 text-xs">-</span>
  } else if (isToday) {
    cellClass = isPRN
      ? 'bg-pink-50 border-pink-200 cursor-pointer hover:bg-pink-100'
      : 'bg-green-50 border-green-200 cursor-pointer hover:bg-green-100'
    content = <span className={cn('text-lg leading-none', isPRN ? 'text-pink-400' : 'text-green-400')}>{isPRN ? '+' : '•'}</span>
  } else {
    cellClass = 'bg-amber-50 border-amber-200 cursor-pointer hover:bg-amber-100'
    content = <span className="text-amber-300 text-xs">-</span>
  }

  return (
    <button
      type="button"
      disabled={isFuture}
      onClick={onClick}
      className={cn(
        'h-9 w-full rounded border flex flex-col items-center justify-center gap-0 transition-all select-none',
        isToday && !cfg && !legacyGiven && !legacyRefused ? 'ring-1 ring-inset ring-primary/30' : '',
        cellClass,
      )}
    >
      {content}
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
  const [painBefore, setPainBefore] = useState('')
  const [painAfter, setPainAfter] = useState('')
  const [notes, setNotes] = useState('')
  const [witnessId, setWitnessId] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const today = startOfDay(new Date())

  const adminLookup = new Map<string, Administration>()
  for (const admin of administrations) {
    const d = new Date(admin.scheduledTime as string)
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

  const prnAdmins = administrations.filter(a => {
    const med = medications.find(m => m.id === a.medicationId)
    const d = new Date(a.scheduledTime as string)
    return med?.isPRN && a.status === 'GIVEN' && d >= weekStart && d <= weekEnd
  }).map(a => ({ ...a, med: medications.find(m => m.id === a.medicationId)! }))

  return (
    <div className="space-y-0">
      {/* Week navigation */}
      <div className="flex items-center justify-between py-3 border-b">
        <Button
          variant="outline" size="sm" className="flex items-center gap-1 text-xs"
          onClick={() => setWeekStart(w => startOfWeek(subWeeks(w, 1), { weekStartsOn: 1 }))}
        >
          <ChevronLeft className="h-3.5 w-3.5" />Previous Week
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">
            {format(weekStart, 'd MMM')} - {format(weekEnd, 'd MMM yyyy')}
          </span>
          <Button
            variant="ghost" size="sm" className="text-xs h-7 px-2 border"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            Today
          </Button>
        </div>
        <Button
          variant="outline" size="sm" className="flex items-center gap-1 text-xs"
          onClick={() => setWeekStart(w => startOfWeek(addWeeks(w, 1), { weekStartsOn: 1 }))}
        >
          Next Week<ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* MAR Code legend — always visible */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 px-1 border-b bg-muted/10 text-xs">
        <span className="text-muted-foreground font-medium">Codes:</span>
        {(Object.entries(MAR_CODES) as [MARCode, typeof MAR_CODES[MARCode]][]).map(([code, cfg]) => (
          <span key={code} className="flex items-center gap-1">
            <span className={cn('inline-flex items-center justify-center h-5 w-5 rounded text-[10px] font-bold', cfg.bg, cfg.text)}>{code}</span>
            <span className="text-muted-foreground">= {cfg.label}</span>
          </span>
        ))}
      </div>

      {medications.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">No active medications to display</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse w-full min-w-[680px]">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="sticky left-0 z-10 bg-muted/30 text-left px-3 py-2.5 border-r min-w-[180px] font-semibold">Medication</th>
                <th className="px-2 py-2.5 border-r text-center font-semibold w-14">Time</th>
                {weekDays.map(day => (
                  <th key={day.toISOString()} className={cn(
                    'px-1 py-2 text-center border-r min-w-[52px] font-medium',
                    isSameDay(day, today) ? 'bg-blue-100/60' : '',
                  )}>
                    <div className={cn('text-[10px] font-medium', isSameDay(day, today) ? 'text-blue-600' : 'text-muted-foreground')}>
                      {format(day, 'EEE')}
                    </div>
                    <div className={cn('font-bold text-sm', isSameDay(day, today) ? 'text-blue-700 underline underline-offset-2' : 'text-foreground')}>
                      {format(day, 'd/M')}
                    </div>
                  </th>
                ))}
                <th className="px-2 py-2.5 text-center font-semibold w-14">Stock</th>
              </tr>
            </thead>
            <tbody>
              {medications.map(med => {
                const rounds = getRoundsForFrequency(med.frequency)
                return rounds.map((slotKey, slotIdx) => {
                  const slot = ROUND_SLOTS.find(s => s.key === slotKey)!
                  const isFirstSlot = slotIdx === 0
                  return (
                    <tr key={`${med.id}-${slotKey}`} className="border-b">
                      {isFirstSlot && (
                        <td className="sticky left-0 z-10 bg-white px-3 py-2 border-r align-top" rowSpan={rounds.length}>
                          <div className="text-blue-600 font-semibold text-[13px] leading-tight">{med.name}</div>
                          <p className="text-muted-foreground text-[11px] mt-0.5">
                            {med.dose} {med.unit} · {med.route.replace(/_/g, ' ').toLowerCase()}
                          </p>
                          <p className="text-muted-foreground text-[10px]">{med.frequency.toLowerCase()}</p>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            {med.isControlled && <Badge variant="destructive" className="text-[9px] px-1 py-0">CD</Badge>}
                            {med.isPRN && <Badge variant="secondary" className="text-[9px] px-1 py-0">PRN</Badge>}
                          </div>
                        </td>
                      )}
                      <td className="px-2 py-1 border-r text-center bg-muted/10">
                        <span className="text-[11px] font-medium text-muted-foreground">{slot.label}</span>
                      </td>
                      {weekDays.map(day => {
                        const dateKey = format(day, 'yyyy-MM-dd')
                        const admin = adminLookup.get(`${med.id}-${slotKey}-${dateKey}`)
                        const isFuture = isAfter(startOfDay(day), today)
                        const isToday2 = isSameDay(day, today)
                        return (
                          <td key={day.toISOString()} className={cn('px-1 py-1 border-r', isToday2 ? 'bg-blue-50/40' : '')}>
                            <MARCell
                              admin={admin}
                              isFuture={isFuture}
                              isToday={isToday2}
                              isPRN={med.isPRN || slotKey === 'prn'}
                              onClick={() => !isFuture && openCell(med, slotKey, day)}
                            />
                          </td>
                        )
                      })}
                      {isFirstSlot && (
                        <td className="px-2 py-2 text-center font-semibold text-sm align-middle" rowSpan={rounds.length}>
                          {med.currentStock ?? '—'}
                        </td>
                      )}
                    </tr>
                  )
                })
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* PRN Administration Log */}
      <div className="mt-6 pt-4 border-t">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">PRN Administration Log</h3>
        </div>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b bg-muted/20">
              {['Date', 'Time', 'Medication', 'Dose', 'Reason', 'Effectiveness', 'Given By'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prnAdmins.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-6 text-muted-foreground">No PRN administrations recorded this week</td>
              </tr>
            ) : prnAdmins.map(a => (
              <tr key={a.id} className="border-b hover:bg-muted/10">
                <td className="px-3 py-2">{format(new Date(a.scheduledTime as string), 'dd/MM/yyyy')}</td>
                <td className="px-3 py-2">{a.administeredAt ? format(new Date(a.administeredAt as string), 'HH:mm') : '—'}</td>
                <td className="px-3 py-2 font-medium">{a.med?.name}</td>
                <td className="px-3 py-2">{a.med ? `${a.med.dose} ${a.med.unit}` : '—'}</td>
                <td className="px-3 py-2">{a.outcome ?? '—'}</td>
                <td className="px-3 py-2">—</td>
                <td className="px-3 py-2">
                  {a.administeredBy ? `${a.administeredBy.firstName} ${a.administeredBy.lastName}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Carer's Notes */}
      <div className="mt-6 pt-4 border-t">
        <div className="flex items-center gap-2 mb-3">
          <User className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Carer's Notes</h3>
        </div>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b bg-muted/20">
              {['Date', 'Time', 'Notes', 'Signature'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map(i => (
              <tr key={i} className="border-b">
                <td className="px-3 py-4 w-24"></td>
                <td className="px-3 py-4 w-16"></td>
                <td className="px-3 py-4"></td>
                <td className="px-3 py-4 w-28"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
                  {ROUND_SLOTS.find(s => s.key === selectedCell.roundSlot)?.label} · {format(selectedCell.date, 'EEEE dd MMM yyyy')}
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
                        cfg.bg, cfg.text,
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
