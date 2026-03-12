import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { CareNoteForm } from "@/components/forms/care-note-form"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ResidentNewCareNotePage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect("/login")
  const user = session.user as any

  const resident = await prisma.resident.findFirst({
    where: { id, organisationId: user.organisationId, deletedAt: null },
    select: { id: true, firstName: true, lastName: true },
  })

  if (!resident) notFound()

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/residents/${id}`} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">New Care Note</h1>
      </div>

      <CareNoteForm
        residentId={resident.id}
        residentName={`${resident.firstName} ${resident.lastName}`}
        onSuccess={undefined}
      />
    </div>
  )
}
