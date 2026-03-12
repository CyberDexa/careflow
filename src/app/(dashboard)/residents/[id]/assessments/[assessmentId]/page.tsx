import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { format } from "date-fns"
import { ChevronLeft, CheckCircle2, Circle, Clock, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { AssessmentApprovalPanel } from "@/components/assessments/approval-panel"

const STATUS_STYLES: Record<string, { label: string; class: string }> = {
  IN_PROGRESS: { label: "In Progress", class: "bg-blue-100 text-blue-700" },
  PENDING_APPROVAL: { label: "Pending Approval", class: "bg-amber-100 text-amber-700" },
  APPROVED: { label: "Approved", class: "bg-green-100 text-green-700" },
  SUPERSEDED: { label: "Superseded", class: "bg-gray-100 text-gray-500" },
}

const DOMAIN_LABELS: Record<string, string> = {
  // Pre-admission
  PRE_ADMISSION_PERSONAL: "Personal Details",
  PRE_ADMISSION_CARE_NEEDS: "Care Needs",
  PRE_ADMISSION_MEDICAL: "Medical History",
  PRE_ADMISSION_SOCIAL: "Social History",
  PRE_ADMISSION_COMMUNICATION: "Communication",
  PRE_ADMISSION_PREFERENCES: "Preferences & Wishes",
  // Formal
  WATERLOW: "Waterlow Pressure Ulcer Risk",
  FALLS_RISK: "Falls Risk (MORSE)",
  MUST_NUTRITIONAL: "Nutritional Assessment (MUST)",
  MENTAL_CAPACITY: "Mental Capacity & Consent",
  MOBILITY_FUNCTION: "Mobility & Function",
  CONTINENCE_ASSESSMENT: "Continence Assessment",
  PERSONAL_HYGIENE: "Personal Hygiene",
  ORAL_HEALTH: "Oral Health",
  PAIN_ASSESSMENT: "Pain Assessment",
  EATING_DRINKING_CHOKING: "Eating, Drinking & Choking",
  NUTRITIONAL_ASSESSMENT: "Nutritional Assessment",
  ADVANCE_CARE_PLAN: "Advance Care Plan",
  INTERESTS_ACTIVITIES: "Interests & Activities",
  DEPENDENCY_RATING: "Dependency Rating",
  PEEP: "PEEP (Personal Emergency Evacuation)",
  BED_RAILS_ASSESSMENT: "Bed Rails Assessment",
  MATTRESS_CHECK: "Mattress Check",
  CALL_BELL_RISK: "Call Bell Risk",
  CLINICAL_FRAILTY_SCORE: "Clinical Frailty Score",
  MULTIFACTORIAL_FALLS: "Multifactorial Falls Assessment",
}

interface Props {
  params: Promise<{ id: string; assessmentId: string }>
}

export default async function AssessmentDetailPage({ params }: Props) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const user = session.user as any

  const { id: residentId, assessmentId } = await params

  const assessment = await prisma.residentAssessment.findFirst({
    where: { id: assessmentId, resident: { organisationId: user.organisationId }, residentId },
    include: {
      domains: { orderBy: { updatedAt: "asc" } },
      resident: { select: { id: true, firstName: true, lastName: true } },
    },
  })

  if (!assessment) notFound()

  const statusInfo = STATUS_STYLES[assessment.status] ?? STATUS_STYLES.IN_PROGRESS
  const completedDomains = assessment.domains.filter((d: any) => d.isComplete)
  const incompleteDomains = assessment.domains.filter((d: any) => !d.isComplete)
  const isManager = user.role === "MANAGER"

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/residents/${residentId}?tab=assessments`} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{assessment.type.replace("_", " ")} Assessment</h1>
          <p className="text-sm text-muted-foreground">
            {assessment.resident.firstName} {assessment.resident.lastName}
            {assessment.createdAt && ` · Started ${format(new Date(assessment.createdAt), "dd MMM yyyy")}`}
          </p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusInfo.class}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Approval panel (manager only, when pending) */}
      {isManager && assessment.status === "PENDING_APPROVAL" && (
        <AssessmentApprovalPanel
          assessmentId={assessment.id}
          residentId={residentId}
          residentName={`${assessment.resident.firstName} ${assessment.resident.lastName}`}
          assessmentType={assessment.type}
        />
      )}

      {/* Domain progress summary */}
      <div className="rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Domain Progress</h2>
          <span className="text-xs text-muted-foreground">
            {completedDomains.length}/{assessment.domains.length} complete
          </span>
        </div>

        {assessment.domains.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Circle className="h-4 w-4" />
            No domains saved yet. Continue completing the assessment.
          </div>
        ) : (
          <div className="space-y-2">
            {assessment.domains.map((domain: any) => (
              <div key={domain.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                {domain.isComplete ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{DOMAIN_LABELS[domain.domainType] ?? domain.domainType.replace(/_/g, " ")}</p>
                  {domain.score !== null && domain.score !== undefined && (
                    <p className="text-xs text-muted-foreground">Score: {domain.score}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {domain.riskLevel && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      domain.riskLevel === "HIGH" || domain.riskLevel === "VERY_HIGH"
                        ? "bg-red-100 text-red-700"
                        : domain.riskLevel === "MEDIUM"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      {domain.riskLevel.replace("_", " ")}
                    </span>
                  )}
                  {domain.isComplete ? (
                    <span className="text-xs text-green-600 font-medium">Complete</span>
                  ) : (
                    <span className="text-xs text-amber-600">In progress</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action: continue assessment */}
        {assessment.status === "IN_PROGRESS" && (
          <div className="pt-2 border-t">
            <Link
              href={`/residents/${residentId}/assessments/new`}
              className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
            >
              Continue adding domains →
            </Link>
          </div>
        )}
      </div>

      {/* Domain content details */}
      {assessment.domains.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm">Domain Details</h2>
          {assessment.domains.map((domain: any) => {
            const content = domain.content as Record<string, any>
            return (
              <div key={domain.id} className="rounded-xl border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  {domain.isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-500" />
                  )}
                  <h3 className="font-medium text-sm">
                    {DOMAIN_LABELS[domain.domainType] ?? domain.domainType.replace(/_/g, " ")}
                  </h3>
                  {domain.score !== null && domain.score !== undefined && (
                    <Badge variant="outline" className="ml-auto text-xs">Score: {domain.score}</Badge>
                  )}
                </div>
                <div className="grid gap-1.5 text-xs text-muted-foreground">
                  {Object.entries(content).filter(([, v]) => v !== null && v !== undefined && v !== "").map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="font-medium text-foreground capitalize min-w-32">{key.replace(/_/g, " ")}:</span>
                      <span className="flex-1">{Array.isArray(value) ? value.join(", ") : String(value)}</span>
                    </div>
                  ))}
                </div>
                {domain.updatedAt && (
                  <p className="text-xs text-muted-foreground">
                    Last updated {format(new Date(domain.updatedAt), "dd MMM yyyy HH:mm")}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
