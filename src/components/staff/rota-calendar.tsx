"use client"

import { useState, useTransition } from "react"
import { addDays, format, startOfWeek } from "date-fns"
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { createRotaShift, deleteRotaShift, getWeekRota } from "@/actions/staff"

const SHIFT_COLORS: Record<string, string> = {
  MORNING: "bg-amber-100 text-amber-800 border-amber-200",
  AFTERNOON: "bg-blue-100 text-blue-800 border-blue-200",
  NIGHT: "bg-indigo-100 text-indigo-800 border-indigo-200",
}

interface RotaShift {
  id: string
  date: Date
  shiftType: string
  startTime: string
  endTime: string
  role: string | null
  staffProfile: {
    user: { firstName: string; lastName: string; role: string }
  }
}

interface StaffUser {
  id: string
  firstName: string
  lastName: string
  staffProfile: { id: string } | null
}

interface Props {
  initialShifts: RotaShift[]
  allStaff: StaffUser[]
  initialWeekStart: string
}

export function RotaCalendar({ initialShifts, allStaff, initialWeekStart }: Props) {
  const [weekStart, setWeekStart] = useState(initialWeekStart)
  const [shifts, setShifts] = useState(initialShifts)
  const [addDialog, setAddDialog] = useState<{ date: string; shift: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(weekStart), i)
    return { key: d.toISOString().split("T")[0], label: format(d, "EEE do") }
  })

  function getShiftsForDay(dateKey: string, shiftType: string) {
    return shifts.filter(
      (s) =>
        new Date(s.date).toISOString().split("T")[0] === dateKey &&
        s.shiftType === shiftType
    )
  }

  function navigateWeek(delta: number) {
    const d = addDays(new Date(weekStart), delta * 7)
    const newWeekStart = d.toISOString().split("T")[0]
    setWeekStart(newWeekStart)
    startTransition(async () => {
      const result = await getWeekRota(newWeekStart)
      if ("shifts" in result) setShifts(result.shifts as any)
    })
  }

  async function handleAddShift(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!addDialog) return
    const fd = new FormData(e.currentTarget)
    const staffId = fd.get("staffProfileId") as string

    // Find the staffProfile id
    const staffUser = allStaff.find((s) => s.id === staffId)
    if (!staffUser?.staffProfile) {
      toast.error("Staff member has no profile set up yet")
      return
    }

    const result = await createRotaShift({
      staffProfileId: staffUser.staffProfile.id,
      date: addDialog.date,
      shiftType: addDialog.shift as any,
      startTime: fd.get("startTime") as string,
      endTime: fd.get("endTime") as string,
      role: fd.get("role") as string,
    })
    if ("error" in result) { toast.error(result.error as string); return }
    toast.success("Shift added")
    setAddDialog(null)
    const refreshed = await getWeekRota(weekStart)
    if ("shifts" in refreshed) setShifts(refreshed.shifts as any)
  }

  async function handleDelete(shiftId: string) {
    const result = await deleteRotaShift(shiftId)
    if ("error" in result) { toast.error(result.error as string); return }
    setShifts((prev) => prev.filter((s) => s.id !== shiftId))
  }

  return (
    <div className="space-y-4">
      {/* Week nav */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigateWeek(-1)} disabled={isPending}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-gray-700">
          Week of {format(new Date(weekStart), "d MMM yyyy")}
        </span>
        <Button variant="outline" size="sm" onClick={() => navigateWeek(1)} disabled={isPending}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr>
              <th className="w-24 text-left text-xs text-gray-500 font-medium pb-2">Shift</th>
              {days.map((d) => (
                <th key={d.key} className="text-center text-xs text-gray-600 font-medium pb-2 px-1">
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {["MORNING", "AFTERNOON", "NIGHT"].map((shiftType) => (
              <tr key={shiftType}>
                <td className="py-1 pr-2">
                  <Badge className={`text-xs ${SHIFT_COLORS[shiftType]}`}>{shiftType}</Badge>
                </td>
                {days.map((d) => {
                  const dayShifts = getShiftsForDay(d.key, shiftType)
                  return (
                    <td key={d.key} className="py-1 px-1 align-top">
                      <div className="min-h-[60px] bg-gray-50 rounded-lg p-1 space-y-1">
                        {dayShifts.map((s) => (
                          <div
                            key={s.id}
                            className={`text-xs rounded px-1.5 py-1 border flex items-center justify-between gap-1 ${SHIFT_COLORS[shiftType]}`}
                          >
                            <span className="truncate">
                              {s.staffProfile?.user?.firstName?.[0]}. {s.staffProfile?.user?.lastName}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDelete(s.id)}
                              className="opacity-50 hover:opacity-100"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setAddDialog({ date: d.key, shift: shiftType })}
                          className="w-full text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-0.5 py-0.5 rounded hover:bg-gray-100 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Shift Dialog */}
      <Dialog open={!!addDialog} onOpenChange={() => setAddDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {addDialog?.shift} Shift — {addDialog?.date}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddShift} className="space-y-3">
            <div>
              <Label className="text-xs">Staff Member *</Label>
              <Select name="staffProfileId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff…" />
                </SelectTrigger>
                <SelectContent>
                  {allStaff.filter((s) => s.staffProfile).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Start Time *</Label>
                <Input type="time" name="startTime" required
                  defaultValue={
                    addDialog?.shift === "MORNING" ? "07:00" :
                    addDialog?.shift === "AFTERNOON" ? "15:00" : "23:00"
                  }
                />
              </div>
              <div>
                <Label className="text-xs">End Time *</Label>
                <Input type="time" name="endTime" required
                  defaultValue={
                    addDialog?.shift === "MORNING" ? "15:00" :
                    addDialog?.shift === "AFTERNOON" ? "23:00" : "07:00"
                  }
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Role/Notes</Label>
              <Input type="text" name="role" placeholder="e.g. Lead senior carer" />
            </div>
            <DialogFooter>
              <Button type="submit">Add Shift</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
