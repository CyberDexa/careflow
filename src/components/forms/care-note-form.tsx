"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, FileText, Mic, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormField } from "@/components/ui/form-field"
import { careNoteSchema, type CareNoteInput } from "@/lib/validations"
import { createCareNote } from "@/actions/care-notes"
import { VoiceRecorder, type VoiceResult } from "@/components/voice/voice-recorder"

const CATEGORIES = [
  { value: "PERSONAL_CARE", label: "Personal Care" },
  { value: "FOOD_FLUID", label: "Food & Fluid" },
  { value: "MOBILITY", label: "Mobility" },
  { value: "WELLBEING", label: "Wellbeing" },
  { value: "BEHAVIOUR", label: "Behaviour" },
  { value: "HEALTH_CONCERN", label: "Health Concern" },
  { value: "SOCIAL", label: "Social" },
  { value: "SLEEP", label: "Sleep" },
  { value: "CONTINENCE", label: "Continence" },
  { value: "GENERAL", label: "General" },
]

const SHIFTS = [
  { value: "MORNING", label: "Morning (07:00–15:00)" },
  { value: "AFTERNOON", label: "Afternoon (15:00–23:00)" },
  { value: "NIGHT", label: "Night (23:00–07:00)" },
]

function getCurrentShift() {
  const hour = new Date().getHours()
  if (hour >= 7 && hour < 15) return "MORNING"
  if (hour >= 15 && hour < 23) return "AFTERNOON"
  return "NIGHT"
}

interface Props {
  residentId: string
  residentName?: string
  onSuccess?: () => void
}

export function CareNoteForm({ residentId, residentName, onSuccess }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showVoice, setShowVoice] = useState(false)
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<CareNoteInput>({
    resolver: zodResolver(careNoteSchema),
    defaultValues: {
      residentId,
      shift: getCurrentShift(),
      category: "GENERAL",
    },
  })

  function handleVoiceResult(result: VoiceResult) {
    setValue("content", result.content)
    setValue("category", result.category as CareNoteInput["category"])
    setShowVoice(false)
    toast.success("Voice note structured — review and save")
  }

  async function onSubmit(data: CareNoteInput) {
    setIsSubmitting(true)
    const result = await createCareNote(data)
    setIsSubmitting(false)
    if (result && "error" in result) {
      toast.error(result.error)
      return
    }
    toast.success("Care note saved")
    reset({ residentId, shift: getCurrentShift(), category: "GENERAL", content: "" })
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {residentName && (
        <p className="text-sm text-muted-foreground">
          Writing note for <span className="font-medium text-foreground">{residentName}</span>
        </p>
      )}

      {/* Voice Input Toggle */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowVoice((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          {showVoice ? <X className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
          {showVoice ? "Close voice" : "Voice input"}
        </button>
      </div>

      {showVoice && (
        <VoiceRecorder
          onResult={handleVoiceResult}
          onCancel={() => setShowVoice(false)}
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Category" error={errors.category?.message} required>
          <Select value={watch("category")} onValueChange={(v) => setValue("category", v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Shift" error={errors.shift?.message} required>
          <Select value={watch("shift")} onValueChange={(v) => setValue("shift", v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SHIFTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
      </div>
      <FormField label="Note" error={errors.content?.message} required hint="Minimum 10 characters">
        <Textarea
          {...register("content")}
          rows={5}
          placeholder="Document observation, care provided, resident response, any concerns..."
          className="resize-none"
        />
      </FormField>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
          Save Note
        </Button>
      </div>
    </form>
  )
}
