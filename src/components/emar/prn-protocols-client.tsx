'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { recordAdministration } from '@/actions/emar'
import { Clock, AlertCircle, CheckCircle, Pill, ChevronLeft, Activity } from 'lucide-react'

interface PRNMed {
  id: string
  name: string
  dose: string
  unit: string
  route: string
  prnIndication: string | null
  prnMinIntervalHours: number
  currentStock: number
}

interface HistoryEntry {
  id: string
  medicationId: string
  medicationName: string
  dose: string
  unit: string
  scheduledTime: string
  administeredAt: string | null
  status: string
  outcome: string | null
  marCode: string | null
  painScoreBefore: number | null
  painScoreAfter: number | null
  administeredBy: string
}

interface PRNProtocolsClientProps {
  resident: { id: string; firstName: string; lastName: string; roomNumber: string | null }
  prnMeds: PRNMed[]
  history: HistoryEntry[]
  staffList: Array<{ id: string; firstName: string; lastName: string }>
  userRole: string
  residentId: string
}

// Given the last admin for a med, how many hours/minutes until it can be given again
function getAvailability(med: PRNMed, history: HistoryEntry[]) {
  const lastGiven = history
    .filter(h => h.medicationId === med.id && (h.status === 'GIVEN' || h.marCode === 'G'))
    .sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime())[0]

  if (!lastGiven) return { canGive: true, lastGiven: null, minutesUntil: 0 }

  const lastTime = parseISO(lastGiven.scheduledTime)
  const minIntervalMinutes = med.prnMinIntervalHours * 60
  const minutesSince = differenceInMinutes(new Date(), lastTime)
  const minutesUntil = minIntervalMinutes - minutesSince

  return {
    canGive: minutesSince >= minIntervalMinutes,
    lastGiven: lastTime,
    minutesUntil: Math.max(0, minutesUntil),
  }
}

