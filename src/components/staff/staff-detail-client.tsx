"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft, GraduationCap, CalendarDays, ClipboardList,
  CheckCircle, XCircle, AlertTriangle, Plus, Loader2, User
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import {
  upsertTrainingRecord, createSupervisionLog, upsertStaffProfile
} from "@/actions/staff"

const TRAINING_TYPES = [
  { value: "MOVING_AND_HANDLING", label: "Moving & Handling" },
  { value: "SAFEGUARDING_ADULTS", label: "Safeguarding Adults" },
  { value: "FIRE_SAFETY", label: "Fire Safety" },
  { value: "INFECTION_CONTROL", label: "Infection Control" },
  { value: "FIRST_AID", label: "First Aid" },
  { value: "FOOD_HYGIENE", label: "Food Hygiene" },
  { value: "DEMENTIA_AWARENESS", label: "Dementia Awareness" },
  { value: "MENTAL_CAPACITY_ACT", label: "Mental Capacity Act" },
  { value: "MEDICATION_MANAGEMENT", label: "Medication Management" },
  { value: "DATA_PROTECTION", label: "Data Protection" },
  { value: "HEALTH_AND_SAFETY", label: "Health & Safety" },
  { value: "EQUALITY_AND_DIVERSITY", label: "Equality & Diversity" },
]

interface Props {
  staffUser: any
  currentUserId: string
}

