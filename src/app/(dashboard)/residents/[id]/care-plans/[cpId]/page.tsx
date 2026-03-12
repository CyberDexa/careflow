import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, Sparkles, Calendar, User2 } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { CarePlanProgressNotesPanel } from "@/components/care-plans/progress-notes-panel"
import { ApproveCarePlanButton } from "@/components/care-plans/approve-button"
import { PrintButton } from "@/components/ui/print-button"

interface Props {
  params: Promise<{ id: string; cpId: string }>
}

const CATEGORY_LABELS: Record<string, string> = {
  PERSONAL_CARE: "Personal Care & Hygiene",
  MOBILITY: "Mobility & Moving/Handling",
  NUTRITION: "Nutrition & Hydration",
  CONTINENCE: "Continence Management",
  MEDICATION: "Medication Management",
  COMMUNICATION: "Communication & Social Needs",
  SKIN_INTEGRITY: "Skin Integrity & Pressure Care",
  MENTAL_HEALTH: "Mental Health & Wellbeing",
  END_OF_LIFE: "Advance Care & End of Life",
  FALLS_PREVENTION: "Falls Prevention",
  CLINICAL: "Clinical Nursing Care",
  SOCIAL: "Social Engagement & Activities",
}

export default async function CarePlanDetailPage({ params }: Props) {
  const { id: residentId, cpId } = await params
  const session = await auth()
  if (!session?.user) redirect("/login")
  const user = session.user as any

  const plan = await prisma.carePlan.findFirst({
    where: { id: cpId, residentId, organisationId: user.organisationId, deletedAt: null },
    include: {
      approvedBy: { select: { firstName: true, lastName: true } },
      progressNotes: {
        orderBy: { createdAt: "asc" },
        include: {
          // join author name
        },
      },
      resident: { select: { firstName: true, lastName: true } },
    },
  })
  if (!plan) notFound()

  // Fetch progress note authors separately
  const noteAuthorIds = [...new Set(plan.progressNotes.filter((n) => n.createdBy).map((n) => n.createdBy!))]
  const noteAuthors = noteAuthorIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: noteAuthorIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : []
  const authorMap = Object.fromEntries(noteAuthors.map((u) => [u.id, u]))

  const goals = (plan.goals as string[]) ?? []
  const interventions = (plan.interventions as string[]) ?? []
  const outcomes = (plan.outcomes as string[]) ?? []

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/residents/${residentId}?tab=care-plans`} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">{CATEGORY_LABELS[plan.category] ?? plan.category}</h1>
            <Badge variant={plan.status === "ACTIVE" ? "success" : plan.status === "DRAFT" ? "secondary" : "warning"}>
              {plan.status}
            </Badge>
            {plan.generatedByAi && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Sparkles className="h-3 w-3" /> AI generated
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {plan.resident.firstName} {plan.resident.lastName} · Created {formatDate(plan.createdAt)}
          </p>
        </div>
        {plan.status === "DRAFT" && (
          <ApproveCarePlanButton planId={cpId} />
        )}
        <PrintButton label="Print" />
      </div>

      {/* Care plan sections */}
      <div className="space-y-4">
        {plan.needsAssessment && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Care needs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{plan.needsAssessment}</p>
            </CardContent>
          </Card>
        )}

        {goals.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Outcome / goal</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {goals.map((g, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-primary shrink-0 mt-0.5">•</span>
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {outcomes.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Able to do themselves</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {outcomes.map((o, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-primary shrink-0 mt-0.5">•</span>
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {interventions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Description of care actions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {interventions.map((int, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-primary shrink-0 mt-0.5">→</span>
                    <span>{int}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Review date & approved by */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {plan.reviewDate && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Review: {formatDate(plan.reviewDate)}
            </span>
          )}
          {plan.approvedBy && (
            <span className="flex items-center gap-1.5">
              <User2 className="h-3.5 w-3.5" />
              Approved by {plan.approvedBy.firstName} {plan.approvedBy.lastName} on {formatDate(plan.approvedAt!)}
            </span>
          )}
        </div>
      </div>

      {/* Progress notes */}
      <CarePlanProgressNotesPanel
        carePlanId={cpId}
        notes={plan.progressNotes.map((n) => {
          const author = n.createdBy ? authorMap[n.createdBy] : null
          return {
            id: n.id,
            note: n.note,
            createdAt: n.createdAt,
            authorName: author ? `${author.firstName} ${author.lastName}` : undefined,
          }
        })}
      />
    </div>
  )
}
