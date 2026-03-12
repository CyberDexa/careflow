import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { IncidentForm } from "@/components/forms/incident-form"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

interface Props {
  searchParams: Promise<{ residentId?: string }>
}

export default async function NewIncidentPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { residentId } = await searchParams

  if (!residentId) {
    // No resident specified — redirect to residents list to pick one
    redirect("/residents")
  }

  const user = session.user as any

  const resident = await prisma.resident.findFirst({
    where: { id: residentId, organisationId: user.organisationId },
    select: { id: true, firstName: true, lastName: true, roomNumber: true },
  })

  if (!resident) notFound()

  const residentName = `${resident.firstName} ${resident.lastName}`

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/residents/${residentId}?tab=incidents`} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Report Incident</h1>
          <p className="text-sm text-muted-foreground">{residentName} · Room {resident.roomNumber ?? "N/A"}</p>
        </div>
      </div>

      <IncidentForm residentId={residentId} residentName={residentName} />
    </div>
  )
}
