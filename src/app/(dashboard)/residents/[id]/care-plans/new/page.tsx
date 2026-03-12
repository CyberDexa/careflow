import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { CarePlanEditor } from "@/components/care-plans/care-plan-editor"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ category?: string }>
}

export default async function NewCarePlanPage({ params, searchParams }: Props) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id: residentId } = await params
  const { category: defaultCategory } = await searchParams

  const user = session.user as any

  const resident = await prisma.resident.findFirst({
    where: { id: residentId, organisationId: user.organisationId },
    select: { id: true, firstName: true, lastName: true },
  })

  if (!resident) notFound()

  const residentName = `${resident.firstName} ${resident.lastName}`

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/residents/${residentId}?tab=care-plans`} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">New Care Plan</h1>
          <p className="text-sm text-muted-foreground">{residentName}</p>
        </div>
      </div>

      <CarePlanEditor residentId={residentId} residentName={residentName} defaultCategory={defaultCategory} />
    </div>
  )
}
