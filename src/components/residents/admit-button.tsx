"use client"

import { useState, useTransition } from "react"
import { UserCheck, Loader2 } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateResidentStatus } from "@/actions/residents"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function AdmitResidentButton({ residentId }: { residentId: string }) {
  const [open, setOpen] = useState(false)
  const [admissionDate, setAdmissionDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [roomNumber, setRoomNumber] = useState("")
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleAdmit() {
    startTransition(async () => {
      const result = await updateResidentStatus(residentId, "ADMITTED")
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Resident admitted successfully")
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground">
          <UserCheck className="h-3.5 w-3.5 mr-1.5" />
          Admit Resident
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Admit resident</DialogTitle>
          <DialogDescription>
            Confirm admission. The resident status will be updated to Admitted.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Admission date</Label>
            <Input
              type="date"
              value={admissionDate}
              onChange={(e) => setAdmissionDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Room number (optional)</Label>
            <Input
              placeholder="e.g. 12A"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleAdmit} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirm admission
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
