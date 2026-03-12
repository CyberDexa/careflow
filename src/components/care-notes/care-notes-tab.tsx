"use client"

import { useOptimistic, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, FileText, Plus, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormField } from "@/components/ui/form-field"
import { careNoteSchema, type CareNoteInput } from "@/lib/validations"
import { createCareNote } from "@/actions/care-notes"
import { formatDate } from "@/lib/utils"

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

type NoteWithAuthor = {
  id: string
  content: string
  category: string
  shift: string
  createdAt: Date
  author: { firstName: string; lastName: string }
}

interface Props {
  residentId: string
  initialNotes: NoteWithAuthor[]
}

export function CareNotesTab({ residentId, initialNotes }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const [optimisticNotes, addOptimisticNote] = useOptimistic(
    initialNotes,
    (current, newNote: NoteWithAuthor) => [newNote, ...current],
  )

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<CareNoteInput>({
    resolver: zodResolver(careNoteSchema),
    defaultValues: {
      residentId,
      shift: getCurrentShift(),
      category: "GENERAL",
    },
  })

  async function onSubmit(data: CareNoteInput) {
    const optimisticNote: NoteWithAuthor = {
      id: `optimistic-${Date.now()}`,
      content: data.content,
      category: data.category,
      shift: data.shift,
      createdAt: new Date(),
      author: { firstName: "You", lastName: "" },
    }

    startTransition(async () => {
      addOptimisticNote(optimisticNote)
      setShowForm(false)
      reset({ residentId, shift: getCurrentShift(), category: "GENERAL", content: "" })

      const result = await createCareNote(data)
      if (result && "error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Care note saved")
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-3 mt-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant={showForm ? "outline" : "default"}
          onClick={() => setShowForm((v) => !v)}
          className="min-h-[44px]"
        >
          {showForm ? (
            <><ChevronUp className="h-4 w-4 mr-1" /> Cancel</>
          ) : (
            <><Plus className="h-3.5 w-3.5 mr-1" /> Quick Note</>
          )}
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="p-4">
            <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Category" error={errors.category?.message} required>
                  <Select value={watch("category")} onValueChange={(v) => setValue("category", v as any)}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Shift" error={errors.shift?.message} required>
                  <Select value={watch("shift")} onValueChange={(v) => setValue("shift", v as any)}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SHIFTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
              <FormField label="Note" error={errors.content?.message} required hint="Minimum 10 characters">
                <Textarea
                  {...register("content")}
                  rows={4}
                  placeholder="Document observation, care provided, resident response, any concerns..."
                  className="resize-none"
                />
              </FormField>
              <div className="flex justify-end">
                <Button type="submit" disabled={isPending} className="min-h-[44px]">
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                  Save Note
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {optimisticNotes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No care notes recorded.</p>
      ) : (
        optimisticNotes.map((note) => (
          <Card
            key={note.id}
            className={note.id.startsWith("optimistic-") ? "opacity-60" : ""}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{note.category.replace(/_/g, " ")}</Badge>
                  <Badge variant="outline" className="text-xs">{note.shift}</Badge>
                  {note.id.startsWith("optimistic-") && (
                    <span className="text-xs text-muted-foreground italic">saving…</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(note.createdAt)}</span>
              </div>
              <p className="text-sm">{note.content}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {note.author.firstName} {note.author.lastName}
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
