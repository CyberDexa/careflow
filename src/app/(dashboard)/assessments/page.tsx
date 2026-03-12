import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ClipboardList, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"

export const metadata = { title: "Assessments" }

const STATUS_VARIANT: Record<string, "secondary" | "warning" | "success" | "outline"> = {
  IN_PROGRESS: "warning",
  PENDING_APPROVAL: "secondary",
  APPROVED: "success",
  SUPERSEDED: "outline",
}

const TYPE_LABELS: Record<string, string> = {
  PRE_ADMISSION: "Pre-Admission",
  SKIN_INTEGRITY: "Skin Integrity",
  FALLS_RISK: "Falls Risk",
  NUTRITIONAL: "Nutritional",
  PRESSURE_ULCER: "Pressure Ulcer",
  CONTINENCE: "Continence",
  COGNITIVE: "Cognitive",
  MENTAL_HEALTH: "Mental Health",
  PAIN: "Pain",
  MOVING_HANDLING: "Moving & Handling",
  COMMUNICATION: "Communication",
  ORAL_HEALTH: "Oral Health",
  END_OF_LIFE: "End of Life",
  SOCIAL_NEEDS: "Social Needs",
  ACTIVITY_WELLBEING: "Activity & Wellbeing",
  MEDICATION: "Medication",
  INFECTION_CONTROL: "Infection Control",
  BEHAVIOURAL: "Behavioural",
  SLEEP: "Sleep",
  DISCHARGE_PLANNING: "Discharge Planning",
}

interface Props {
  searchParams: Promise<{ status?: string; q?: string }>
}

export default async function AssessmentsPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const user = session.user as any

  const { status, q } = await searchParams

  const where: any = {
    resident: { organisationId: user.organisationId, deletedAt: null },
  }
  if (status) where.status = status
  if (q) {
    where.OR = [
      { resident: { firstName: { contains: q, mode: "insensitive" } } },
      { resident: { lastName: { contains: q, mode: "insensitive" } } },
    ]
  }

  const assessments = await prisma.residentAssessment.findMany({
    where,
    include: {
      resident: {
        select: { id: true, firstName: true, lastName: true, roomNumber: true },
      },
      domains: { select: { isComplete: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  })

  const pending = assessments.filter((a: (typeof assessments)[number]) => a.status === "IN_PROGRESS" || a.status === "PENDING_APPROVAL")
  const completed = assessments.filter((a: (typeof assessments)[number]) => a.status === "APPROVED" || a.status === "SUPERSEDED")

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Assessments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pending.length} pending · {completed.length} completed
          </p>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by resident name…"
          className="h-9 w-56 rounded-md border border-input bg-background text-sm px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-9 rounded-md border border-input bg-background text-sm px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All statuses</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="APPROVED">Approved</option>
        </select>
        <Button type="submit" size="sm" variant="outline">
          Filter
        </Button>
      </form>

      {/* Pending / active */}
      {pending.length > 0 && (
        <section>
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
            Pending ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((assessment: (typeof pending)[number]) => {
              const doneCount = assessment.domains.filter((d: (typeof assessment.domains)[number]) => d.isComplete).length
              const totalCount = assessment.domains.length
              return (
                <Link
                  key={assessment.id}
                  href={`/residents/${assessment.resident.id}/assessments/${assessment.id}`}
                >
                  <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-medium text-sm">
                          {TYPE_LABELS[assessment.type] || assessment.type.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {assessment.resident.firstName} {assessment.resident.lastName}
                          {assessment.resident.roomNumber
                            ? ` · Room ${assessment.resident.roomNumber}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {totalCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {doneCount}/{totalCount} domains
                          </span>
                        )}
                        <Badge variant={STATUS_VARIANT[assessment.status] || "secondary"}>
                          {assessment.status.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(assessment.updatedAt)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <section>
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
            Completed ({completed.length})
          </h2>
          <div className="space-y-2">
            {completed.map((assessment: (typeof completed)[number]) => (
              <Link
                key={assessment.id}
                href={`/residents/${assessment.resident.id}/assessments/${assessment.id}`}
              >
                <Card className="hover:shadow-sm transition-shadow cursor-pointer opacity-80">
                  <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-medium text-sm">
                        {TYPE_LABELS[assessment.type] || assessment.type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {assessment.resident.firstName} {assessment.resident.lastName}
                        {assessment.resident.roomNumber
                          ? ` · Room ${assessment.resident.roomNumber}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_VARIANT[assessment.status] || "outline"}>
                        {assessment.status.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {assessment.completedAt ? formatDate(assessment.completedAt) : formatDate(assessment.updatedAt)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {assessments.length === 0 && (
        <div className="rounded-xl border flex flex-col items-center justify-center py-20 gap-3">
          <ClipboardList className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No assessments found</p>
          <p className="text-xs text-muted-foreground">
            Start an assessment from a resident&apos;s profile
          </p>
        </div>
      )}
    </div>
  )
}
