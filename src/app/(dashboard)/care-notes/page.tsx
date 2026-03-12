import { getServerSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { formatDistanceToNow } from "date-fns"
import { FileText, Plus, Search } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

const CATEGORY_COLOURS: Record<string, string> = {
  PERSONAL_CARE: "bg-purple-100 text-purple-800",
  FOOD_FLUID: "bg-orange-100 text-orange-800",
  MOBILITY: "bg-blue-100 text-blue-800",
  WELLBEING: "bg-yellow-100 text-yellow-800",
  BEHAVIOUR: "bg-pink-100 text-pink-800",
  HEALTH_CONCERN: "bg-red-100 text-red-800",
  SOCIAL: "bg-green-100 text-green-800",
  SLEEP: "bg-indigo-100 text-indigo-800",
  CONTINENCE: "bg-teal-100 text-teal-800",
  GENERAL: "bg-gray-100 text-gray-700",
}

const CATEGORY_LABELS: Record<string, string> = {
  PERSONAL_CARE: "Personal Care",
  FOOD_FLUID: "Food & Fluid",
  MOBILITY: "Mobility",
  WELLBEING: "Wellbeing",
  BEHAVIOUR: "Behaviour",
  HEALTH_CONCERN: "Health Concern",
  SOCIAL: "Social",
  SLEEP: "Sleep",
  CONTINENCE: "Continence",
  GENERAL: "General",
}

interface Props {
  searchParams: Promise<{ q?: string; category?: string; shift?: string; page?: string }>
}

export default async function CareNotesPage({ searchParams }: Props) {
  const params = await searchParams
  const session = await getServerSession()
  const user = session.user as any
  const page = Number(params.page ?? "1")
  const limit = 25

  const where: any = {
    deletedAt: null,
    resident: { organisationId: user.organisationId },
  }
  if (params.category) where.category = params.category
  if (params.shift) where.shift = params.shift
  if (params.q) {
    where.OR = [
      { content: { contains: params.q, mode: "insensitive" } },
      { resident: { firstName: { contains: params.q, mode: "insensitive" } } },
      { resident: { lastName: { contains: params.q, mode: "insensitive" } } },
    ]
  }

  const [notes, total] = await Promise.all([
    prisma.careNote.findMany({
      where,
      include: {
        resident: { select: { id: true, firstName: true, lastName: true, roomNumber: true } },
        author: { select: { firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.careNote.count({ where }),
  ])

  const pages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Care Notes</h1>
          <p className="text-muted-foreground text-sm">{total.toLocaleString()} notes across all residents</p>
        </div>
        <Link href="/care-notes/new">
          <Button><Plus className="mr-2 h-4 w-4" /> Add Note</Button>
        </Link>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-3">
          <form className="flex flex-wrap gap-2" method="GET">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                name="q"
                defaultValue={params.q}
                placeholder="Search notes or resident name..."
                className="w-full pl-8 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <select name="category" defaultValue={params.category ?? ""} className="px-3 py-2 text-sm border rounded-md">
              <option value="">All categories</option>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select name="shift" defaultValue={params.shift ?? ""} className="px-3 py-2 text-sm border rounded-md">
              <option value="">All shifts</option>
              <option value="MORNING">Morning</option>
              <option value="AFTERNOON">Afternoon</option>
              <option value="NIGHT">Night</option>
            </select>
            <Button type="submit" size="sm" variant="outline">Filter</Button>
          </form>
        </CardContent>
      </Card>

      {/* Notes timeline */}
      {notes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No care notes found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note: any) => (
            <Card key={note.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                    <AvatarFallback className="text-xs">
                      {note.author.firstName[0]}{note.author.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Link href={`/residents/${note.resident.id}`} className="font-medium text-sm hover:underline">
                        {note.resident.firstName} {note.resident.lastName}
                      </Link>
                      {note.resident.roomNumber && (
                        <span className="text-xs text-muted-foreground">Room {note.resident.roomNumber}</span>
                      )}
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLOURS[note.category] || CATEGORY_COLOURS.GENERAL}`}>
                        {CATEGORY_LABELS[note.category] || note.category}
                      </span>
                      <span className="text-xs text-muted-foreground">{note.shift.charAt(0) + note.shift.slice(1).toLowerCase()} shift</span>
                    </div>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {note.author.firstName} {note.author.lastName} · {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-1 pt-4">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/care-notes?page=${p}${params.q ? `&q=${params.q}` : ""}${params.category ? `&category=${params.category}` : ""}${params.shift ? `&shift=${params.shift}` : ""}`}
            >
              <button className={`h-8 w-8 rounded text-sm ${p === page ? "bg-primary text-primary-foreground" : "border hover:bg-muted"}`}>{p}</button>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
