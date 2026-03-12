import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { format } from "date-fns"
import { ChevronLeft, AlertTriangle, Clock, User, MapPin, Users, MessageSquare, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { FollowUpForm } from "@/components/incidents/follow-up-form"
import { IncidentStatusUpdate } from "@/components/incidents/status-update"
import { Button } from "@/components/ui/button"
import { PrintButton } from "@/components/ui/print-button"

// Map incident type → relevant care plan categories
const INCIDENT_TO_CARE_PLAN: Record<string, string[]> = {
  FALL: ["FALLS_PREVENTION", "MOBILITY"],
  SKIN_INTEGRITY: ["SKIN_INTEGRITY"],
  MEDICATION_ERROR: ["MEDICATION"],
  BEHAVIOURAL: ["MENTAL_HEALTH"],
  HEALTH_DETERIORATION: ["MEDICATION", "INFECTION_CONTROL"],
}

const SEVERITY_STYLES: Record<string, string> = {
  LOW: "bg-green-100 text-green-700 border-green-200",
  MEDIUM: "bg-yellow-100 text-yellow-700 border-yellow-200",
  HIGH: "bg-orange-100 text-orange-700 border-orange-200",
  CRITICAL: "bg-red-100 text-red-700 border-red-200",
}

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  UNDER_INVESTIGATION: "bg-purple-100 text-purple-700",
  CLOSED: "bg-gray-100 text-gray-500",
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function IncidentDetailPage({ params }: Props) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const user = session.user as any

  const { id } = await params

  const incident = await prisma.incident.findFirst({
    where: { id, organisationId: user.organisationId },
    include: {
      resident: { select: { id: true, firstName: true, lastName: true, roomNumber: true } },
      reportedBy: { select: { firstName: true, lastName: true } },
      followUps: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { firstName: true, lastName: true } } },
      },
    },
  })

  if (!incident) notFound()

  // Fetch care plans relevant to this incident type
  const relevantCategories = INCIDENT_TO_CARE_PLAN[incident.type] ?? []
  const relatedCarePlans = relevantCategories.length > 0
    ? await prisma.carePlan.findMany({
        where: {
          residentId: incident.residentId,
          category: { in: relevantCategories as any[] },
          deletedAt: null,
          status: { in: ["ACTIVE", "DRAFT", "PENDING_APPROVAL"] },
        },
        select: { id: true, category: true, status: true },
        orderBy: { updatedAt: "desc" },
      })
    : []

  const isManager = user.role === "MANAGER"

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/incidents" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Incident Report</h1>
          <p className="text-sm text-muted-foreground">
            Reported {format(new Date(incident.createdAt), "dd MMM yyyy 'at' HH:mm")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${SEVERITY_STYLES[incident.severity] ?? ""}`}>
            {incident.severity}
          </span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[incident.status] ?? ""}`}>
            {incident.status.replace("_", " ")}
          </span>
          <PrintButton label="Print" />
        </div>
      </div>

      {/* Main details */}
      <div className="rounded-xl border p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-base">
              <Link href={`/residents/${incident.resident.id}`} className="hover:underline text-primary">
                {incident.resident.firstName} {incident.resident.lastName}
              </Link>
              {incident.resident.roomNumber && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">Room {incident.resident.roomNumber}</span>
              )}
            </h2>
            {incident.type && (
              <p className="text-sm text-muted-foreground mt-0.5">{incident.type.replace(/_/g, " ")}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span>Occurred: {format(new Date(incident.occurredAt), "dd MMM yyyy HH:mm")}</span>
          </div>
          {incident.location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{incident.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4 shrink-0" />
            <span>Reported by: {incident.reportedBy.firstName} {incident.reportedBy.lastName}</span>
          </div>
          {incident.witnesses && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 shrink-0" />
              <span>Witnesses: {incident.witnesses}</span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t">
          <h3 className="text-sm font-medium mb-1">Description</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{incident.description}</p>
        </div>

        {incident.injuryDetails && (
          <div className="pt-2 border-t">
            <h3 className="text-sm font-medium mb-1">Injury Details</h3>
            <p className="text-sm text-muted-foreground">{incident.injuryDetails}</p>
          </div>
        )}

        {(incident.firstAidGiven || incident.firstAidDetails) && (
          <div className="pt-2 border-t">
            <h3 className="text-sm font-medium mb-1">First Aid</h3>
            <p className="text-sm text-muted-foreground">
              {incident.firstAidGiven ? "First aid was provided." : ""} {incident.firstAidDetails ?? ""}
            </p>
          </div>
        )}

        <div className="pt-2 border-t flex gap-4 text-sm text-muted-foreground">
          <span className={incident.familyNotified ? "text-green-600" : ""}>
            {incident.familyNotified ? "✓" : "✗"} Family notified
          </span>
          <span className={incident.gpNotified ? "text-green-600" : ""}>
            {incident.gpNotified ? "✓" : "✗"} GP notified
          </span>
        </div>
      </div>

      {/* Status update (manager only) */}
      {isManager && (
        <div className="rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-3">Update Status</h3>
          <IncidentStatusUpdate incidentId={incident.id} currentStatus={incident.status} />
        </div>
      )}

      {/* Follow-up notes timeline */}
      <div className="rounded-xl border p-5 space-y-5">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Follow-up Notes</h3>
          <span className="text-xs text-muted-foreground ml-auto">{incident.followUps.length} note{incident.followUps.length !== 1 ? "s" : ""}</span>
        </div>

        {incident.followUps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No follow-up notes yet.</p>
        ) : (
          <ol className="relative border-l border-muted-foreground/20 ml-3 space-y-4">
            {incident.followUps.map((fu: any) => (
              <li key={fu.id} className="ml-6">
                <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-background bg-muted-foreground/40" />
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">
                    {fu.author.firstName} {fu.author.lastName} &middot; {format(new Date(fu.createdAt), "dd MMM yyyy HH:mm")}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{fu.note}</p>
                </div>
              </li>
            ))}
          </ol>
        )}

        <div className="pt-4 border-t">
          <FollowUpForm incidentId={incident.id} />
        </div>
      </div>

      {/* Related care plans */}
      {relevantCategories.length > 0 && (
        <div className="rounded-xl border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Related Care Plans</h3>
            <span className="text-xs text-muted-foreground ml-auto">
              Based on incident type: {incident.type.replace(/_/g, " ")}
            </span>
          </div>

          {relatedCarePlans.length === 0 ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                No related care plans found for {relevantCategories.map((c: string) => c.replace(/_/g, " ")).join(" / ")}.
              </p>
              {relevantCategories.slice(0, 1).map((cat: string) => (
                <Button key={cat} asChild size="sm" variant="outline">
                  <Link href={`/residents/${incident.residentId}/care-plans/new?category=${cat}`}>
                    Generate plan
                  </Link>
                </Button>
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {relatedCarePlans.map((plan: any) => (
                <li key={plan.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{plan.category.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {plan.category.replace(/_/g, " ")} · {plan.status.replace(/_/g, " ")}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="ghost" className="shrink-0 text-xs">
                    <Link href={`/residents/${incident.residentId}/care-plans/${plan.id}`}>
                      View →
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
