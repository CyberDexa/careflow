"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Heart, CheckCircle } from "lucide-react"
import { createWellbeingUpdate } from "@/actions/family"

const schema = z.object({
  mood: z.enum(["VERY_HAPPY", "HAPPY", "NEUTRAL", "SAD", "DISTRESSED"]),
  appetite: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR"]),
  sleep: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR"]),
  activityLevel: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR"]),
  note: z.string().max(500).optional(),
})

type FormData = z.infer<typeof schema>

const MOOD_OPTIONS = [
  { value: "VERY_HAPPY", label: "😄 Very Happy" },
  { value: "HAPPY", label: "😊 Happy" },
  { value: "NEUTRAL", label: "😐 Settled" },
  { value: "SAD", label: "😔 A little low" },
  { value: "DISTRESSED", label: "😢 Distressed" },
]

const LEVEL_OPTIONS = [
  { value: "EXCELLENT", label: "Excellent" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "POOR", label: "Poor" },
]

export default function WellbeingUpdateForm({ residentId }: { residentId: string }) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      mood: "HAPPY",
      appetite: "GOOD",
      sleep: "GOOD",
      activityLevel: "GOOD",
    },
  })

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      await createWellbeingUpdate({ residentId, ...data })
      setDone(true)
      setTimeout(() => {
        setDone(false)
        setOpen(false)
        reset()
      }, 1500)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-rose-200 text-rose-700 hover:bg-rose-50">
          <Heart className="w-4 h-4 mr-2" />
          Post Wellbeing Update
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" />
            Wellbeing Update
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center py-6 gap-3 text-green-600">
            <CheckCircle className="w-10 h-10" />
            <p className="font-semibold">Update published to family!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Mood today</Label>
              <Select onValueChange={(v) => setValue("mood", v as any)} defaultValue="HAPPY">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOOD_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Appetite</Label>
                <Select onValueChange={(v) => setValue("appetite", v as any)} defaultValue="GOOD">
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVEL_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sleep</Label>
                <Select onValueChange={(v) => setValue("sleep", v as any)} defaultValue="GOOD">
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVEL_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Activity</Label>
                <Select onValueChange={(v) => setValue("activityLevel", v as any)} defaultValue="GOOD">
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVEL_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Note for family <span className="text-gray-400 font-normal">(optional)</span></span>
                <span className="text-xs text-gray-400">Max 500 chars</span>
              </Label>
              <Textarea
                {...register("note")}
                placeholder="Share how they spent their day, any highlights or activities…"
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending} className="bg-rose-500 hover:bg-rose-600 text-white">
                {pending ? "Publishing…" : "Publish to family"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
