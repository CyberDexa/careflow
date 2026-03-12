"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateIncidentStatus } from "@/actions/incidents"

interface Props {
  incidentId: string
  currentStatus: string
}

export function IncidentStatusUpdate({ incidentId, currentStatus }: Props) {
  const [status, setStatus] = useState(currentStatus)
  const [isPending, startTransition] = useTransition()

  function handleUpdate() {
    startTransition(async () => {
      const res = await updateIncidentStatus(incidentId, status)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success("Incident status updated")
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="OPEN">Open</SelectItem>
          <SelectItem value="UNDER_INVESTIGATION">Under Investigation</SelectItem>
          <SelectItem value="CLOSED">Closed</SelectItem>
        </SelectContent>
      </Select>
      <Button
        onClick={handleUpdate}
        disabled={isPending || status === currentStatus}
        size="sm"
        variant="outline"
        className="gap-2"
      >
        {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Update
      </Button>
    </div>
  )
}
