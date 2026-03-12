import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { ArrowRight, UserPlus, ClipboardCheck, Home, Clock, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = { title: "Admissions Pipeline" }

export default async function PipelinePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const user = session.user as any

  const orgId = user.organisationId

  const [enquiries, preAssessed, recentlyAdmitted] = await Promise.all([
    prisma.resident.findMany({
      where: { organisationId: orgId, status: "ENQUIRY", deletedAt: null },
      include: {
        assessments: {
          where: { status: { not: "SUPERSEDED" } },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, type: true, status: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.resident.findMany({
      where: { organisationId: orgId, status: "PRE_ASSESSED", deletedAt: null },
      include: {
        assessments: {
          where: { status: { not: "SUPERSEDED" } },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, type: true, status: true, completedAt: true },
        },
      },
      orderBy: { preAssessmentCompletedAt: "desc" },
    }),
    prisma.resident.findMany({
      where: {
        organisationId: orgId,
        status: "ADMITTED",
        deletedAt: null,
        admissionDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { admissionDate: "desc" },
      take: 10,
      select: { id: true, firstName: true, lastName: true, admissionDate: true, roomNumber: true },
    }),
  ])

  const totalInPipeline = enquiries.length + preAssessed.length

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admissions Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {totalInPipeline} prospect{totalInPipeline !== 1 ? "s" : ""} in pipeline
        </p>
      </div>

      {/* Funnel visualisation */}
      <div className="grid sm:grid-cols-3 gap-1 items-center">
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 text-center">
          <UserPlus className="h-6 w-6 text-blue-600 mx-auto mb-1" />
          <p className="text-3xl font-bold text-blue-700">{enquiries.length}</p>
          <p className="text-sm font-medium text-blue-600">Enquiries</p>
          <p className="text-xs text-blue-500 mt-0.5">Awaiting pre-assessment</p>
        </div>
        <div className="hidden sm:flex items-center justify-center">
          <ArrowRight className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 text-center">
          <ClipboardCheck className="h-6 w-6 text-amber-600 mx-auto mb-1" />
          <p className="text-3xl font-bold text-amber-700">{preAssessed.length}</p>
          <p className="text-sm font-medium text-amber-600">Pre-Assessed</p>
          <p className="text-xs text-amber-500 mt-0.5">Ready to admit</p>
        </div>
      </div>

      {/* Enquiries */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Enquiries ({enquiries.length})
          </h2>
          <Button asChild size="sm">
            <Link href="/residents/new">
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Add Enquiry
            </Link>
          </Button>
        </div>

        {enquiries.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No enquiries at the moment.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {enquiries.map((r: any) => {
              const hasAssessment = r.assessments.length > 0
              return (
                <Card key={r.id} className="border-l-4 border-l-blue-400">
                  <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-medium">{r.firstName} {r.lastName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <Clock className="inline h-3 w-3 mr-0.5" />
                        Added {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {hasAssessment ? (
                        <Badge variant="secondary" className="text-xs">Pre-assessment started</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">No assessment yet</Badge>
                      )}
                      <Button asChild size="sm" variant="outline" className="gap-1.5">
                        <Link href={`/residents/${r.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>
                      </Button>
                      {!hasAssessment && (
                        <Button asChild size="sm" className="gap-1.5">
                          <Link href={`/residents/${r.id}/assessments/pre-admission`}>
                            Start Pre-Assessment
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {/* Pre-Assessed → Ready to Admit */}
      <section className="space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Pre-Assessed — Ready to Admit ({preAssessed.length})
        </h2>

        {preAssessed.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No residents at pre-assessed stage.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {preAssessed.map((r: any) => {
              const assessment = r.assessments[0]
              return (
                <Card key={r.id} className="border-l-4 border-l-amber-400">
                  <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-medium">{r.firstName} {r.lastName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Pre-assessed{" "}
                        {r.preAssessmentCompletedAt
                          ? formatDistanceToNow(new Date(r.preAssessmentCompletedAt), { addSuffix: true })
                          : "recently"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {assessment?.status === "PENDING_APPROVAL" && (
                        <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                          Formal assessment pending approval
                        </Badge>
                      )}
                      <Button asChild size="sm" variant="outline" className="gap-1.5">
                        <Link href={`/residents/${r.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>
                      </Button>
                      <Button asChild size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700">
                        <Link href={`/residents/${r.id}/assessments/new`}>
                          Start Formal Assessment
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {/* Recently admitted */}
      {recentlyAdmitted.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2 text-muted-foreground">
            <Home className="h-4 w-4 text-green-500" />
            Recently Admitted (last 30 days)
          </h2>
          <div className="divide-y rounded-xl border overflow-hidden">
            {recentlyAdmitted.map((r: any) => (
              <Link
                key={r.id}
                href={`/residents/${r.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{r.firstName} {r.lastName}</p>
                  {r.roomNumber && <p className="text-xs text-muted-foreground">Room {r.roomNumber}</p>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {r.admissionDate ? format(new Date(r.admissionDate), "dd MMM yyyy") : "—"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
