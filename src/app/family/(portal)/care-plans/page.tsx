import { familyAuth } from "@/family-auth"
import { redirect } from "next/navigation"
import { getCarePlansForFamily } from "@/actions/family"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ClipboardList, Calendar, ChevronRight } from "lucide-react"

// Simplified, family-friendly labels for care plan categories
const CATEGORY_LABELS: Record<string, string> = {
  PERSONAL_CARE: "Personal Care & Hygiene",
  NUTRITION_HYDRATION: "Food & Drinks",
  MOBILITY: "Getting Around",
  SKIN_INTEGRITY: "Skin Care",
  CONTINENCE: "Continence & Comfort",
  MENTAL_HEALTH: "Emotional Wellbeing",
  COMMUNICATION: "Communication",
  MEDICATION: "Medicines",
  SOCIAL_ACTIVITIES: "Activities & Social Life",
  END_OF_LIFE: "Advance Care Planning",
  SLEEP_REST: "Sleep & Rest",
  ORAL_HEALTH: "Oral Health",
  SENSORY: "Sight, Hearing & Senses",
  INFECTION_CONTROL: "Health & Hygiene Safety",
  FALLS_PREVENTION: "Safety & Falls Prevention",
}

function parseGoals(goals: unknown): string[] {
  if (!goals) return []
  if (Array.isArray(goals)) return goals.map(String)
  if (typeof goals === "object") return Object.values(goals as Record<string, string>)
  return []
}

export default async function FamilyCarePlansPage() {
  const session = await familyAuth()
  if (!session?.user) redirect("/family/login")

  const user = session.user as any

  const carePlans = await getCarePlansForFamily(user.residentId, user.organisationId)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <ClipboardList className="w-5 h-5 text-rose-500" />
        <h2 className="text-lg font-semibold text-gray-900">Care Plans</h2>
        <Badge variant="outline" className="text-xs">
          {carePlans.length} active
        </Badge>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        These are the active care plans for your loved one. They describe how the care team
        supports their daily needs and wellbeing.
      </p>

      {carePlans.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-gray-400 text-sm">
            No active care plans to display. Please contact the care home if you have questions.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {carePlans.map((plan) => {
            const goals = parseGoals(plan.goals)
            return (
              <Card key={plan.id} className="border border-rose-100 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 pt-4 px-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-900">
                      {CATEGORY_LABELS[plan.category] ?? plan.category.replace(/_/g, " ")}
                    </CardTitle>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-4 space-y-3">
                  {plan.needsAssessment && (
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
                        Needs &amp; Support
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">{plan.needsAssessment}</p>
                    </div>
                  )}

                  {goals.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
                        Goals
                      </p>
                      <ul className="space-y-1">
                        {goals.slice(0, 3).map((goal, i) => (
                          <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 flex-shrink-0" />
                            {goal}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {plan.reviewDate && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Next review: {format(new Date(plan.reviewDate), "d MMMM yyyy")}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center pt-2">
        Care plans are reviewed regularly by the care team. Last updated{" "}
        {carePlans[0] ? format(new Date(carePlans[0].updatedAt), "d MMMM yyyy") : "—"}.
      </p>
    </div>
  )
}
