import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { BookOpen, Calendar, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"

export const metadata = { title: "Care Plans" }

const CATEGORY_LABELS: Record<string, string> = {
  PERSONAL_CARE: "Personal Care",
  NUTRITION_HYDRATION: "Nutrition & Hydration",
  MOBILITY: "Mobility",
  SKIN_INTEGRITY: "Skin Integrity",
  CONTINENCE: "Continence",
  MENTAL_HEALTH: "Mental Health",
  COMMUNICATION: "Communication",
  MEDICATION: "Medication",
  SOCIAL_ACTIVITIES: "Social Activities",
  END_OF_LIFE: "End of Life",
  SLEEP_REST: "Sleep & Rest",
  ORAL_HEALTH: "Oral Health",
  SENSORY: "Sensory",
  INFECTION_CONTROL: "Infection Control",
  FALLS_PREVENTION: "Falls Prevention",
}

const STATUS_VARIANT: Record<string, "secondary" | "warning" | "success" | "outline"> = {
  DRAFT: "secondary",
  PENDING_APPROVAL: "warning",
  ACTIVE: "success",
  UNDER_REVIEW: "warning",
  ARCHIVED: "outline",
}

interface Props {
  searchParams: Promise<{ status?: string; q?: string }>
}

export default async function CarePlansPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const user = session.user as any

  const { status, q } = await searchParams

  const where: any = {
    organisationId: user.organisationId,
    deletedAt: null,
    resident: { deletedAt: null },
  }
  if (status) where.status = status
  if (q) {
    where.OR = [
      { resident: { firstName: { contains: q, mode: "insensitive" } } },
      { resident: { lastName: { contains: q, mode: "insensitive" } } },
    ]
  }

  const carePlans = await prisma.carePlan.findMany({
    where,
    include: {
      resident: { select: { id: true, firstName: true, lastName: true, roomNumber: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  })

  const counts = await Promise.all(
    ["ACTIVE", "DRAFT", "UNDER_REVIEW"].map((s) =>
      prisma.carePlan.count({
        where: { organisationId: user.organisationId, deletedAt: null, status: s as any },
      })
    )
  )
  const [activeCount, draftCount, reviewCount] = counts

  const filters = [
    { label: "All", value: "" },
    { label: "Active", value: "ACTIVE", count: activeCount },
    { label: "Draft", value: "DRAFT", count: draftCount },
    { label: "Under Review", value: "UNDER_REVIEW", count: reviewCount },
    { label: "Archived", value: "ARCHIVED" },
  ]

  const needsReview = carePlans.filter(
    (p: (typeof carePlans)[number]) =>
      p.status === "ACTIVE" && p.reviewDate && new Date(p.reviewDate) < new Date()
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Care Plans</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            All active and draft care plans across residents
          </p>
        </div>
      </div>

      {/* Overdue review alert */}
      {needsReview.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-4 py-3 text-sm">
          <span className="font-medium text-amber-800 dark:text-amber-400">
            {needsReview.length} plan{needsReview.length > 1 ? "s" : ""} overdue for review.
          </span>{" "}
          <span className="text-amber-700 dark:text-amber-500">
            Check the list below and update where necessary.
          </span>
        </div>
      )}

      {/* Search + filter bar */}
      <form className="flex flex-wrap gap-2 items-center">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by resident name…"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm w-56 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {filters.map((f) => (
          <Link
            key={f.value}
            href={`/care-plans?${new URLSearchParams({ ...(f.value ? { status: f.value } : {}), ...(q ? { q } : {}) }).toString()}`}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              (status ?? "") === f.value
                ? "bg-primary text-primary-foreground"
                : "border bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {f.label}
            {f.count !== undefined && (
              <span className="rounded-full bg-white/20 px-1.5 text-[10px]">{f.count}</span>
            )}
          </Link>
        ))}
      </form>

      {/* Plan list */}
      {carePlans.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No care plans found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {carePlans.map((plan: (typeof carePlans)[number]) => {
            const isOverdue =
              plan.status === "ACTIVE" &&
              plan.reviewDate &&
              new Date(plan.reviewDate) < new Date()

            return (
              <Link
                key={plan.id}
                href={`/residents/${plan.resident.id}/care-plans/${plan.id}`}
                className="block"
              >
                <Card className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={STATUS_VARIANT[plan.status] ?? "outline"}>
                            {plan.status.replace(/_/g, " ")}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-medium">
                            {CATEGORY_LABELS[plan.category] ?? plan.category.replace(/_/g, " ")}
                          </span>
                          {plan.generatedByAi && (
                            <span className="inline-flex items-center gap-0.5 text-xs text-violet-600">
                              <Sparkles className="h-3 w-3" /> AI
                            </span>
                          )}
                          {isOverdue && (
                            <Badge variant="danger" className="text-xs">Review overdue</Badge>
                          )}
                        </div>
                        <p className="font-medium text-sm">
                          {plan.resident.firstName} {plan.resident.lastName}
                          {plan.resident.roomNumber && (
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                              Room {plan.resident.roomNumber}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground shrink-0">
                        {plan.reviewDate && (
                          <div className="flex items-center gap-1 justify-end">
                            <Calendar className="h-3 w-3" />
                            Review {formatDate(plan.reviewDate)}
                          </div>
                        )}
                        <p className="mt-0.5">Updated {formatDate(plan.updatedAt)}</p>
                      </div>
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
