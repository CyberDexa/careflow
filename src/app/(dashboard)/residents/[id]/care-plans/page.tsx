import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ChevronLeft, Plus, Sparkles, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"

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

const STATUS_ORDER: Record<string, number> = { ACTIVE: 0, DRAFT: 1, ARCHIVED: 2 }

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ status?: string }>
}

export default async function CarePlanListPage({ params, searchParams }: Props) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const user = session.user as any

  const { id: residentId } = await params
  const { status } = await searchParams

  const resident = await prisma.resident.findFirst({
    where: { id: residentId, organisationId: user.organisationId, deletedAt: null },
    select: { firstName: true, lastName: true },
  })
  if (!resident) notFound()

  const where: any = { residentId, organisationId: user.organisationId, deletedAt: null }
  if (status) where.status = status

  const carePlans = await prisma.carePlan.findMany({
    where,
    include: {
      approvedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  const sorted = [...carePlans].sort(
    (a: any, b: any) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9),
  )

  const counts = {
    all: await prisma.carePlan.count({ where: { residentId, organisationId: user.organisationId, deletedAt: null } }),
    ACTIVE: await prisma.carePlan.count({ where: { residentId, organisationId: user.organisationId, deletedAt: null, status: "ACTIVE" } }),
    DRAFT: await prisma.carePlan.count({ where: { residentId, organisationId: user.organisationId, deletedAt: null, status: "DRAFT" } }),
  }

  const filters = [
    { label: "All", value: "", count: counts.all },
    { label: "Active", value: "ACTIVE", count: counts.ACTIVE },
    { label: "Draft", value: "DRAFT", count: counts.DRAFT },
  ]

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/residents/${residentId}`} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Care Plans</h1>
          <p className="text-muted-foreground text-sm">
            {resident.firstName} {resident.lastName}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href={`/residents/${residentId}/care-plans/new`}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Generate Plan
          </Link>
        </Button>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `?status=${f.value}` : "?"}
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors font-medium ${
              (!status && !f.value) || status === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-input hover:border-primary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
            <span className="opacity-60">({f.count})</span>
          </Link>
        ))}
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No care plans found{status ? ` with status ${status}` : ""}.
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link href={`/residents/${residentId}/care-plans/new`}>Generate first care plan</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((cp: any) => {
            const isOverdue = cp.reviewDate && new Date(cp.reviewDate) < new Date() && cp.status === "ACTIVE"
            return (
              <Link key={cp.id} href={`/residents/${residentId}/care-plans/${cp.id}`}>
                <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">
                            {CATEGORY_LABELS[cp.category] ?? cp.category.replace(/_/g, " ")}
                          </p>
                          {cp.generatedByAi && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border rounded-full px-2 py-0.5">
                              <Sparkles className="h-3 w-3" /> AI
                            </span>
                          )}
                          {isOverdue && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-medium">
                              Review overdue
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          <span>Updated {formatDate(cp.updatedAt)}</span>
                          {cp.reviewDate && (
                            <span className={`flex items-center gap-1 ${isOverdue ? "text-red-600" : ""}`}>
                              <Calendar className="h-3 w-3" /> Review: {formatDate(cp.reviewDate)}
                            </span>
                          )}
                          {cp.approvedBy && (
                            <span>
                              Approved by {cp.approvedBy.firstName} {cp.approvedBy.lastName}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={
                          cp.status === "ACTIVE" ? "success" : cp.status === "DRAFT" ? "secondary" : "outline"
                        }
                      >
                        {cp.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