export function PRNProtocolsClient({
  resident,
  prnMeds,
  history,
  staffList,
  userRole,
  residentId,
}: PRNProtocolsClientProps) {
  const [selectedMed, setSelectedMed] = useState<PRNMed | null>(null)
  const [painBefore, setPainBefore] = useState('')
  const [painAfter, setPainAfter] = useState('')
  const [indication, setIndication] = useState('')
  const [notes, setNotes] = useState('')
  const [witnessId, setWitnessId] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const canRecord = ['MANAGER', 'ADMIN', 'SENIOR_CARER', 'CARER'].includes(userRole)

  const handleAdminister = () => {
    if (!selectedMed) return
    startTransition(async () => {
      await recordAdministration({
        medicationId: selectedMed.id,
        residentId,
        status: 'GIVEN',
        scheduledTime: new Date().toISOString(),
        administeredAt: new Date().toISOString(),
        outcome: [indication, notes].filter(Boolean).join(' — ') || undefined,
        witnessId: witnessId || undefined,
        marCode: 'G',
        roundSlot: 'PRN',
        painScoreBefore: painBefore ? parseInt(painBefore) : undefined,
        painScoreAfter: painAfter ? parseInt(painAfter) : undefined,
      } as any)
      setSelectedMed(null)
      setPainBefore('')
      setPainAfter('')
      setIndication('')
      setNotes('')
      setWitnessId('')
      router.refresh()
    })
  }

  // Group history by medication
  const historyByMed = new Map<string, HistoryEntry[]>()
  for (const h of history) {
    const arr = historyByMed.get(h.medicationId) ?? []
    arr.push(h)
    historyByMed.set(h.medicationId, arr)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-muted-foreground">
          <ChevronLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">PRN Protocols</h1>
          <p className="text-muted-foreground text-sm">
            {resident.firstName} {resident.lastName} · Room {resident.roomNumber}
          </p>
        </div>
      </div>

      {prnMeds.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Pill className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No PRN medications prescribed</p>
            <p className="text-sm">Add PRN medications via the eMAR Medications tab</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {prnMeds.map(med => {
          const { canGive, lastGiven, minutesUntil } = getAvailability(med, history)
          const medHistory = historyByMed.get(med.id) ?? []
          const totalGiven = medHistory.filter(h => h.status === 'GIVEN' || h.marCode === 'G').length
          const avgPainBefore = medHistory
            .filter(h => h.painScoreBefore !== null)
            .reduce((sum, h, _, arr) => sum + (h.painScoreBefore! / arr.length), 0)
          const avgPainAfter = medHistory
            .filter(h => h.painScoreAfter !== null)
            .reduce((sum, h, _, arr) => sum + (h.painScoreAfter! / arr.length), 0)

          return (
            <Card key={med.id} className={cn(canGive ? 'border-green-500/30' : 'border-muted')}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{med.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {med.dose} {med.unit} · {med.route.replace(/_/g, ' ')}
                    </p>
                    {med.prnIndication && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Indication: {med.prnIndication}
                      </p>
                    )}
                  </div>
                  {canGive ? (
                    <Badge className="bg-green-600 text-white border-0 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />Available
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {minutesUntil >= 60
                        ? `${Math.floor(minutesUntil / 60)}h ${minutesUntil % 60}m`
                        : `${minutesUntil}m`}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Min interval: <strong>{med.prnMinIntervalHours}h</strong></span>
                  <span>Stock: <strong>{med.currentStock}</strong></span>
                  <span>Given (30d): <strong>{totalGiven}</strong></span>
                </div>

                {lastGiven && (
                  <p className="text-xs text-muted-foreground">
                    Last given: {format(lastGiven, 'dd MMM HH:mm')}
                  </p>
                )}

                {totalGiven > 0 && avgPainBefore > 0 && (
                  <div className="flex items-center gap-3 text-xs">
                    <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Avg pain: <strong>{avgPainBefore.toFixed(1)}</strong> before →{' '}
                      <strong className="text-green-600">{avgPainAfter.toFixed(1)}</strong> after
                    </span>
                  </div>
                )}

                {!canGive && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 rounded p-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Cannot administer — minimum interval not yet elapsed
                  </div>
                )}

                {canRecord && (
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={!canGive || med.currentStock === 0}
                    onClick={() => { setSelectedMed(med); setIndication(med.prnIndication ?? '') }}
                  >
                    {med.currentStock === 0 ? 'Out of Stock' : canGive ? 'Record Administration' : 'Not Yet Due'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 30-day history */}
      {history.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">30-Day History</h2>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b text-xs">
                  <th className="text-left px-3 py-2 font-medium">Date/Time</th>
                  <th className="text-left px-3 py-2 font-medium">Medication</th>
                  <th className="text-center px-3 py-2 font-medium">Code</th>
                  <th className="text-center px-3 py-2 font-medium">Pain ↓</th>
                  <th className="text-left px-3 py-2 font-medium">Notes</th>
                  <th className="text-left px-3 py-2 font-medium">By</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {format(parseISO(h.scheduledTime), 'dd MMM HH:mm')}
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-xs">{h.medicationName}</p>
                      <p className="text-[10px] text-muted-foreground">{h.dose} {h.unit}</p>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {h.marCode ? (
                        <span className={cn(
                          'inline-block h-6 w-6 rounded text-[11px] font-bold flex items-center justify-center',
                          h.marCode === 'G' ? 'bg-green-600 text-white' :
                          h.marCode === 'R' ? 'bg-red-500 text-white' :
                          'bg-slate-400 text-white'
                        )}>
                          {h.marCode}
                        </span>
                      ) : (
                        <span className={cn(
                          'text-xs font-medium',
                          h.status === 'GIVEN' ? 'text-green-600' : 'text-muted-foreground'
                        )}>
                          {h.status}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-xs">
                      {h.painScoreBefore !== null && h.painScoreAfter !== null ? (
                        <span>
                          {h.painScoreBefore}→
                          <span className="text-green-600 font-medium">{h.painScoreAfter}</span>
                        </span>
                      ) : h.painScoreBefore !== null ? (
                        <span>{h.painScoreBefore}</span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-[180px] truncate">
                      {h.outcome ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {h.administeredBy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Administration dialog */}
      <Dialog open={!!selectedMed} onOpenChange={() => setSelectedMed(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record PRN Administration</DialogTitle>
          </DialogHeader>
          {selectedMed && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <p className="font-semibold">{selectedMed.name}</p>
                <p className="text-muted-foreground">{selectedMed.dose} {selectedMed.unit} · {selectedMed.route.replace(/_/g, ' ')}</p>
              </div>

              <div>
                <Label>Indication / Reason</Label>
                <Input
                  value={indication}
                  onChange={e => setIndication(e.target.value)}
                  placeholder="e.g. Breakthrough pain, agitation"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Pain score BEFORE (0–10)</Label>
                  <Input
                    type="number" min={0} max={10}
                    value={painBefore}
                    onChange={e => setPainBefore(e.target.value)}
                    placeholder="0–10"
                  />
                </div>
                <div>
                  <Label>Pain score AFTER (0–10)</Label>
                  <Input
                    type="number" min={0} max={10}
                    value={painAfter}
                    onChange={e => setPainAfter(e.target.value)}
                    placeholder="Record later"
                  />
                </div>
              </div>

              <div>
                <Label>Additional notes</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Observations, resident response…"
                />
              </div>

              {staffList.length > 0 && (
                <div>
                  <Label>Witness (required for CD)</Label>
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
                <Button variant="outline" onClick={() => setSelectedMed(null)}>Cancel</Button>
                <Button onClick={handleAdminister} disabled={isPending || !indication.trim()}>
                  {isPending ? 'Recording…' : 'Record Administration'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
