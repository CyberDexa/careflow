import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, MapPin, CheckCircle2, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BodyMapHistoryClient } from "@/components/body-map/body-map-history"
import { BodyMapDisplay } from "@/components/body-map/body-map-display"
import { PhotoStrip } from "@/components/body-map/photo-strip"

const typeLabels: Record<string, string> = {
  SKIN_TEAR: "Skin Tear",
  PRESSURE_DAMAGE: "Pressure Damage",
  WOUND: "Wound",
  BRUISE: "Bruise",
  RASH: "Rash",
  SWELLING: "Swelling",
  NEW_MARK: "New Mark",
  OTHER: "Other",
}

const severityVariant: Record<string, "danger" | "warning" | "secondary"> = {
  SEVERE: "danger",
  MODERATE: "warning",
  MINOR: "secondary",
}

export default async function BodyMapPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const user = session.user as any

  const { id } = await params

  const [resident, entries, skinIntegrityPlans] = await Promise.all([
    prisma.resident.findFirst({
      where: { id, organisationId: user.organisationId },
      select: { id: true, firstName: true, lastName: true, roomNumber: true },
    }),
    prisma.bodyMapEntry.findMany({
      where: { residentId: id, deletedAt: null },
      include: {
        author: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.carePlan.findMany({
      where: {
        residentId: id,
        category: "SKIN_INTEGRITY",
        deletedAt: null,
        status: { in: ["ACTIVE", "DRAFT", "PENDING_APPROVAL"] },
      },
      select: { id: true, category: true, status: true },
      orderBy: { updatedAt: "desc" },
    }),
  ])

  if (!resident) notFound()

  const active = entries.filter((e: (typeof entries)[number]) => !e.isResolved)
  const resolved = entries.filter((e: (typeof entries)[number]) => e.isResolved)

  const SKIN_RELATED_TYPES = new Set(["SKIN_TEAR", "PRESSURE_DAMAGE", "WOUND", "RASH"])
  const hasSkinEntries = active.some((e: (typeof active)[number]) => SKIN_RELATED_TYPES.has(e.type))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href={`/residents/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {resident.firstName} {resident.lastName}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Body Map</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {resident.firstName} {resident.lastName}
            {resident.roomNumber ? ` · Room ${resident.roomNumber}` : ""}
          </p>
        </div>
        <BodyMapHistoryClient residentId={id} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active injuries</p>
            <p className="text-2xl font-bold text-destructive mt-1">{active.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Resolved</p>
            <p className="text-2xl font-bold text-success mt-1">{resolved.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total recorded</p>
            <p className="text-2xl font-bold mt-1">{entries.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Skin integrity care plan link */}
      {hasSkinEntries && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-medium">Skin integrity concern detected</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {skinIntegrityPlans.length > 0
                    ? `${skinIntegrityPlans.length} skin integrity care plan${skinIntegrityPlans.length > 1 ? "s" : ""} on file.`
                    : "No skin integrity care plan exists for this resident."}
                </p>
                {skinIntegrityPlans.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {skinIntegrityPlans.map((plan: (typeof skinIntegrityPlans)[number]) => (
                      <Link
                        key={plan.id}
                        href={`/residents/${id}/care-plans/${plan.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 dark:text-amber-300 hover:underline"
                      >
                        {plan.category.replace(/_/g, " ")}
                        <span className="text-muted-foreground">({plan.status.replace("_", " ")})</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link href={`/residents/${id}/care-plans/new?category=SKIN_INTEGRITY`}>
                  {skinIntegrityPlans.length > 0 ? "View plans" : "Generate plan"}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SVG body map with severity-coded dots */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Body Map Diagram</CardTitle>
        </CardHeader>
        <CardContent>
          <BodyMapDisplay
            entries={entries.map((e: any) => ({
              id: e.id,
              bodyRegion: e.bodyRegion,
              severity: e.severity,
              type: e.type,
              description: e.description,
              isResolved: e.isResolved,
            }))}
            showResolved={false}
          />
        </CardContent>
      </Card>

      {/* Active entries */}
      {active.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-destructive" />
            Active ({active.length})
          </h2>
          <div className="space-y-3">
            {active.map((entry: (typeof active)[number]) => (
              <Card key={entry.id} className="border-l-4 border-l-destructive/60">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={severityVariant[entry.severity]}>
                          {entry.severity}
                        </Badge>
                        <Badge variant="outline">{typeLabels[entry.type] || entry.type}</Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {entry.bodyRegion.replace(/-/g, " ")}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{entry.description}</p>
                      {entry.photoUrls?.length > 0 && (
                        <PhotoStrip photos={entry.photoUrls} className="mt-2" />
                      )}
                      <p className="text-xs text-muted-foreground">
                        Recorded by {entry.author.firstName} {entry.author.lastName} ·{" "}
                        {new Date(entry.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <ResolveButton entryId={entry.id} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Resolved history */}
      {resolved.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Resolved history ({resolved.length})
          </h2>
          <div className="space-y-2">
            {resolved.map((entry: (typeof resolved)[number]) => (
              <Card key={entry.id} className="opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 flex-wrap">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">{typeLabels[entry.type] || entry.type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {entry.bodyRegion.replace(/-/g, " ")}
                        </span>
                      </div>
                      <p className="text-sm mt-1 line-through text-muted-foreground">
                        {entry.description}
                      </p>
                      {entry.photoUrls?.length > 0 && (
                        <PhotoStrip photos={entry.photoUrls} className="mt-2" />
                      )}
                      {entry.resolvedNotes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Resolution note: {entry.resolvedNotes}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Resolved{" "}
                        {entry.resolvedAt
                          ? new Date(entry.resolvedAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : ""}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {entries.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No body map entries recorded yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Use the button above to record an injury or skin observation.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Thin wrapper to make resolve button server-renderable (actual interaction in client component)
function ResolveButton({ entryId }: { entryId: string }) {
  return <ResolveButtonClient entryId={entryId} />
}

// Import inline to avoid separate file for a tiny component
import { ResolveButtonClient } from "@/components/body-map/resolve-button"
