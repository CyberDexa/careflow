import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, ClipboardList, Plus, AlertCircle } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { StartMonthlyReviewButton } from "@/components/assessments/start-monthly-review-button"

interface Props {
  params: Promise<{ id: string }>
}

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "destructive"> = {
  APPROVED: "success",
  IN_PROGRESS: "secondary",
  PENDING_APPROVAL: "warning",
  SUPERSEDED: "secondary",
}

export default async function AssessmentHistoryPage({ params }: Props) {
  const { id: residentId } = await params
  const session = await auth()
  if (!session?.user) redirect("/login")
  const user = session.user as any

  const resident = await prisma.resident.findFirst({
    where: { id: residentId, organisationId: user.organisationId, deletedAt: null },
    select: { firstName: true, lastName: true, status: true },
  })
  if (!resident) notFound()

  const assessments = await prisma.residentAssessment.findMany({
    where: { residentId },
    include: {
      domains: {
        select: { domainType: true, isComplete: true, score: true, updatedAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Monthly review due check: last APPROVED assessment >30 days ago
  const lastApproved = assessments.find((a) => a.status === "APPROVED")
  const daysSinceLastApproved = lastApproved
    ? Math.floor((Date.now() - new Date(lastApproved.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : null
  const monthlyReviewDue =
    resident.status === "ADMITTED" &&
    (daysSinceLastApproved === null || daysSinceLastApproved >= 30) &&
    !assessments.some((a) => a.type === "MONTHLY_REVIEW" && a.status === "IN_PROGRESS")

  // Group by assessment type
  const grouped = assessments.reduce<Record<string, typeof assessments>>((acc, a) => {
    const key = a.type
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/residents/${residentId}`} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Assessment History</h1>
          <p className="text-sm text-muted-foreground">
            {resident.firstName} {resident.lastName} · {assessments.length} total
          </p>
        </div>
        <Button asChild size="sm">
          <Link href={`/residents/${residentId}/assessments/new`}>
            <Plus className="h-4 w-4 mr-1" /> New Assessment
          </Link>
        </Button>
      </div>

      {/* Monthly review due banner */}
      {monthlyReviewDue && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm font-medium text-amber-800">
              Monthly review due
              {daysSinceLastApproved !== null && (
                <span className="font-normal text-amber-700"> — last assessment {daysSinceLastApproved} days ago</span>
              )}
            </p>
          </div>
          <StartMonthlyReviewButton residentId={residentId} />
        </div>
      )}

      {assessments.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No assessments recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                {type.replace(/_/g, " ")} ({items.length})
              </h2>
              <div className="space-y-2">
                {items.map((a) => {
                  const completedDomains = a.domains.filter((d) => d.isComplete).length
                  const totalDomains = a.domains.length
                  const latestDomainUpdate = a.domains.length > 0
                    ? a.domains.reduce((max, d) => d.updatedAt > max ? d.updatedAt : max, a.domains[0].updatedAt)
                    : null
                  const totalScore = a.domains.reduce((sum, d) => sum + (d.score ?? 0), 0)
                  const hasScoredDomains = a.domains.some((d) => d.score !== null)

                  return (
                    <Link key={a.id} href={`/residents/${residentId}/assessments/${a.id}`}>
                      <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{type.replace(/_/g, " ")}</p>
                                <Badge variant={STATUS_VARIANT[a.status] ?? "secondary"} className="text-xs">
                                  {a.status.replace(/_/g, " ")}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Started {formatDate(a.createdAt)}
                                {a.completedAt && ` · Completed ${formatDate(a.completedAt)}`}
                                {latestDomainUpdate && ` · Last updated ${formatDate(latestDomainUpdate)}`}
                              </p>
                              {totalDomains > 0 && (
                                <div className="flex items-center gap-2 mt-1.5">
                                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[120px]">
                                    <div
                                      className="h-full bg-primary rounded-full transition-all"
                                      style={{ width: `${Math.round((completedDomains / totalDomains) * 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {completedDomains}/{totalDomains} domains
                                  </span>
                                  {hasScoredDomains && (
                                    <span className="text-xs text-muted-foreground">· Score: {totalScore}</span>
                                  )}
                                </div>
                              )}
                              {/* Domain pills */}
                              {a.domains.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {a.domains.map((d) => (
                                    <span
                                      key={d.domainType}
                                      className={`text-xs px-1.5 py-0.5 rounded border ${d.isComplete ? "bg-green-50 border-green-200 text-green-700" : "bg-muted border-border text-muted-foreground"}`}
                                    >
                                      {d.domainType.replace(/_/g, " ")}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
