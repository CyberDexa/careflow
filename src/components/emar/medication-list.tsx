'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Pill, Plus, AlertCircle, Search, Loader2, Shield, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createMedication, discontinueMedication, updateMedicationStock } from '@/actions/emar'

// ─── Autocomplete result type ─────────────────────────────────────────────────
interface MedSearchResult {
  name: string
  genericName: string
  commonDoses: string[]
  route: string
  category: string
}

// ─── Frequency → default scheduled times ─────────────────────────────────────
const FREQUENCY_TIMES: Record<string, string> = {
  'Once daily':            '08:00',
  'Twice daily':           '08:00, 20:00',
  'Three times daily':     '08:00, 13:00, 20:00',
  'Four times daily':      '07:00, 12:00, 17:00, 22:00',
  'Every 4 hours':         '06:00, 10:00, 14:00, 18:00, 22:00',
  'Every 6 hours':         '06:00, 12:00, 18:00, 00:00',
  'Every 8 hours':         '06:00, 14:00, 22:00',
  'Every 12 hours':        '08:00, 20:00',
  'At night (nocte)':      '22:00',
  'In the morning (mane)': '08:00',
  'As required (PRN)':     '',
}

// ─── UK medicines autocomplete component ─────────────────────────────────────
function MedicationAutocomplete({
  value,
  onChange,
  onSelect,
}: {
  value: string
  onChange: (v: string) => void
  onSelect: (result: MedSearchResult) => void
}) {
  const [results, setResults] = useState<MedSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/medications/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data)
      setOpen(data.length > 0)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 220)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [value, search])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Type 2+ letters to search UK medicines…"
          value={value}
          onChange={(e) => { onChange(e.target.value); if (e.target.value.length >= 2) setOpen(true) }}
          onFocus={() => value.length >= 2 && setOpen(true)}
          className="pl-9 pr-8"
          autoComplete="off"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-xl overflow-hidden max-h-64 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.name}
              type="button"
              className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
              onMouseDown={(e) => { e.preventDefault(); onSelect(r); setOpen(false) }}
            >
              <Pill className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm leading-tight">{r.name}</p>
                <p className="text-xs text-muted-foreground truncate">{r.genericName}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[10px] bg-primary/10 text-primary rounded px-1.5 py-0.5">{r.category}</span>
                  <span className="text-[10px] text-muted-foreground">{r.route.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] text-muted-foreground">{r.commonDoses.slice(0, 2).join(', ')}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Form schema ─────────────────────────────────────────────────────────────
