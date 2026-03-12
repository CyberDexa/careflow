import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { formatDate, formatAge, initials } from "@/lib/utils"
import Link from "next/link"
import {
  Phone, Mail, MapPin, Stethoscope, ClipboardList,
  FileText, AlertTriangle, Heart, Plus, ChevronLeft,
} from "lucide-react"
import type { Metadata } from "next"
import { AdmitResidentButton } from "@/components/residents/admit-button"
import { CareNotesTab } from "@/components/care-notes/care-notes-tab"
import { ResidentPhotoUpload } from "@/components/residents/photo-upload"

interface PageProps { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const resident = await prisma.resident.findUnique({ where: { id }, select: { firstName: true, lastName: true } })
  return { title: resident ? `${resident.firstName} ${resident.lastName}` : "Resident" }
}

const statusConfig: Record<string, { label: string; color: string }> = {
  ENQUIRY:      { label: "Enquiry",      color: "bg-blue-100 text-blue-800" },
  PRE_ASSESSED: { label: "Pre-Assessed", color: "bg-yellow-100 text-yellow-800" },
  ADMITTED:     { label: "Admitted",     color: "bg-green-100 text-green-800" },
  HOSPITAL:     { label: "Hospital",     color: "bg-red-100 text-red-800" },
  DISCHARGED:   { label: "Discharged",   color: "bg-gray-100 text-gray-600" },
}

