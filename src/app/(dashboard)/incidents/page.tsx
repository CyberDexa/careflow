import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { format } from "date-fns"
import { AlertTriangle, Plus, Search, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const SEVERITY_STYLES: Record<string, string> = {
  LOW: "bg-green-100 text-green-700 border-green-200",
  MEDIUM: "bg-yellow-100 text-yellow-700 border-yellow-200",
  HIGH: "bg-orange-100 text-orange-700 border-orange-200",
  CRITICAL: "bg-red-100 text-red-700 border-red-200",
}

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  UNDER_INVESTIGATION: "bg-purple-100 text-purple-700",
  CLOSED: "bg-gray-100 text-gray-500",
}

interface Props {
  searchParams: Promise<{ severity?: string; status?: string; q?: string; page?: string }>
}

export default async function IncidentsPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const user = session.user as any

  const params = await searchParams
  const severity = params.severity
  const status = params.status
  const q = params.q
  const page = parseInt(params.page ?? "1")
  const limit = 20
  const skip = (page - 1) * limit

  const where: any = { organisationId: user.organisationId }
  if (severity) where.severity = severity
  if (status) where.status = status
  if (q) {
    where.OR = [
      { description: { contains: q, mode: "insensitive" } },
      { resident: { firstName: { contains: q, mode: "insensitive" } } },
      { resident: { lastName: { contains: q, mode: "insensitive" } } },
    ]
  }

  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      include: {
        resident: { select: { id: true, firstName: true, lastName: true, roomNumber: true } },
        reportedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: limit,
      skip,
    }),
    prisma.incident.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Incidents</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} incident{total !== 1 ? "s" : ""} on record</p>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search incidents…"
            className="pl-9 h-9 w-56 rounded-md border border-input bg-background text-sm px-3 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <select name="severity" defaultValue={severity ?? ""} className="h-9 rounded-md border border-input bg-background text-sm px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="">All Severity</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
        <select name="status" defaultValue={status ?? ""} className="h-9 rounded-md border border-input bg-background text-sm px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="">All Status</option>
          <option value="OPEN">Open</option>
          <option value="UNDER_INVESTIGATION">Under Investigation</option>
          <option value="CLOSED">Closed</option>
        </select>
        <Button type="submit" size="sm" variant="outline">Filter</Button>
      </form>

      {/* Table */}
      {incidents.length === 0 ? (
        <div className="rounded-xl border flex flex-col items-center justify-center py-20 gap-3 text-center">
          <AlertTriangle className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No incidents found</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Resident</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Incident</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Severity</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reported By</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {incidents.map((incident: any) => (
                <tr key={incident.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {format(new Date(incident.occurredAt), "dd MMM yyyy HH:mm")}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/residents/${incident.resident.id}`} className="font-medium hover:underline">
                      {incident.resident.firstName} {incident.resident.lastName}
                    </Link>
                    {incident.resident.roomNumber && (
                      <span className="ml-1 text-xs text-muted-foreground">Rm {incident.resident.roomNumber}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="font-medium truncate">{incident.description?.slice(0, 60) ?? "—"}{incident.description?.length > 60 ? "…" : ""}</p>
                    {incident.type && <p className="text-xs text-muted-foreground">{incident.type.replace("_", " ")}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${SEVERITY_STYLES[incident.severity] ?? ""}`}>
                      {incident.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[incident.status ?? "OPEN"] ?? ""}`}>
                      {(incident.status ?? "OPEN").replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {incident.reportedBy ? `${incident.reportedBy.firstName} ${incident.reportedBy.lastName}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/incidents/${incident.id}`} className="text-muted-foreground hover:text-foreground">
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`?page=${p}${severity ? `&severity=${severity}` : ""}${status ? `&status=${status}` : ""}${q ? `&q=${q}` : ""}`}
              className={`h-8 w-8 rounded-md flex items-center justify-center text-sm border ${p === page ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-muted"}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
