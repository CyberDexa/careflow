import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { subDays, startOfMonth } from "date-fns"
import { AlertTriangle, ClipboardCheck, FileText, TrendingDown, TrendingUp, Users, Shield, Calendar } from "lucide-react"
import Link from "next/link"

interface StatCardProps {
  label: string
  value: string | number
  sublabel?: string
  icon: React.ReactNode
  variant?: "default" | "warning" | "error" | "success"
  href?: string
}

function StatCard({ label, value, sublabel, icon, variant = "default", href }: StatCardProps) {
  const variantStyles = {
    default: "border-border",
    warning: "border-yellow-200 bg-yellow-50/40",
    error: "border-red-200 bg-red-50/40",
    success: "border-green-200 bg-green-50/40",
  }
  const iconStyles = {
    default: "text-muted-foreground",
    warning: "text-yellow-600",
    error: "text-red-600",
    success: "text-green-600",
  }
  const card = (
    <div className={`rounded-xl border p-5 space-y-3 ${variantStyles[variant]} ${href ? "hover:shadow-sm transition-shadow cursor-pointer" : ""}`}>
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <span className={iconStyles[variant]}>{icon}</span>
      </div>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
    </div>
  )
  if (href) return <Link href={href}>{card}</Link>
  return card
}

export default async function CompliancePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const user = session.user as any
  const orgId = user.organisationId as string
  const now = new Date()
  const thirtyDaysAgo = subDays(now, 30)
  const monthStart = startOfMonth(now)
  const ninetyDaysAhead = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  const [
    totalResidents,
    activeResidents,
    assessmentsThisMonth,
    overdueAssessments,
    missingMonthlyReviews,
    openIncidents,
    criticalIncidents,
    incidentsThisMonth,
    draftCarePlans,
    activeCarePlans,
    careNotesThisWeek,
    recentAuditLogs,
    handoverReportsThisMonth,
  ] = await Promise.all([
    prisma.resident.count({ where: { organisationId: orgId } }),
    prisma.resident.count({ where: { organisationId: orgId, status: "ADMITTED" } }),
    prisma.residentAssessment.count({
      where: { resident: { organisationId: orgId }, completedAt: { gte: monthStart }, status: "APPROVED" },
    }),
    // Residents without any completed assessment in the last 90 days
    prisma.resident.count({
      where: {
        organisationId: orgId,
        status: "ADMITTED",
        assessments: {
          none: { completedAt: { gte: subDays(now, 90) }, status: "APPROVED" },
        },
      },
    }),
    // AMBER/RED: ADMITTED residents with no assessment in last 30 days (monthly review due)
    prisma.resident.count({
      where: {
        organisationId: orgId,
        status: "ADMITTED",
        assessments: {
          none: { completedAt: { gte: thirtyDaysAgo }, status: "APPROVED" },
        },
      },
    }),
    prisma.incident.count({ where: { organisationId: orgId, status: "OPEN" } }),
    prisma.incident.count({ where: { organisationId: orgId, severity: "CRITICAL", status: { not: "CLOSED" } } }),
    prisma.incident.count({ where: { organisationId: orgId, occurredAt: { gte: monthStart } } }),
    prisma.carePlan.count({ where: { organisationId: orgId, status: "DRAFT" } }),
    prisma.carePlan.count({ where: { organisationId: orgId, status: "ACTIVE" } }),
    prisma.careNote.count({ where: { organisationId: orgId, createdAt: { gte: subDays(now, 7) } } }),
    prisma.auditLog.findMany({
      where: { organisationId: orgId },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.handoverReport.count({ where: { organisationId: orgId, createdAt: { gte: monthStart } } }),
  ])

  const complianceScore = Math.round(
    ((activeResidents - overdueAssessments) / Math.max(activeResidents, 1)) * 30 +
    ((activeResidents - missingMonthlyReviews) / Math.max(activeResidents, 1)) * 10 +
    (openIncidents === 0 ? 20 : Math.max(0, 20 - openIncidents * 2)) +
    (draftCarePlans === 0 ? 20 : Math.max(0, 20 - draftCarePlans * 2)) +
    Math.min(20, handoverReportsThisMonth * 2)
  )

  const ACTION_LABELS: Record<string, string> = {
    CREATE: "Created",
    UPDATE: "Updated",
    DELETE: "Deleted",
    LOGIN: "Logged in",
    LOGOUT: "Logged out",
    VIEW: "Viewed",
    SUBMIT: "Submitted",
    APPROVE: "Approved",
    REJECT: "Rejected",
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compliance Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Regulatory readiness overview for your service</p>
      </div>

      {/* Compliance score banner */}
      <div className={`rounded-xl border p-5 flex items-center justify-between ${complianceScore >= 75 ? "bg-green-50/60 border-green-200" : complianceScore >= 50 ? "bg-yellow-50/60 border-yellow-200" : "bg-red-50/60 border-red-200"}`}>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Estimated Compliance Health Score</p>
          <p className={`text-4xl font-bold mt-1 ${complianceScore >= 75 ? "text-green-700" : complianceScore >= 50 ? "text-yellow-700" : "text-red-700"}`}>
            {complianceScore}<span className="text-xl">/100</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {complianceScore >= 75 ? "Good standing — continue maintaining documentation" :
             complianceScore >= 50 ? "Some areas need attention — review outstanding items below" :
             "Action required — significant gaps in documentation"}
          </p>
        </div>
        <Shield className={`h-12 w-12 ${complianceScore >= 75 ? "text-green-400" : complianceScore >= 50 ? "text-yellow-400" : "text-red-400"}`} />
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Residents"
          value={activeResidents}
          sublabel={`${totalResidents} total registered`}
          icon={<Users className="h-5 w-5" />}
          href="/residents"
        />
        <StatCard
          label="Assessments This Month"
          value={assessmentsThisMonth}
          sublabel="Completed formal assessments"
          icon={<ClipboardCheck className="h-5 w-5" />}
        />
        <StatCard
          label="Overdue Assessments"
          value={overdueAssessments}
          sublabel="Residents without assessment in 90 days"
          icon={<Calendar className="h-5 w-5" />}
          variant={overdueAssessments > 0 ? "warning" : "success"}
          href="/residents"
        />
        <StatCard
          label="Monthly Reviews Due"
          value={missingMonthlyReviews}
          sublabel="Admitted residents — no assessment in 30 days"
          icon={<Calendar className="h-5 w-5" />}
          variant={missingMonthlyReviews > 0 ? (missingMonthlyReviews > 3 ? "error" : "warning") : "success"}
          href="/residents"
        />
        <StatCard
          label="Open Incidents"
          value={openIncidents}
          sublabel={`${incidentsThisMonth} this month · ${criticalIncidents} critical`}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant={criticalIncidents > 0 ? "error" : openIncidents > 3 ? "warning" : "default"}
          href="/incidents"
        />
        <StatCard
          label="Draft Care Plans"
          value={draftCarePlans}
          sublabel="Awaiting review and approval"
          icon={<FileText className="h-5 w-5" />}
          variant={draftCarePlans > 5 ? "warning" : "default"}
        />
        <StatCard
          label="Active Care Plans"
          value={activeCarePlans}
          sublabel="Approved, in use"
          icon={<FileText className="h-5 w-5" />}
          variant="success"
        />
        <StatCard
          label="Care Notes (7 days)"
          value={careNotesThisWeek}
          sublabel="Notes recorded this week"
          icon={<TrendingUp className="h-5 w-5" />}
          variant={careNotesThisWeek < activeResidents ? "warning" : "default"}
          href="/care-notes"
        />
        <StatCard
          label="Handover Reports"
          value={handoverReportsThisMonth}
          sublabel="Shift reports this month"
          icon={<TrendingDown className="h-5 w-5" />}
          href="/handover"
        />
      </div>

      {/* Action items */}
      {(overdueAssessments > 0 || missingMonthlyReviews > 0 || criticalIncidents > 0 || draftCarePlans > 5) && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Action Required</h2>
          <div className="space-y-2">
            {missingMonthlyReviews > 0 && (
              <Link href="/residents" className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/40 px-4 py-3 hover:bg-amber-100/60 transition-colors">
                <Calendar className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{missingMonthlyReviews} resident{missingMonthlyReviews !== 1 ? "s" : ""} overdue for monthly review</p>
                  <p className="text-xs text-muted-foreground">No completed assessment in the last 30 days — monthly review required</p>
                </div>
              </Link>
            )}
            {overdueAssessments > 0 && (
              <Link href="/residents" className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50/40 px-4 py-3 hover:bg-yellow-100/60 transition-colors">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{overdueAssessments} resident{overdueAssessments !== 1 ? "s" : ""} require assessment</p>
                  <p className="text-xs text-muted-foreground">No completed assessment in the last 90 days</p>
                </div>
              </Link>
            )}
            {criticalIncidents > 0 && (
              <Link href="/incidents?severity=CRITICAL" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/40 px-4 py-3 hover:bg-red-100/60 transition-colors">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{criticalIncidents} critical incident{criticalIncidents !== 1 ? "s" : ""} unresolved</p>
                  <p className="text-xs text-muted-foreground">Requires immediate management review</p>
                </div>
              </Link>
            )}
            {draftCarePlans > 5 && (
              <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50/40 px-4 py-3">
                <FileText className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{draftCarePlans} care plans pending approval</p>
                  <p className="text-xs text-muted-foreground">Drafts should be reviewed and approved by a senior carer or nurse</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent audit log */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Audit Activity</h2>
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Time</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">User</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Action</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Record</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentAuditLogs.map((log: any) => (
                <tr key={log.id} className="hover:bg-muted/10">
                  <td className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-2 text-xs">{log.user?.name ?? "System"}</td>
                  <td className="px-4 py-2 text-xs font-medium">{ACTION_LABELS[log.action] ?? log.action}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{log.entityType} <span className="font-mono text-xs">{log.entityId?.slice(0, 8)}…</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
