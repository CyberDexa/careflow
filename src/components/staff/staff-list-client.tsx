"use client"

import { useState } from "react"
import Link from "next/link"
import { Users, GraduationCap, AlertTriangle, CheckCircle, Clock, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"

const TRAINING_LABELS: Record<string, string> = {
  MOVING_AND_HANDLING: "Moving & Handling",
  SAFEGUARDING_ADULTS: "Safeguarding Adults",
  FIRE_SAFETY: "Fire Safety",
  INFECTION_CONTROL: "Infection Control",
  FIRST_AID: "First Aid",
  FOOD_HYGIENE: "Food Hygiene",
  DEMENTIA_AWARENESS: "Dementia Awareness",
  MENTAL_CAPACITY_ACT: "Mental Capacity Act",
  MEDICATION_MANAGEMENT: "Medication Management",
  DATA_PROTECTION: "Data Protection",
  HEALTH_AND_SAFETY: "Health & Safety",
  EQUALITY_AND_DIVERSITY: "Equality & Diversity",
}

const ROLE_LABELS: Record<string, string> = {
  MANAGER: "Manager",
  SENIOR_CARER: "Senior Carer",
  CARE_STAFF: "Care Staff",
  ADMIN: "Admin",
}

interface StaffUser {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  jobTitle: string | null
  staffProfile: {
    id: string
    trainingRecords: { trainingType: string; isCompleted: boolean; expiresAt: Date | null }[]
    supervisionLogs: { supervisedAt: Date; nextDueAt: Date | null }[]
  } | null
}

interface Props {
  initialStaff: StaffUser[]
  orgTrainingPercent: number
}

export function StaffListClient({ initialStaff, orgTrainingPercent }: Props) {
  const [search, setSearch] = useState("")

  const TRAINING_COUNT = Object.keys(TRAINING_LABELS).length
  const now = new Date()
  const warnDate = new Date(now.getTime() + 30 * 86400000)

  const filtered = initialStaff.filter((s) => {
    const q = search.toLowerCase()
    return (
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.jobTitle || "").toLowerCase().includes(q)
    )
  })

  function getTrainingStatus(staff: StaffUser) {
    if (!staff.staffProfile) return { completed: 0, expired: 0, expiringSoon: 0 }
    const records = staff.staffProfile.trainingRecords
    return {
      completed: records.filter((r) => r.isCompleted).length,
      expired: records.filter((r) => r.isCompleted && r.expiresAt && new Date(r.expiresAt) < now).length,
      expiringSoon: records.filter(
        (r) =>
          r.isCompleted &&
          r.expiresAt &&
          new Date(r.expiresAt) >= now &&
          new Date(r.expiresAt) <= warnDate
      ).length,
    }
  }

  function getSupervisionStatus(staff: StaffUser) {
    if (!staff.staffProfile?.supervisionLogs.length) return "overdue"
    const last = staff.staffProfile.supervisionLogs[0]
    const nextDue = last.nextDueAt ? new Date(last.nextDueAt) : null
    if (!nextDue) return "ok"
    return nextDue < now ? "overdue" : nextDue <= warnDate ? "due-soon" : "ok"
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{initialStaff.length}</p>
                <p className="text-xs text-gray-500">Active Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{orgTrainingPercent}%</p>
                <p className="text-xs text-gray-500">Training Compliance</p>
              </div>
            </div>
            <Progress value={orgTrainingPercent} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {initialStaff.filter((s) => getSupervisionStatus(s) === "overdue").length}
                </p>
                <p className="text-xs text-gray-500">Supervision Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Input
        placeholder="Search staff by name, email, or job title…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Staff list */}
      <div className="space-y-2">
        {filtered.map((staff) => {
          const { completed, expired, expiringSoon } = getTrainingStatus(staff)
          const supStatus = getSupervisionStatus(staff)
          const trainingPct = Math.round((completed / TRAINING_COUNT) * 100)

          return (
            <Link key={staff.id} href={`/staff/${staff.id}`}>
              <div className="flex items-center justify-between bg-white border rounded-xl px-4 py-3 hover:border-violet-200 hover:bg-violet-50/30 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                    {staff.firstName[0]}{staff.lastName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {staff.firstName} {staff.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{staff.jobTitle || ROLE_LABELS[staff.role] || staff.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Training */}
                  <div className="hidden sm:flex items-center gap-1.5">
                    <div className="w-16">
                      <Progress value={trainingPct} className="h-1.5" />
                    </div>
                    <span className="text-xs text-gray-500">{trainingPct}%</span>
                    {expired > 0 && (
                      <Badge variant="destructive" className="text-xs py-0 px-1.5">{expired} expired</Badge>
                    )}
                    {expiringSoon > 0 && expired === 0 && (
                      <Badge className="text-xs py-0 px-1.5 bg-amber-100 text-amber-800">{expiringSoon} expiring</Badge>
                    )}
                  </div>

                  {/* Supervision */}
                  <div className="hidden sm:block">
                    {supStatus === "overdue" ? (
                      <Badge variant="destructive" className="text-xs">Supervision overdue</Badge>
                    ) : supStatus === "due-soon" ? (
                      <Badge className="text-xs bg-amber-100 text-amber-800">Supervision due</Badge>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle className="h-3 w-3" /> Supervision OK
                      </span>
                    )}
                  </div>

                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </Link>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No staff members found</p>
          </div>
        )}
      </div>
    </div>
  )
}
