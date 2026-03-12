"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { MessageSquarePlus, Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { addIncidentFollowUp } from "@/actions/incidents"

interface Props {
  incidentId: string
}

export function FollowUpForm({ incidentId }: Props) {
  const [note, setNote] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!note.trim()) { toast.error("Note cannot be empty"); return }
    startTransition(async () => {
      const res = await addIncidentFollowUp(incidentId, note)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success("Follow-up note added")
        setNote("")
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageSquarePlus className="h-4 w-4" />
        Add Follow-up Note
      </div>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="Record any follow-up actions taken, investigation updates, or outcome notes…"
        className="resize-none text-sm"
        disabled={isPending}
      />
      <p className="text-xs text-muted-foreground">Follow-up notes are append-only and form part of the permanent audit trail.</p>
      <Button onClick={handleSubmit} disabled={isPending || !note.trim()} size="sm" className="gap-2">
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        Add Note
      </Button>
    </div>
  )
}
