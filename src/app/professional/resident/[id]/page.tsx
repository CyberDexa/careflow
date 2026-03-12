import { redirect } from "next/navigation"
import Link from "next/link"
import { getProfessionalSession, getProfessionalResidentView } from "@/actions/professional"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { ArrowLeft, AlertTriangle } from "lucide-react"

export default async function ProfessionalResidentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const prof = await getProfessionalSession()
  if (!prof) redirect("/professional/login")

  const { id } = await params
  const result = await getProfessionalResidentView(id)

  if ("error" in result) {
    return (
      <div className="text-center py-12 space-y-3">
        <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
        <p className="text-gray-700 font-medium">{result.error as string}</p>
        <Link href="/professional/dashboard">
          <Button variant="outline" size="sm">Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  const { resident, careNotes, carePlans, accessType } = result
  const r = resident as any

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/professional/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {r.firstName} {r.lastName}
            {r.preferredName && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({r.preferredName})
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500">{r.organisationId}</p>
        </div>
        <Badge variant="outline" className="ml-auto text-xs">
          {accessType === "COMMENT" ? "Read + Comment" : "Read Only"}
        </Badge>
      </div>

      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <InfoCard label="Date of Birth" value={r.dateOfBirth ? format(new Date(r.dateOfBirth), "d MMM yyyy") : "—"} />
        <InfoCard label="NHS Number" value={r.nhsNumber ?? "—"} />
        <InfoCard label="GP" value={r.gpName ?? "—"} />
        {r.dnacprInPlace && (
          <div className="md:col-span-3">
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <strong>DNACPR in place</strong>
            </div>
          </div>
        )}
      </div>

      {/* Diagnoses + Medications */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Diagnoses</CardTitle>
          </CardHeader>
          <CardContent>
            {r.diagnoses && r.diagnoses.length > 0 ? (
              <ul className="text-sm space-y-1">
                {r.diagnoses.map((d: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">None recorded</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Allergies</CardTitle>
          </CardHeader>
          <CardContent>
            {r.allergies && r.allergies.length > 0 ? (
              <ul className="text-sm space-y-1">
                {r.allergies.map((a: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    {a}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">None recorded</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Medications */}
      {r.currentMedications && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Current Medications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.currentMedications}</p>
          </CardContent>
        </Card>
      )}

      {/* Care Plans */}
      {carePlans.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Care Plans (Approved)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {carePlans.map((cp: any) => (
                <div key={cp.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <span>{cp.category}</span>
                  <span className="text-xs text-gray-400">Updated {format(new Date(cp.updatedAt), "d MMM yyyy")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Care Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent Care Notes (last 20)</CardTitle>
        </CardHeader>
        <CardContent>
          {careNotes.length === 0 ? (
            <p className="text-sm text-gray-400">No care notes found</p>
          ) : (
            <div className="space-y-3">
              {careNotes.map((note: any) => (
                <div key={note.id} className="border-l-2 border-blue-200 pl-3 py-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">{note.category}</Badge>
                    <span className="text-xs text-gray-400">
                      {note.author.firstName} {note.author.lastName} · {format(new Date(note.createdAt), "d MMM yyyy HH:mm")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
    </div>
  )
}
