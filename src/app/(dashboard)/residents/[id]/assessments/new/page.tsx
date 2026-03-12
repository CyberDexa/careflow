import Link from "next/link"
import { ChevronLeft, ClipboardList } from "lucide-react"
import { ALL_ASSESSMENT_TYPES, ASSESSMENT_CATEGORIES } from "@/lib/assessment-registry"
import { getServerSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"

interface Props {
  params: Promise<{ id: string }>
}

export default async function NewAssessmentPage({ params }: Props) {
  const { id: residentId } = await params
  await getServerSession() // auth check

  // Get recent assessments for this resident to show last completed date per type
  const recentAssessments = await prisma.residentAssessment.findMany({
    where: { residentId, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    select: { type: true, createdAt: true },
  })

  const lastCompleted = new Map<string, Date>()
  recentAssessments.forEach((a: any) => {
    if (!lastCompleted.has(a.type) && a.createdAt) {
      lastCompleted.set(a.type, a.createdAt)
    }
  })

  const grouped = ASSESSMENT_CATEGORIES.map((cat) => ({
    ...cat,
    types: ALL_ASSESSMENT_TYPES.filter((t) => t.category === cat.value),
  })).filter((g) => g.types.length > 0)

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/residents/${residentId}`} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">New Assessment</h1>
          <p className="text-muted-foreground text-sm">Select the assessment type to complete</p>
        </div>
      </div>

      {/* Pre-admission shortcut */}
      <Link
        href={`/residents/${residentId}/assessments/pre-admission`}
        className="flex items-center gap-4 rounded-xl border-2 border-primary/30 bg-primary/5 p-4 hover:bg-primary/10 transition-colors"
      >
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <ClipboardList className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">Pre-Admission Assessment</p>
          <p className="text-sm text-muted-foreground">6-domain initial assessment: Personal, Care Needs, Medical, Social, Communication, Preferences</p>
        </div>
        <Badge variant="secondary">Multi-domain</Badge>
      </Link>

      {/* By category */}
      {grouped.map((group) => (
        <div key={group.value} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <span>{group.icon}</span> {group.label}
          </h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {group.types.map((at) => {
              const last = lastCompleted.get(at.type)
              return (
                <Link
                  key={at.type}
                  href={`/residents/${residentId}/assessments/new/${at.type}`}
                  className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{at.label}</p>
                    <p className="text-muted-foreground text-xs line-clamp-1">{at.description}</p>
                  </div>
                  {last && (
                    <span className="text-xs text-muted-foreground shrink-0 pt-0.5">
                      {last.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
