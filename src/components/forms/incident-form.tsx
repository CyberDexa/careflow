"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormField } from "@/components/ui/form-field"
import { BodyMap } from "@/components/body-map/body-map"
import { createIncident } from "@/actions/incidents"
import { isRedirectError } from "@/lib/utils"

const schema = z.object({
  residentId: z.string().min(1),
  title: z.string().min(3, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  incidentDate: z.string().min(1, "Date required"),
  incidentTime: z.string().optional(),
  location: z.string().optional(),
  type: z.string().optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  witnesses: z.string().optional(),
  immediateAction: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const INCIDENT_TYPES = [
  { value: "FALL", label: "Fall" },
  { value: "MEDICATION_ERROR", label: "Medication Error" },
  { value: "SKIN_INTEGRITY", label: "Skin Integrity" },
  { value: "BEHAVIOUR", label: "Behaviour Incident" },
  { value: "CHOKING", label: "Choking" },
  { value: "MISSING_PERSON", label: "Missing Person" },
  { value: "SAFEGUARDING", label: "Safeguarding Concern" },
  { value: "INFECTION", label: "Infection / Outbreak" },
  { value: "ENVIRONMENTAL", label: "Environmental" },
  { value: "OTHER", label: "Other" },
]

const SEVERITY_OPTIONS = [
  { value: "LOW", label: "Low — Minor, no injury", colour: "text-green-600" },
  { value: "MEDIUM", label: "Medium — Requires monitoring", colour: "text-yellow-600" },
  { value: "HIGH", label: "High — Injury / significant risk", colour: "text-orange-600" },
  { value: "CRITICAL", label: "Critical — Immediate action required", colour: "text-red-600" },
]

interface IncidentFormProps {
  residentId: string
  residentName: string
}

export function IncidentForm({ residentId, residentName }: IncidentFormProps) {
  const router = useRouter()
  const [bodyMapEntries, setBodyMapEntries] = useState<{ region: string; description?: string }[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const todayISO = new Date().toISOString().slice(0, 10)
  const nowTime = new Date().toTimeString().slice(0, 5)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      residentId,
      severity: "MEDIUM",
      incidentDate: todayISO,
      incidentTime: nowTime,
    },
  })

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true)
    try {
      const result = await createIncident({ ...data, bodyMapEntries })
      if (result && "error" in result) {
        toast.error(result.error)
        return
      }
      toast.success("Incident reported")
      router.push(`/residents/${residentId}?tab=incidents`)
    } catch (err) {
      if (isRedirectError(err)) throw err
      toast.error("Failed to save incident")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <input type="hidden" {...register("residentId")} />

      <div className="rounded-md bg-muted/40 border px-4 py-2 text-sm">
        Reporting incident for <strong>{residentName}</strong>
      </div>

      {/* Basic details */}
      <div className="grid gap-4">
        <FormField label="Incident Title" error={errors.title?.message} required>
          <Input {...register("title")} placeholder="e.g. Unwitnessed fall in bedroom" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Date" error={errors.incidentDate?.message} required>
            <Input type="date" {...register("incidentDate")} />
          </FormField>
          <FormField label="Time (approx)" error={errors.incidentTime?.message}>
            <Input type="time" {...register("incidentTime")} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Type" error={errors.type?.message}>
            <Select onValueChange={(v) => setValue("type", v)}>
              <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
              <SelectContent>
                {INCIDENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Severity" error={errors.severity?.message} required>
            <Select value={watch("severity")} onValueChange={(v) => setValue("severity", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <span className={s.colour}>{s.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <FormField label="Location" error={errors.location?.message}>
          <Input {...register("location")} placeholder="e.g. Bedroom, Corridor, Lounge…" />
        </FormField>
      </div>

      {/* Description */}
      <FormField label="Description of Incident" error={errors.description?.message} required>
        <Textarea
          {...register("description")}
          rows={4}
          placeholder="Describe exactly what happened, what was observed, any contributing factors…"
          className="resize-none"
        />
      </FormField>

      {/* Body map */}
      <div className="space-y-2 rounded-xl border p-4">
        <label className="text-sm font-medium">Body Map — Injury / Skin Concern</label>
        <BodyMap value={bodyMapEntries} onChange={setBodyMapEntries} />
      </div>

      {/* Witnesses & immediate action */}
      <div className="grid gap-4">
        <FormField label="Witnesses (names, roles)">
          <Input {...register("witnesses")} placeholder="e.g. Jane Smith (Senior Carer)" />
        </FormField>
        <FormField label="Immediate Action Taken" error={errors.immediateAction?.message}>
          <Textarea
            {...register("immediateAction")}
            rows={3}
            placeholder="First aid given, GP called, family notified, area secured…"
            className="resize-none"
          />
        </FormField>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Incident Report
        </Button>
      </div>
    </form>
  )
}