export function StaffDetailClient({ staffUser, currentUserId }: Props) {
  const router = useRouter()
  const [trainingDialog, setTrainingDialog] = useState<string | null>(null)
  const [supervisionDialog, setSupervisionDialog] = useState(false)
  const [saving, setSaving] = useState(false)

  const profile = staffUser.staffProfile
  const now = new Date()
  const warnDate = new Date(now.getTime() + 30 * 86400000)

  function getTrainingRecord(type: string) {
    return profile?.trainingRecords?.find((r: any) => r.trainingType === type)
  }

  function trainingStatus(record: any) {
    if (!record?.isCompleted) return "missing"
    if (!record.expiresAt) return "ok"
    const exp = new Date(record.expiresAt)
    if (exp < now) return "expired"
    if (exp <= warnDate) return "expiring"
    return "ok"
  }

  const completedCount = TRAINING_TYPES.filter(
    (t) => trainingStatus(getTrainingRecord(t.value)) === "ok" || trainingStatus(getTrainingRecord(t.value)) === "expiring"
  ).length
  const trainingPct = Math.round((completedCount / TRAINING_TYPES.length) * 100)

  async function handleSaveTraining(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!trainingDialog || !profile) return
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    const result = await upsertTrainingRecord({
      staffProfileId: profile.id,
      trainingType: trainingDialog,
      completedAt: fd.get("completedAt") as string,
      expiresAt: fd.get("expiresAt") as string,
      notes: fd.get("notes") as string,
      isCompleted: true,
    })
    setSaving(false)
    if ("error" in result) { toast.error(result.error); return }
    toast.success("Training record saved")
    setTrainingDialog(null)
    router.refresh()
  }

  async function handleSaveSupervision(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    const result = await createSupervisionLog({
      staffProfileId: profile.id,
      supervisorId: currentUserId,
      supervisedAt: fd.get("supervisedAt") as string,
      nextDueAt: fd.get("nextDueAt") as string,
      summary: fd.get("summary") as string,
      actionPoints: fd.get("actionPoints") as string,
    })
    setSaving(false)
    if ("error" in result) { toast.error(result.error); return }
    toast.success("Supervision log saved")
    setSupervisionDialog(false)
    router.refresh()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/staff">
          <button type="button" className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
          {staffUser.firstName[0]}{staffUser.lastName[0]}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{staffUser.firstName} {staffUser.lastName}</h1>
          <p className="text-sm text-gray-500">{staffUser.jobTitle || staffUser.role}</p>
        </div>
      </div>

      <Tabs defaultValue="training">
        <TabsList>
          <TabsTrigger value="training" className="gap-1.5">
            <GraduationCap className="h-4 w-4" />Training
          </TabsTrigger>
          <TabsTrigger value="supervision" className="gap-1.5">
            <ClipboardList className="h-4 w-4" />Supervision
          </TabsTrigger>
          <TabsTrigger value="rota" className="gap-1.5">
            <CalendarDays className="h-4 w-4" />Rota
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-4 w-4" />Profile
          </TabsTrigger>
        </TabsList>

        {/* Training Matrix */}
        <TabsContent value="training" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Training Compliance</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{trainingPct}% complete</span>
                  <div className="w-24">
                    <Progress value={trainingPct} className="h-2" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {TRAINING_TYPES.map((t) => {
                  const record = getTrainingRecord(t.value)
                  const status = trainingStatus(record)
                  return (
                    <div
                      key={t.value}
                      className="flex items-center justify-between py-2 px-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setTrainingDialog(t.value)}
                    >
                      <div className="flex items-center gap-2">
                        {status === "ok" && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {status === "expiring" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                        {(status === "missing" || status === "expired") && <XCircle className="h-4 w-4 text-red-400" />}
                        <span className="text-sm text-gray-800">{t.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {record?.completedAt && (
                          <span className="text-xs text-gray-400">
                            {new Date(record.completedAt).toLocaleDateString("en-GB")}
                          </span>
                        )}
                        {status === "expired" && (
                          <Badge variant="destructive" className="text-xs">Expired</Badge>
                        )}
                        {status === "expiring" && (
                          <Badge className="text-xs bg-amber-100 text-amber-800">Expiring soon</Badge>
                        )}
                        {status === "missing" && (
                          <Badge variant="outline" className="text-xs text-gray-400">Not recorded</Badge>
                        )}
                        {status === "ok" && record?.expiresAt && (
                          <span className="text-xs text-gray-400">
                            Exp. {new Date(record.expiresAt).toLocaleDateString("en-GB")}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Supervision */}
        <TabsContent value="supervision" className="mt-4">
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setSupervisionDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Log Supervision
              </Button>
            </div>
            {profile?.supervisionLogs?.length ? (
              profile.supervisionLogs.map((log: any) => (
                <Card key={log.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(log.supervisedAt).toLocaleDateString("en-GB", {
                            day: "numeric", month: "long", year: "numeric"
                          })}
                        </p>
                        {log.nextDueAt && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Next due: {new Date(log.nextDueAt).toLocaleDateString("en-GB")}
                          </p>
                        )}
                      </div>
                      {log.nextDueAt && new Date(log.nextDueAt) < now && (
                        <Badge variant="destructive" className="text-xs">Next session overdue</Badge>
                      )}
                    </div>
                    {log.summary && (
                      <p className="text-sm text-gray-600 mt-2">{log.summary}</p>
                    )}
                    {log.actionPoints && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                        <span className="font-medium">Action points: </span>{log.actionPoints}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-gray-400">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No supervision logs recorded</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Rota */}
        <TabsContent value="rota" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Shifts (last 28 days)</CardTitle>
            </CardHeader>
            <CardContent>
              {profile?.rotaShifts?.length ? (
                <div className="space-y-2">
                  {profile.rotaShifts.map((shift: any) => (
                    <div key={shift.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm text-gray-700">
                        {new Date(shift.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{shift.shiftType}</Badge>
                        <span className="text-xs text-gray-500">{shift.startTime}–{shift.endTime}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-center text-gray-400 py-6">No shifts in the last 28 days</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile */}
        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardContent className="pt-4 space-y-3">
              {[
                ["Email", staffUser.email],
                ["Role", staffUser.role],
                ["Employee Ref", profile?.employeeRef || "—"],
                ["Start Date", profile?.startDate ? new Date(profile.startDate).toLocaleDateString("en-GB") : "—"],
                ["Contracted Hours", profile?.contractedHours ? `${profile.contractedHours}h/week` : "—"],
                ["DBS Number", profile?.dbs || "—"],
                ["DBS Expiry", profile?.dbsExpiry ? new Date(profile.dbsExpiry).toLocaleDateString("en-GB") : "—"],
                ["Emergency Contact", profile?.emergencyName ? `${profile.emergencyName} — ${profile.emergencyPhone}` : "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="text-xs text-gray-500 w-32 flex-shrink-0 pt-0.5">{label}</span>
                  <span className="text-sm text-gray-800">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Training Dialog */}
      <Dialog open={!!trainingDialog} onOpenChange={() => setTrainingDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {TRAINING_TYPES.find((t) => t.value === trainingDialog)?.label}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveTraining} className="space-y-3">
            <div>
              <Label className="text-xs">Completed On</Label>
              <Input type="date" name="completedAt"
                defaultValue={getTrainingRecord(trainingDialog || "")?.completedAt?.toString().slice(0, 10)}
              />
            </div>
            <div>
              <Label className="text-xs">Expiry Date</Label>
              <Input type="date" name="expiresAt"
                defaultValue={getTrainingRecord(trainingDialog || "")?.expiresAt?.toString().slice(0, 10)}
              />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea name="notes" rows={2}
                defaultValue={getTrainingRecord(trainingDialog || "")?.notes || ""}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Supervision Dialog */}
      <Dialog open={supervisionDialog} onOpenChange={setSupervisionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Supervision Session</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSupervision} className="space-y-3">
            <div>
              <Label className="text-xs">Date of Supervision *</Label>
              <Input type="date" name="supervisedAt" required
                defaultValue={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div>
              <Label className="text-xs">Next Due Date</Label>
              <Input type="date" name="nextDueAt" />
            </div>
            <div>
              <Label className="text-xs">Summary</Label>
              <Textarea name="summary" rows={3} placeholder="Key discussion points…" />
            </div>
            <div>
              <Label className="text-xs">Action Points</Label>
              <Textarea name="actionPoints" rows={2} placeholder="Actions agreed…" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Save Supervision Log
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
