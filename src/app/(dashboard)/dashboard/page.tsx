import { Suspense } from "react"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, AlertTriangle, ClipboardList, TrendingUp, Clock, Plus, Mic, ArrowRight } from "lucide-react"
import Link from "next/link"
import { formatRelative } from "@/lib/utils"

export const metadata = { title: "Dashboard" }

async function getDashboardData(organisationId: string) {
  const [
    residentCounts,
    recentIncidents,
    recentNotes,
    pendingCarePlans,
    overdueAssessments,
  ] = await Promise.all([
    prisma.resident.groupBy({
      by: ["status"],
      where: { organisationId, deletedAt: null },
      _count: true,
    }),
    prisma.incident.findMany({
      where: { organisationId },
      include: { resident: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.careNote.findMany({
      where: { organisationId, deletedAt: null },
      include: { resident: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.carePlan.count({
      where: { organisationId, status: "PENDING_APPROVAL", deletedAt: null },
    }),
    prisma.residentAssessment.count({
      where: {
        resident: { organisationId },
        status: "IN_PROGRESS",
        reviewDate: { lt: new Date() },
      },
    }),
  ])

  const admitted = residentCounts.find((r: any) => r.status === "ADMITTED")?._count || 0
  const enquiry = residentCounts.find((r: any) => r.status === "ENQUIRY")?._count || 0
  const preAssessed = residentCounts.find((r: any) => r.status === "PRE_ASSESSED")?._count || 0
  const total = residentCounts.reduce((s: any, r: any) => s + r._count, 0)

  return { admitted, enquiry, preAssessed, total, recentIncidents, recentNotes, pendingCarePlans, overdueAssessments }
}

const severityVariant: Record<string, "danger" | "warning" | "secondary" | "destructive"> = {
  CRITICAL: "danger",
  HIGH: "danger",
  MEDIUM: "warning",
  LOW: "secondary",
}

export default async function DashboardPage() {
  const session = await auth()
  const user = session!.user as any

  const data = await getDashboardData(user.organisationId)

  return (
    <div className="space-y-8 animate-in relative">
      {/* Gradient orbs — decorative background */}
      <div className="gradient-orb gradient-orb-1" />
      <div className="gradient-orb gradient-orb-2" />
      <div className="gradient-orb gradient-orb-3" />

      {/* Greeting */}
      <div className="relative z-10">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Good {getGreeting()},{" "}
          <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
            {user.name?.split(" ")[0]}
          </span>
        </h1>
        <p className="text-white/40 mt-1 text-sm">Here&apos;s what needs attention today.</p>
      </div>

      {/* Alert banner */}
      {(data.pendingCarePlans > 0 || data.overdueAssessments > 0) && (
        <div className="relative z-10 rounded-xl glass-card border-amber-500/20 p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div className="space-y-1 text-sm">
              {data.pendingCarePlans > 0 && (
                <p className="text-amber-200/90">
                  <strong className="text-amber-400">{data.pendingCarePlans}</strong> care plan{data.pendingCarePlans > 1 ? "s" : ""} pending approval
                </p>
              )}
              {data.overdueAssessments > 0 && (
                <p className="text-amber-200/90">
                  <strong className="text-amber-400">{data.overdueAssessments}</strong> assessment{data.overdueAssessments > 1 ? "s" : ""} overdue
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats — each card with unique gradient theme */}
      <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Current Residents"
          value={data.admitted}
          icon={<Users className="h-5 w-5" />}
          href="/residents?status=ADMITTED"
          gradient="cyan"
          iconColor="text-cyan-400"
          accentColor="from-cyan-400 to-cyan-600"
        />
        <StatCard
          title="Enquiries"
          value={data.enquiry}
          icon={<TrendingUp className="h-5 w-5" />}
          href="/residents?status=ENQUIRY"
          gradient="violet"
          iconColor="text-violet-400"
          accentColor="from-violet-400 to-violet-600"
        />
        <StatCard
          title="Pre-Assessed"
          value={data.preAssessed}
          icon={<ClipboardList className="h-5 w-5" />}
          href="/residents?status=PRE_ASSESSED"
          gradient="amber"
          iconColor="text-amber-400"
          accentColor="from-amber-400 to-orange-500"
        />
        <StatCard
          title="Open Incidents"
          value={data.recentIncidents.filter((i: any) => i.status === "OPEN").length}
          icon={<AlertTriangle className="h-5 w-5" />}
          href="/incidents?status=OPEN"
          gradient="rose"
          iconColor="text-rose-400"
          accentColor="from-rose-400 to-pink-500"
        />
      </div>

      {/* Quick actions */}
      <div className="relative z-10 flex flex-wrap gap-3">
        <Button asChild size="sm" className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white border-0 hover:from-cyan-400 hover:to-teal-400 shadow-lg shadow-cyan-500/20 transition-all duration-300 hover:shadow-cyan-500/40 hover:-translate-y-0.5">
          <Link href="/residents/new"><Plus className="h-4 w-4 mr-1" /> Add Resident</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/70 hover:text-white transition-all duration-200">
          <Link href="/care-notes/new"><Plus className="h-4 w-4 mr-1" /> Care Note</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/70 hover:text-white transition-all duration-200">
          <Link href="/incidents/new"><AlertTriangle className="h-4 w-4 mr-1" /> Report Incident</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/70 hover:text-white transition-all duration-200">
          <Link href="/handover"><Mic className="h-4 w-4 mr-1" /> Generate Handover</Link>
        </Button>
      </div>

      {/* Two-column grid for recent activity */}
      <div className="relative z-10 grid lg:grid-cols-2 gap-6">
        {/* Recent incidents */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white/90">Recent Incidents</h3>
            <Link href="/incidents" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="p-3 space-y-2">
            {data.recentIncidents.length === 0 ? (
              <p className="text-sm text-white/30 py-4 text-center">No incidents recorded.</p>
            ) : (
              data.recentIncidents.map((incident: any) => (
                <Link
                  key={incident.id}
                  href={`/incidents/${incident.id}`}
                  className="flex items-center justify-between rounded-lg p-3 hover:bg-white/[0.04] transition-all duration-200 group cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/85 group-hover:text-white transition-colors">
                      {incident.resident.firstName} {incident.resident.lastName}
                    </p>
                    <p className="text-xs text-white/35">{incidentTypeLabel(incident.type)} · {formatRelative(incident.createdAt)}</p>
                  </div>
                  <Badge variant={severityVariant[incident.severity] || "secondary"} className="ml-2 shrink-0">
                    {incident.severity}
                  </Badge>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent care notes */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white/90">Recent Care Notes</h3>
            <Link href="/care-notes" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="p-3 space-y-2">
            {data.recentNotes.length === 0 ? (
              <p className="text-sm text-white/30 py-4 text-center">No care notes today.</p>
            ) : (
              data.recentNotes.map((note: any) => (
                <div key={note.id} className="rounded-lg p-3 hover:bg-white/[0.04] transition-all duration-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-white/85">
                      {note.resident.firstName} {note.resident.lastName}
                    </p>
                    <Badge variant="secondary" className="text-xs">{shiftLabel(note.shift)}</Badge>
                  </div>
                  <p className="text-xs text-white/35 line-clamp-2">{note.content}</p>
                  <p className="text-xs text-white/25 mt-1">{formatRelative(note.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, href, gradient, iconColor, accentColor }: {
  title: string
  value: number
  icon: React.ReactNode
  href: string
  gradient: string
  iconColor: string
  accentColor: string
}) {
  return (
    <Link href={href}>
      <div className={`stat-card stat-card-${gradient} glass-card rounded-xl p-5 cursor-pointer group`}>
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${accentColor} bg-opacity-15 shadow-lg`}>
            <span className={iconColor}>{icon}</span>
          </div>
        </div>
        <div className="text-3xl font-extrabold text-white tracking-tight">{value}</div>
        <div className="text-xs text-white/40 mt-1 font-medium tracking-wide uppercase">{title}</div>
      </div>
    </Link>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "morning"
  if (h < 17) return "afternoon"
  return "evening"
}

function incidentTypeLabel(type: string) {
  const labels: Record<string, string> = {
    FALL: "Fall", MEDICATION_ERROR: "Medication error", SKIN_INTEGRITY: "Skin integrity",
    BEHAVIOURAL: "Behavioural", SAFEGUARDING: "Safeguarding", HEALTH_DETERIORATION: "Health deterioration",
    NEAR_MISS: "Near miss", COMPLAINT: "Complaint", ENVIRONMENTAL: "Environmental", OTHER: "Other",
  }
  return labels[type] || type
}

function shiftLabel(shift: string) {
  return { MORNING: "AM", AFTERNOON: "PM", NIGHT: "Night" }[shift] || shift
}
