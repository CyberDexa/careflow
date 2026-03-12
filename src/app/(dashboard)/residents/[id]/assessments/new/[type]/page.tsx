import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { getAssessmentConfig } from "@/lib/assessment-registry"
import { AssessmentForm } from "@/components/assessments/assessment-form"
import { getServerSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

interface Props {
  params: Promise<{ id: string; type: string }>
}

export default async function FormalAssessmentPage({ params }: Props) {
  const { id: residentId, type } = await params
  await getServerSession()

  const config = getAssessmentConfig(type)
  if (!config) notFound()

  // Fetch latest approved PRE_ADMISSION assessment and flatten all domain content as prefill
  const preAdmissionAssessment = await prisma.residentAssessment.findFirst({
    where: { residentId, type: "PRE_ADMISSION" as any, status: "APPROVED" },
    include: { domains: true },
    orderBy: { completedAt: "desc" },
  })

  const prefillData: Record<string, any> = {}
  if (preAdmissionAssessment) {
    for (const domain of preAdmissionAssessment.domains) {
      if (domain.content && typeof domain.content === "object") {
        Object.assign(prefillData, domain.content as Record<string, any>)
      }
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/residents/${residentId}/assessments/new`} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{config.label}</h1>
          <p className="text-muted-foreground text-sm">{config.description}</p>
        </div>
      </div>

      <AssessmentForm
        residentId={residentId}
        assessmentType={type}
        backHref={`/residents/${residentId}/assessments/new`}
        prefillData={Object.keys(prefillData).length > 0 ? prefillData : undefined}
      />
    </div>
  )
}
