"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { MessageSquare, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { addCarePlanProgressNote } from "@/actions/care-plans"
import { formatDate } from "@/lib/utils"

interface ProgressNote {
  id: string
  note: string
  createdAt: Date
  authorName?: string
}

interface Props {
  carePlanId: string
  notes: ProgressNote[]
}

export function CarePlanProgressNotesPanel({ carePlanId, notes: initialNotes }: Props) {
  const [notes, setNotes] = useState(initialNotes)
  const [text, setText] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    if (!text.trim()) return
    startTransition(async () => {
      const result = await addCarePlanProgressNote(carePlanId, text)
      if ("error" in result && result.error) {
        toast.error(result.error)
        return
      }
      setNotes((prev) => [
        ...prev,
        { id: Date.now().toString(), note: text.trim(), createdAt: new Date(), authorName: "You" },
      ])
      setText("")
      toast.success("Progress note added")
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Progress Notes ({notes.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing notes timeline */}
        {notes.length > 0 ? (
          <div className="space-y-3">
            {notes.map((n) => (
              <div key={n.id} className="flex gap-3 text-sm">
                <div className="mt-1 h-2 w-2 rounded-full bg-primary/40 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="leading-relaxed">{n.note}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {n.authorName && <span>{n.authorName} · </span>}
                    {formatDate(n.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No progress notes yet.</p>
        )}

        {/* Add note form */}
        <div className="border-t pt-4 space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a progress note… (e.g. resident responded well to repositioning schedule, wound improved)"
            rows={3}
            disabled={isPending}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleAdd} disabled={isPending || !text.trim()}>
              {isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Add Note
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
