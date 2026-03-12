import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Pill, ChevronRight, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { initials } from "@/lib/utils"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "eMAR" }

export default async function EmarListPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const user = session.user as any

  const residents = await prisma.resident.findMany({
    where: {
      organisationId: user.organisationId,
      status: "ADMITTED",
      deletedAt: null,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      roomNumber: true,
      photoUrl: true,
      _count: { select: { medications: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  })

  // Find residents with omitted administrations today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const omittedAdmins = await prisma.medicationAdministration.groupBy({
    by: ["medicationId"],
    where: {
      status: "OMITTED",
      scheduledTime: { gte: today },
      medication: { resident: { organisationId: user.organisationId } },
    },
    _count: true,
  })
  const omittedMedIds = new Set(omittedAdmins.map((m) => m.medicationId))

  // Get medication -> resident mapping for omitted
  const omittedMeds = omittedMedIds.size > 0
    ? await prisma.medication.findMany({
        where: { id: { in: [...omittedMedIds] } },
        select: { residentId: true },
      })
    : []
  const residentsWithOmitted = new Set(omittedMeds.map((m) => m.residentId))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">eMAR</h1>
        </div>
        <Badge variant="outline">{residents.length} residents</Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Select a resident to view their medication chart, administer doses, and manage prescriptions.
      </p>

      <div className="grid gap-2">
        {residents.map((r) => (
          <Link key={r.id} href={`/emar/${r.id}`}>
            <Card className="hover:shadow-sm transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-10 w-10">
                  {r.photoUrl && <AvatarImage src={r.photoUrl} alt={r.firstName} />}
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                    {initials(r.firstName, r.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    {r.firstName} {r.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.roomNumber ? `Room ${r.roomNumber}` : "No room"} · {r._count.medications} medication{r._count.medications !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {residentsWithOmitted.has(r.id) && (
                    <Badge variant="danger" className="text-xs gap-1">
                      <AlertTriangle className="h-3 w-3" /> Omitted
                    </Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {residents.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No admitted residents found.
        </div>
      )}
    </div>
  )
}
