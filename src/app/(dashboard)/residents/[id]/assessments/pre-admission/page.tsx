import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { PreAdmissionWizard } from "@/components/assessments/pre-admission-wizard"
import { getServerSession } from "@/lib/auth-helpers"

interface Props {
  params: Promise<{ id: string }>
}

export default async function PreAdmissionPage({ params }: Props) {
  const { id: residentId } = await params
  await getServerSession()

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/residents/${residentId}/assessments/new`} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Pre-Admission Assessment</h1>
          <p className="text-muted-foreground text-sm">Complete all 6 domains to record the prospective resident's needs and preferences.</p>
        </div>
      </div>

      <PreAdmissionWizard residentId={residentId} />
    </div>
  )
}
