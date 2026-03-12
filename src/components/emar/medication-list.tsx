'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Pill, Plus, X, AlertCircle } from 'lucide-react'
import { createMedication, discontinueMedication } from '@/actions/emar'

const medicationFormSchema = z.object({
  name: z.string().min(1, 'Required'),
  genericName: z.string().optional(),
  dose: z.string().min(1, 'Required'),
  unit: z.string().min(1, 'Required'),
  route: z.string().min(1, 'Required'),
  frequency: z.string().min(1, 'Required'),
  scheduledTimes: z.string().min(1, 'Required'),
  startDate: z.string().min(1, 'Required'),
  endDate: z.string().optional(),
  prescribedBy: z.string().optional(),
  isControlled: z.boolean().default(false),
  isPRN: z.boolean().default(false),
  prnIndication: z.string().optional(),
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

const UNITS = ['mg', 'mcg', 'g', 'ml', 'units', 'drops', 'puffs', 'patches', 'tablets', 'capsules']

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
  const router = useRouter()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(medicationFormSchema) as any,
    defaultValues: {
      isControlled: false,
      isPRN: false,
      currentStock: 0,
      reorderLevel: 7,
    },
  })

  const isPRN = watch('isPRN')
  const canEdit = ['MANAGER', 'ADMIN', 'SENIOR_CARER'].includes(userRole)

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')
    try {
      const times = data.scheduledTimes.split(',').map(t => t.trim()).filter(Boolean)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await createMedication({ ...data, residentId, scheduledTimes: times, route: data.route as any })
      if ('error' in result) {
        setError(result.error as string)
      } else {
        reset()
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

  const activeMeds = medications.filter(m => m.isActive)
  const inactiveMeds = medications.filter(m => !m.isActive)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Medications ({activeMeds.length} active)</h3>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Medication
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Medication</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label htmlFor="name">Medication Name *</Label>
                    <Input id="name" placeholder="e.g. Amlodipine" {...register('name')} />
                    {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="genericName">Generic Name</Label>
                    <Input id="genericName" placeholder="e.g. amlodipine besylate" {...register('genericName')} />
                  </div>
                  <div>
                    <Label htmlFor="dose">Dose *</Label>
                    <Input id="dose" placeholder="e.g. 5" {...register('dose')} />
                    {errors.dose && <p className="text-xs text-destructive mt-1">{errors.dose.message}</p>}
                  </div>
                  <div>
                    <Label>Unit *</Label>
                    <Select onValueChange={(v) => setValue('unit', v)}>
                      <SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger>
                      <SelectContent>
                        {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Route *</Label>
                    <Select onValueChange={(v) => setValue('route', v)}>
                      <SelectTrigger><SelectValue placeholder="Route" /></SelectTrigger>
                      <SelectContent>
                        {ROUTES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.route && <p className="text-xs text-destructive mt-1">{errors.route.message}</p>}
                  </div>
                  <div>
                    <Label>Frequency *</Label>
                    <Select onValueChange={(v) => setValue('frequency', v)}>
                      <SelectTrigger><SelectValue placeholder="Frequency" /></SelectTrigger>
                      <SelectContent>
                        {FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="scheduledTimes">Scheduled Times * <span className="text-muted-foreground text-xs">(comma-separated, e.g. 08:00, 20:00)</span></Label>
                    <Input id="scheduledTimes" placeholder="08:00, 20:00" {...register('scheduledTimes')} />
                  </div>
                  <div>
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input type="date" id="startDate" {...register('startDate')} />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input type="date" id="endDate" {...register('endDate')} />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="prescribedBy">Prescribed By</Label>
                    <Input id="prescribedBy" placeholder="Dr. Name" {...register('prescribedBy')} />
                  </div>
                  <div>
                    <Label htmlFor="currentStock">Current Stock</Label>
                    <Input type="number" id="currentStock" {...register('currentStock', { valueAsNumber: true })} />
                  </div>
                  <div>
                    <Label htmlFor="reorderLevel">Reorder Level (days)</Label>
                    <Input type="number" id="reorderLevel" {...register('reorderLevel', { valueAsNumber: true })} />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
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
                    <Checkbox
                      id="isPRN"
                      checked={isPRN}
                      onCheckedChange={(v) => setValue('isPRN', !!v)}
                    />
                    <Label htmlFor="isPRN" className="cursor-pointer font-normal">
                      PRN Medication (As Required)
                    </Label>
                  </div>
                  {isPRN && (
                    <div>
                      <Label htmlFor="prnIndication">PRN Indication *</Label>
                      <Input id="prnIndication" placeholder="e.g. Breakthrough pain" {...register('prnIndication')} />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Medication'}
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
            <p className="text-sm">Add medications to start recording administrations</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {activeMeds.map(med => (
          <Card key={med.id} className={med.currentStock <= med.reorderLevel ? 'border-amber-300' : ''}>
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{med.name}</span>
                    {med.genericName && (
                      <span className="text-sm text-muted-foreground">({med.genericName})</span>
                    )}
                    {med.isControlled && (
                      <Badge variant="destructive" className="text-xs">CD</Badge>
                    )}
                    {med.isPRN && (
                      <Badge variant="secondary" className="text-xs">PRN</Badge>
                    )}
                  </div>
                  <p className="text-sm mt-0.5">
                    {med.dose} {med.unit} — {med.route.replace(/_/g, ' ')} — {med.frequency}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Times: {med.scheduledTimes.join(', ')}
                    {med.prescribedBy && ` · Dr. ${med.prescribedBy}`}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-medium ${med.currentStock <= med.reorderLevel ? 'text-amber-600' : 'text-muted-foreground'}`}>
                      Stock: {med.currentStock} remaining
                    </span>
                    {med.currentStock <= med.reorderLevel && (
                      <span className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Low stock
                      </span>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => handleDiscontinue(med.id, med.name)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {inactiveMeds.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
            {inactiveMeds.length} discontinued medication(s)
          </summary>
          <div className="grid gap-2 mt-2">
            {inactiveMeds.map(med => (
              <Card key={med.id} className="opacity-60">
                <CardContent className="py-2 px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm line-through">{med.name}</span>
                    <Badge variant="outline" className="text-xs">Discontinued</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {med.dose} {med.unit} — {med.route} — {med.frequency}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
