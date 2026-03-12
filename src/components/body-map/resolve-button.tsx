"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { resolveBodyMapEntry } from "@/actions/body-map"
import { toast } from "sonner"

export function ResolveButtonClient({ entryId }: { entryId: string }) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState("")
  const [pending, startTransition] = useTransition()

  function handleResolve() {
    startTransition(async () => {
      const result = await resolveBodyMapEntry(entryId, notes)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Entry resolved")
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0">
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
          Resolve
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve body map entry</DialogTitle>
          <DialogDescription>
            Mark this injury/observation as resolved. Add any resolution notes (optional).
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Resolution notes, e.g. 'Wound fully healed, no further treatment required'"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleResolve} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Mark resolved
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
