import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatAge, formatDate, initials } from "@/lib/utils"
import { Plus, Search, Info } from "lucide-react"

export const metadata = { title: "Residents" }

const statusConfig: Record<string, { label: string; variant: any; color: string }> = {
  ENQUIRY:      { label: "Enquiry",      variant: "info",      color: "bg-blue-100 text-blue-800" },
  PRE_ASSESSED: { label: "Pre-Assessed", variant: "warning",   color: "bg-yellow-100 text-yellow-800" },
  ADMITTED:     { label: "Admitted",     variant: "success",   color: "bg-green-100 text-green-800" },
  HOSPITAL:     { label: "Hospital",     variant: "danger",    color: "bg-red-100 text-red-800" },
  DISCHARGED:   { label: "Discharged",   variant: "secondary", color: "bg-gray-100 text-gray-600" },
}

export default async function ResidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; action?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const user = session.user as any

  const { status, q, action } = await searchParams

  const residents = await prisma.resident.findMany({
    where: {
      organisationId: user.organisationId,
      deletedAt: null,
      ...(status ? { status: status as any } : {}),
      ...(q ? {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { nhsNumber: { contains: q, mode: "insensitive" } },
          { roomNumber: { contains: q, mode: "insensitive" } },
        ],
      } : {}),
    },
    orderBy: [{ status: "asc" }, { lastName: "asc" }],
    include: {
      _count: { select: { incidents: true, careNotes: true } },
    },
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Residents</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{residents.length} resident{residents.length !== 1 ? "s" : ""}</p>
        </div>
        <Button asChild>
          <Link href="/residents/new">
            <Plus className="h-4 w-4 mr-1" />
            Add Resident
          </Link>
        </Button>
      </div>

      {/* Action banner */}
      {action === "report-incident" && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 px-4 py-3 flex items-center gap-2 text-sm">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="text-blue-800 dark:text-blue-300 font-medium">Select a resident to report an incident for.</span>
        </div>
      )}
      {action === "new-care-plan" && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 px-4 py-3 flex items-center gap-2 text-sm">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="text-blue-800 dark:text-blue-300 font-medium">Select a resident to create a care plan for.</span>
        </div>
      )}

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        <form className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search name, NHS number, room..."
            className="pl-9"
          />
        </form>
        <div className="flex gap-1 flex-wrap">
          {[null, "ENQUIRY", "PRE_ASSESSED", "ADMITTED", "HOSPITAL", "DISCHARGED"].map((s) => (
            <Link
              key={s ?? "all"}
              href={s ? `/residents?status=${s}` : "/residents"}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                status === s || (!status && !s)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s ? statusConfig[s].label : "All"}
            </Link>
          ))}
        </div>
      </div>

      {/* Resident grid */}
      {residents.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No residents found</p>
          <p className="text-sm mt-1">
            {q || status ? "Try adjusting your filters." : "Add your first resident to get started."}
          </p>
          {!q && !status && (
            <Button asChild className="mt-4">
              <Link href="/residents/new">Add First Resident</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {residents.map((resident: any) => {
            const cfg = statusConfig[resident.status] || statusConfig.ENQUIRY
            const href =
              action === "report-incident"
                ? `/incidents/new?residentId=${resident.id}`
                : action === "new-care-plan"
                ? `/residents/${resident.id}/care-plans/new`
                : `/residents/${resident.id}`
            return (
              <Link key={resident.id} href={href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-11 w-11 shrink-0">
                        {resident.photoUrl && <AvatarImage src={resident.photoUrl} alt={resident.firstName} />}
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {initials(resident.firstName, resident.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm leading-none">
                              {resident.firstName} {resident.lastName}
                            </p>
                            {resident.preferredName && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Known as {resident.preferredName}
                              </p>
                            )}
                          </div>
                          <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <div className="mt-2 space-y-0.5">
                          {resident.dateOfBirth && (
                            <p className="text-xs text-muted-foreground">
                              DOB: {formatDate(resident.dateOfBirth)} · {formatAge(resident.dateOfBirth)}
                            </p>
                          )}
                          {resident.roomNumber && (
                            <p className="text-xs text-muted-foreground">Room {resident.roomNumber}</p>
                          )}
                        </div>
                        <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
                          <span>{resident._count.careNotes} notes</span>
                          <span>{resident._count.incidents} incidents</span>
                        </div>
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