const medicationFormSchema = z.object({
  name: z.string().min(1, 'Required'),
  genericName: z.string().optional(),
  dose: z.string().min(1, 'Required'),
  unit: z.string().min(1, 'Required'),
  route: z.string().min(1, 'Required'),
  frequency: z.string().min(1, 'Required'),
  scheduledTimes: z.string().optional(),
  startDate: z.string().min(1, 'Required'),
  endDate: z.string().optional(),
  prescribedBy: z.string().optional(),
  isControlled: z.boolean().default(false),
  isPRN: z.boolean().default(false),
  prnIndication: z.string().optional(),
  prnMinIntervalHours: z.number().int().min(1).default(4),
  currentStock: z.number().min(0).default(0),
  reorderLevel: z.number().min(1).default(7),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof medicationFormSchema>

const ROUTES = [
  'ORAL', 'SUBLINGUAL', 'TOPICAL', 'TRANSDERMAL', 'INHALED',
  'SUBCUTANEOUS', 'INTRAMUSCULAR', 'RECTAL', 'EYE_DROP', 'EAR_DROP', 'NASAL', 'OTHER',
]

const FREQUENCIES = [
  'Once daily', 'Twice daily', 'Three times daily', 'Four times daily',
  'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours',
  'On alternate days', 'Weekly', 'As required (PRN)', 'At night (nocte)',
  'In the morning (mane)',
]

const UNITS = ['mg', 'mcg', 'g', 'ml', 'units', 'drops', 'puffs', 'patches', 'tablets', 'capsules', 'micrograms', 'sachets']

interface MedicationListProps {
  residentId: string
  medications: Array<{
    id: string
    name: string
    genericName: string | null
    dose: string
    unit: string
    route: string
    frequency: string
    scheduledTimes: string[]
    isControlled: boolean
    isPRN: boolean
    prnIndication: string | null
    prnMinIntervalHours: number | null
    isActive: boolean
    currentStock: number
    reorderLevel: number
    prescribedBy: string | null
  }>
  userRole: string
}

export function MedicationList({ residentId, medications, userRole }: MedicationListProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [nameQuery, setNameQuery] = useState('')
  const [stockDialog, setStockDialog] = useState<{ id: string; name: string; current: number } | null>(null)
  const [stockAmount, setStockAmount] = useState(0)
  const router = useRouter()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(medicationFormSchema) as any,
    defaultValues: { isControlled: false, isPRN: false, currentStock: 0, reorderLevel: 7, prnMinIntervalHours: 4 },
  })

  const isPRN = watch('isPRN')
  const canEdit = ['MANAGER', 'ADMIN', 'SENIOR_CARER'].includes(userRole)

  const handleMedSelect = (result: MedSearchResult) => {
    setValue('name', result.name)
    setValue('genericName', result.genericName)
    setNameQuery(result.name)
    if (ROUTES.includes(result.route)) setValue('route', result.route)
    if (result.commonDoses.length > 0) {
      const first = result.commonDoses[0]
      const match = first.match(/^([\d.]+)\s*([a-zA-Z]*)/)
      if (match) {
        setValue('dose', match[1])
        const unitStr = match[2].toLowerCase()
        const matched = UNITS.find(u => u.toLowerCase() === unitStr)
        if (matched) setValue('unit', matched)
      } else {
        setValue('dose', first)
      }
    }
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')
    try {
      const times = data.scheduledTimes
        ? data.scheduledTimes.split(',').map(t => t.trim()).filter(Boolean)
        : []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await createMedication({ ...data, residentId, scheduledTimes: times, route: data.route as any })
      if ('error' in result) {
        setError(result.error as string)
      } else {
        reset()
        setNameQuery('')
        setOpen(false)
        router.refresh()
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const handleDiscontinue = async (id: string, name: string) => {
    if (!confirm(`Discontinue ${name}? This cannot be undone.`)) return
    await discontinueMedication(id)
    router.refresh()
  }

  const handleStockUpdate = async () => {
    if (!stockDialog) return
    await updateMedicationStock(stockDialog.id, stockDialog.current + stockAmount)
    setStockDialog(null)
    setStockAmount(0)
    router.refresh()
  }

  const activeMeds = medications.filter(m => m.isActive)
  const inactiveMeds = medications.filter(m => !m.isActive)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Medications ({activeMeds.length} active)</h3>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Medication</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Medication</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                    <AlertCircle className="h-4 w-4 shrink-0" />{error}
                  </div>
                )}

                {/* Autocomplete name search */}
                <div>
                  <Label>Medication Name *</Label>
                  <MedicationAutocomplete
                    value={nameQuery}
                    onChange={(v) => { setNameQuery(v); setValue('name', v) }}
                    onSelect={handleMedSelect}
                  />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <Label>Generic / Active Ingredient</Label>
                  <Input placeholder="e.g. amlodipine besylate" {...register('genericName')} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Dose *</Label>
                    <Input placeholder="e.g. 5" {...register('dose')} />
                    {errors.dose && <p className="text-xs text-destructive mt-1">{errors.dose.message}</p>}
                  </div>
                  <div>
                    <Label>Unit *</Label>
                    <Select onValueChange={(v) => setValue('unit', v)} value={watch('unit') || ''}>
                      <SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger>
                      <SelectContent>
                        {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.unit && <p className="text-xs text-destructive mt-1">{errors.unit.message}</p>}
                  </div>
                  <div>
                    <Label>Route *</Label>
                    <Select onValueChange={(v) => setValue('route', v)} value={watch('route') || ''}>
                      <SelectTrigger><SelectValue placeholder="Route" /></SelectTrigger>
                      <SelectContent>
                        {ROUTES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.route && <p className="text-xs text-destructive mt-1">{errors.route.message}</p>}
                  </div>
                  <div>
                    <Label>Frequency *</Label>
                    <Select
                      onValueChange={(v) => {
                        setValue('frequency', v)
                        if (FREQUENCY_TIMES[v] !== undefined) setValue('scheduledTimes', FREQUENCY_TIMES[v])
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Frequency" /></SelectTrigger>
                      <SelectContent>
                        {FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>
                    Scheduled Times
                    <span className="text-muted-foreground text-xs ml-1">(comma-separated — auto-filled from frequency)</span>
                  </Label>
                  <Input
                    placeholder="e.g. 08:00, 20:00"
                    value={watch('scheduledTimes') || ''}
                    onChange={(e) => setValue('scheduledTimes', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Date *</Label>
                    <Input type="date" {...register('startDate')} />
                    {errors.startDate && <p className="text-xs text-destructive mt-1">{errors.startDate.message}</p>}
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input type="date" {...register('endDate')} />
                  </div>
                  <div>
                    <Label>Current Stock</Label>
                    <Input type="number" min={0} {...register('currentStock', { valueAsNumber: true })} />
                  </div>
                  <div>
                    <Label>Reorder Level (days)</Label>
                    <Input type="number" min={1} {...register('reorderLevel', { valueAsNumber: true })} />
                  </div>
                </div>

                <div>
                  <Label>Prescribed By</Label>
                  <Input placeholder="Dr. Name" {...register('prescribedBy')} />
                </div>

                <div className="flex flex-col gap-3 border-t pt-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isControlled"
                      checked={watch('isControlled')}
                      onCheckedChange={(v) => setValue('isControlled', !!v)}
                    />
                    <Label htmlFor="isControlled" className="cursor-pointer font-normal">
                      Controlled Drug (CD register required)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="isPRN" checked={isPRN} onCheckedChange={(v) => setValue('isPRN', !!v)} />
                    <Label htmlFor="isPRN" className="cursor-pointer font-normal">PRN — As Required</Label>
                  </div>
                  {isPRN && (
                    <div className="grid grid-cols-2 gap-3 pl-6">
                      <div className="col-span-2">
                        <Label>Indication *</Label>
                        <Input placeholder="e.g. Breakthrough pain, agitation" {...register('prnIndication')} />
                      </div>
                      <div className="col-span-2">
                        <Label>Min. interval between doses (hours)</Label>
                        <Input
                          type="number" min={1} max={24}
                          {...register('prnMinIntervalHours', { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); setNameQuery('') }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Adding…</> : 'Add Medication'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {activeMeds.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <Pill className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium">No active medications</p>
            <p className="text-sm">Start typing a medicine name to search and add</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {activeMeds.map(med => {
          const lowStock = med.currentStock <= med.reorderLevel
          return (
            <Card key={med.id} className={lowStock ? 'border-amber-400/60' : ''}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{med.name}</span>
                      {med.genericName && <span className="text-sm text-muted-foreground">({med.genericName})</span>}
                      {med.isControlled && (
                        <Badge variant="destructive" className="text-xs">
                          <Shield className="h-3 w-3 mr-0.5" />CD
                        </Badge>
                      )}
                      {med.isPRN && <Badge variant="secondary" className="text-xs">PRN</Badge>}
                    </div>
                    <p className="text-sm mt-0.5">
                      {med.dose} {med.unit} · {med.route.replace(/_/g, ' ')} · {med.frequency}
                    </p>
                    {med.isPRN && med.prnIndication && (
                      <p className="text-xs text-muted-foreground mt-0.5">Indication: {med.prnIndication}</p>
                    )}
                    {med.scheduledTimes.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Times: {med.scheduledTimes.join(', ')}
                      </p>
                    )}
                    {med.prescribedBy && (
                      <p className="text-xs text-muted-foreground">Prescribed by Dr. {med.prescribedBy}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className={cn('text-xs font-medium', lowStock ? 'text-amber-500' : 'text-muted-foreground')}>
                        Stock: {med.currentStock}{lowStock ? ' ⚠ Low' : ''}
                      </span>
                      {canEdit && (
                        <Button
                          variant="ghost" size="sm" className="h-6 text-xs px-2"
                          onClick={() => setStockDialog({ id: med.id, name: med.name, current: med.currentStock })}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />Update stock
                        </Button>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <Button
                      variant="ghost" size="sm"
                      className="text-destructive hover:text-destructive shrink-0 text-xs"
                      onClick={() => handleDiscontinue(med.id, med.name)}
                    >
                      Discontinue
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {inactiveMeds.length > 0 && (
        <details className="text-sm mt-4">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            {inactiveMeds.length} discontinued medication{inactiveMeds.length > 1 ? 's' : ''}
          </summary>
          <div className="mt-2 grid gap-2">
            {inactiveMeds.map(med => (
              <div key={med.id} className="p-3 rounded-lg border border-dashed opacity-60 text-sm">
                <span className="font-medium line-through">{med.name}</span>
                {' — '}{med.dose} {med.unit} · {med.frequency}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Stock update dialog */}
      <Dialog open={!!stockDialog} onOpenChange={() => { setStockDialog(null); setStockAmount(0) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Stock — {stockDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Current balance: <strong>{stockDialog?.current}</strong>
            </p>
            <div>
              <Label>Quantity received / added</Label>
              <Input
                type="number" min={0}
                value={stockAmount}
                onChange={(e) => setStockAmount(Number(e.target.value))}
              />
            </div>
            <p className="text-sm">
              New balance: <strong>{(stockDialog?.current ?? 0) + stockAmount}</strong>
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setStockDialog(null); setStockAmount(0) }}>Cancel</Button>
              <Button onClick={handleStockUpdate}>Update</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