export default async function ResidentDetailPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect("/login")
  const user = session.user as any

  const resident = await prisma.resident.findFirst({
    where: { id, organisationId: user.organisationId, deletedAt: null },
    include: {
      medicalHistory: true,
      contacts: { orderBy: [{ isNextOfKin: "desc" }, { isEmergency: "desc" }] },
      assessments: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { domains: { select: { domainType: true, isComplete: true } } },
      },
      carePlans: {
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, category: true, status: true, updatedAt: true },
      },
      careNotes: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { author: { select: { firstName: true, lastName: true } } },
      },
      incidents: {
        where: { deletedAt: null },
        orderBy: { occurredAt: "desc" },
        take: 5,
        select: { id: true, type: true, severity: true, status: true, occurredAt: true },
      },
      bodyMapEntries: {
        where: { deletedAt: null, isResolved: false },
        select: { id: true },
        take: 100,
      },
      _count: {
        select: { assessments: true, carePlans: true, careNotes: true, incidents: true },
      },
    },
  })

  if (!resident) notFound()

  const cfg = statusConfig[resident.status] || statusConfig.ENQUIRY

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <Link href="/residents" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> Residents
      </Link>

      {/* Profile header */}
      <div className="flex flex-wrap items-start gap-4">
        <ResidentPhotoUpload
          residentId={id}
          photoUrl={resident.photoUrl}
          firstName={resident.firstName}
          lastName={resident.lastName}
          initials={initials(resident.firstName, resident.lastName)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">
              {resident.firstName} {resident.lastName}
            </h1>
            {resident.preferredName && (
              <span className="text-muted-foreground text-sm">({resident.preferredName})</span>
            )}
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>
              {cfg.label}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {resident.dateOfBirth && (
              <span>DOB: {formatDate(resident.dateOfBirth)} ({formatAge(resident.dateOfBirth)})</span>
            )}
            {resident.roomNumber && <span>Room {resident.roomNumber}</span>}
            {resident.nhsNumber && <span>NHS: {resident.nhsNumber}</span>}
            {resident.gender && <span>{resident.gender}</span>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {resident.status === "ENQUIRY" && (
            <Button asChild size="sm">
              <Link href={`/residents/${id}/assessments/pre-admission`}>
                Start Pre-Admission
              </Link>
            </Button>
          )}
          {resident.status === "PRE_ASSESSED" && (
            <AdmitResidentButton residentId={id} />
          )}
          {resident.status !== "ADMITTED" && resident.status !== "DISCHARGED" && resident.status !== "ENQUIRY" && resident.status !== "PRE_ASSESSED" && (
            <Button asChild size="sm">
              <Link href={`/residents/${id}/assessments/new`}>Start Assessment</Link>
            </Button>
          )}
          {resident.status === "ADMITTED" && (
            <Button asChild size="sm">
              <Link href={`/residents/${id}/assessments/new`}>New Assessment</Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href={`/residents/${id}/care-notes/new`}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Note
            </Link>
          </Button>
        </div>
      </div>

      {/* Alert flags */}
      <div className="flex flex-wrap gap-2">
        {resident.dnacprInPlace && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
            DNACPR in place
          </span>
        )}
        {resident.doLsAuthorised && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">
            DoLS authorised
          </span>
        )}
        {!resident.mentalCapacity && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            Lacks mental capacity
          </span>
        )}
        {resident.interpreterNeeded && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
            Interpreter needed
          </span>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="medical">Medical</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="assessments">Assessments ({resident._count.assessments})</TabsTrigger>
          <TabsTrigger value="care-plans">Care Plans ({resident._count.carePlans})</TabsTrigger>
          <TabsTrigger value="care-notes">Notes ({resident._count.careNotes})</TabsTrigger>
          <TabsTrigger value="incidents">Incidents ({resident._count.incidents})</TabsTrigger>
          <TabsTrigger value="body-map">Body Map {resident.bodyMapEntries.length > 0 ? `(${resident.bodyMapEntries.length} active)` : ""}</TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Assessment summary widget */}
          {resident.assessments.length > 0 && (() => {
            const latest = resident.assessments[0]
            const completedDomains = latest.domains.filter((d: any) => d.isComplete).length
            const totalDomains = latest.domains.length
            const pct = totalDomains > 0 ? Math.round((completedDomains / totalDomains) * 100) : 0
            const rag =
              latest.status === "APPROVED" && pct === 100 ? "green"
              : latest.status === "PENDING_APPROVAL" ? "amber"
              : "red"
            const ragClass = rag === "green" ? "border-l-green-500 bg-green-50" : rag === "amber" ? "border-l-amber-500 bg-amber-50" : "border-l-red-500 bg-red-50"
            const ragTextClass = rag === "green" ? "text-green-700" : rag === "amber" ? "text-amber-700" : "text-red-700"
            return (
              <Link href={`/residents/${id}/assessments/${latest.id}`}>
                <Card className={`border-l-4 ${ragClass} hover:shadow-sm transition-shadow cursor-pointer`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Latest Assessment</p>
                        <p className="font-medium text-sm">{latest.type.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">
                          {completedDomains}/{totalDomains} domains complete &middot; {formatDate(latest.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${ragTextClass}`}>
                          {latest.status === "APPROVED" ? "✓ Approved" : latest.status === "PENDING_APPROVAL" ? "⏳ Awaiting Approval" : "In Progress"}
                        </p>
                        {totalDomains > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">{pct}% complete</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })()}

          <div className="grid sm:grid-cols-2 gap-4">
            <InfoCard title="Personal Details">
              <InfoRow label="Religion" value={resident.religion} />
              <InfoRow label="Ethnicity" value={resident.ethnicity} />
              <InfoRow label="Language" value={resident.language} />
              <InfoRow label="Nationality" value={resident.nationality} />
              <InfoRow label="Funding type" value={resident.fundingType} />
              <InfoRow label="Admission" value={formatDate(resident.admissionDate)} />
            </InfoCard>
            <InfoCard title="GP Details">
              <InfoRow label="GP Name" value={resident.gpName} />
              <InfoRow label="Practice" value={resident.gpPractice} />
              <InfoRow label="Phone" value={resident.gpPhone} />
              <InfoRow label="NHS local team" value={resident.nhsLocalTeam} />
            </InfoCard>
          </div>
          {resident.notes && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">General Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{resident.notes}</p></CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Medical ── */}
        <TabsContent value="medical" className="mt-4 space-y-4">
          {resident.medicalHistory ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <InfoCard title="Diagnoses & Conditions">
                {resident.medicalHistory.diagnoses.length > 0 ? (
                  <ul className="space-y-1">
                    {resident.medicalHistory.diagnoses.map((d: string) => (
                      <li key={d} className="text-sm flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">None recorded</p>}
              </InfoCard>
              <InfoCard title="Allergies & Alerts">
                {resident.medicalHistory.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {resident.medicalHistory.allergies.map((a: string) => (
                      <span key={a} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">{a}</span>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">No known allergies</p>}
              </InfoCard>
              <InfoCard title="Mobility & Function">
                <InfoRow label="Mobility" value={resident.medicalHistory.mobilityLevel?.replace(/_/g, " ")} />
                {resident.medicalHistory.mobilityAids.length > 0 && (
                  <InfoRow label="Aids" value={resident.medicalHistory.mobilityAids.join(", ")} />
                )}
                <InfoRow label="Continence" value={resident.medicalHistory.continenceLevel?.replace(/_/g, " ")} />
              </InfoCard>
              <InfoCard title="Nutrition & Diet">
                <InfoRow label="Texture modified" value={resident.medicalHistory.textureModified ? `Yes — ${resident.medicalHistory.textureLevel || ""}` : "No"} />
                <InfoRow label="Thickened fluids" value={resident.medicalHistory.fluidThickened ? `Yes — ${resident.medicalHistory.fluidThickness || ""}` : "No"} />
                {resident.medicalHistory.dietaryNeeds.length > 0 && (
                  <InfoRow label="Dietary needs" value={resident.medicalHistory.dietaryNeeds.join(", ")} />
                )}
              </InfoCard>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Medical history not recorded.</p>
          )}
        </TabsContent>

        {/* ── Contacts ── */}
        <TabsContent value="contacts" className="mt-4">
          {resident.contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contacts recorded.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {resident.contacts.map((contact: any) => (
                <Card key={contact.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{contact.firstName} {contact.lastName}</p>
                        <p className="text-xs text-muted-foreground">{contact.relationship}</p>
                      </div>
                      <div className="flex gap-1">
                        {contact.isNextOfKin && <Badge variant="default" className="text-xs">NOK</Badge>}
                        {contact.isPoa && <Badge variant="secondary" className="text-xs">POA</Badge>}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {contact.phone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" /> {contact.phone}
                        </div>
                      )}
                      {contact.email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" /> {contact.email}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Assessments ── */}
        <TabsContent value="assessments" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/residents/${id}/assessments`}>View full history</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/residents/${id}/assessments/new`}>New Assessment</Link>
            </Button>
          </div>
          {resident.assessments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assessments recorded.</p>
          ) : (
            resident.assessments.map((a: any) => (
              <Link key={a.id} href={`/residents/${id}/assessments/${a.id}`}>
                <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{a.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(a.createdAt)} · {a.domains.filter((d: any) => d.isComplete).length}/{a.domains.length} domains complete</p>
                    </div>
                    <Badge variant={a.status === "APPROVED" ? "success" : a.status === "IN_PROGRESS" ? "secondary" : "warning"}>
                      {a.status.replace(/_/g, " ")}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
          {resident._count.assessments > 5 && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/residents/${id}/assessments`}>View all {resident._count.assessments} assessments →</Link>
            </Button>
          )}
        </TabsContent>

        {/* ── Care Plans ── */}
        <TabsContent value="care-plans" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/residents/${id}/care-plans`}>View all plans</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/residents/${id}/care-plans/new`}>Generate Care Plan</Link>
            </Button>
          </div>
          {resident.carePlans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No care plans yet.</p>
          ) : (
            resident.carePlans.map((cp: any) => (
              <Link key={cp.id} href={`/residents/${id}/care-plans/${cp.id}`}>
                <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{cp.category.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">Updated {formatDate(cp.updatedAt)}</p>
                    </div>
                    <Badge variant={cp.status === "ACTIVE" ? "success" : cp.status === "DRAFT" ? "secondary" : "warning"}>
                      {cp.status}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>

        {/* ── Care Notes ── */}
        <TabsContent value="care-notes">
          <CareNotesTab residentId={id} initialNotes={resident.careNotes} />
        </TabsContent>

        {/* ── Incidents ── */}
        <TabsContent value="incidents" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button asChild size="sm" variant="destructive">
              <Link href={`/incidents/new?residentId=${id}`}>Report Incident</Link>
            </Button>
          </div>
          {resident.incidents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No incidents recorded.</p>
          ) : (
            resident.incidents.map((inc: any) => (
              <Link key={inc.id} href={`/incidents/${inc.id}`}>
                <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{inc.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(inc.occurredAt)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={inc.severity === "CRITICAL" || inc.severity === "HIGH" ? "danger" : inc.severity === "MEDIUM" ? "warning" : "secondary"}>
                        {inc.severity}
                      </Badge>
                      <Badge variant={inc.status === "CLOSED" ? "success" : "outline"}>
                        {inc.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>

        {/* ── Body Map ── */}
        <TabsContent value="body-map" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {resident.bodyMapEntries.length > 0
                ? `${resident.bodyMapEntries.length} active observation${resident.bodyMapEntries.length !== 1 ? "s" : ""}`
                : "No active observations"}
            </p>
            <Button asChild size="sm">
              <Link href={`/residents/${id}/body-map`}>Open Body Map</Link>
            </Button>
          </div>
          {resident.bodyMapEntries.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No active body map entries. Click "Open Body Map" to view the full history or add a new entry.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {resident.bodyMapEntries.slice(0, 3).map((entry: any) => (
                <Card key={entry.id} className="border-l-4 border-l-destructive/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <span className="text-sm">{entry.id}</span>
                  </CardContent>
                </Card>
              ))}
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href={`/residents/${id}/body-map`}>
                  View full body map history →
                </Link>
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}
