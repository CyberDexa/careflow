"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormField } from "@/components/ui/form-field"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { careNoteSchema, type CareNoteInput } from "@/lib/validations"
import { createCareNote } from "@/actions/care-notes"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

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

// This page is used for a quick "add note from the care notes section"
// Resident is selected via search
export default function NewCareNotePage() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [selectedResident, setSelectedResident] = useState<{ id: string; name: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CareNoteInput>({
    resolver: zodResolver(careNoteSchema),
    defaultValues: {
      residentId: "",
      shift: getCurrentShift(),
      category: "GENERAL",
    },
  })

  // Inline resident search using server action through a simple API endpoint
  // For simplicity, we'll redirect users to pick from resident list
  // (full resident picker could be added later)

  async function onSubmit(data: CareNoteInput) {
    setIsSubmitting(true)
    const result = await createCareNote(data)
    setIsSubmitting(false)
    if (result && "error" in result) {
      toast.error(result.error)
      return
    }
    toast.success("Care note saved")
    router.push("/care-notes")
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/care-notes" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">New Care Note</h1>
      </div>

      {!selectedResident ? (
        <div className="rounded-xl border p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            To add a care note, navigate to a resident's profile and use the Care Notes tab, or select from the resident list below.
          </p>
          <Link href="/residents">
            <Button variant="outline" className="w-full">
              <Search className="mr-2 h-4 w-4" /> Browse Residents
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="rounded-md border p-3 bg-muted/30 text-sm">
            Writing note for <span className="font-medium">{selectedResident.name}</span>
          </div>
          <input type="hidden" {...register("residentId")} />
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
          <FormField label="Note" error={errors.content?.message} required>
            <Textarea {...register("content")} rows={6} placeholder="Document observation, care provided, resident response..." className="resize-none" />
          </FormField>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Note
          </Button>
        </form>
      )}
    </div>
  )
}
