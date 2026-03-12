import { redirect } from "next/navigation"
import Link from "next/link"
import { getProfessionalSession, getMyProfessionalAccess } from "@/actions/professional"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { User, Calendar, Stethoscope, LogOut } from "lucide-react"
import { ProfessionalLogout } from "@/components/professional/professional-logout"

export default async function ProfessionalDashboard() {
  const prof = await getProfessionalSession()
  if (!prof) redirect("/professional/login")

  const result = await getMyProfessionalAccess()
  const accesses = "accesses" in result ? result.accesses ?? [] : []

  return (
    <div className="space-y-6">
      {/* Welcome bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Welcome, {prof.firstName} {prof.lastName}
          </h1>
          <p className="text-sm text-gray-500">{prof.profession} · {prof.email}</p>
        </div>
        <ProfessionalLogout />
      </div>

      {/* Access list */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Your Active Resident Accesses ({accesses.length})
        </h2>

        {accesses.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-gray-500 text-sm">
              You don't currently have access to any residents.
              <br />
              Contact the care home directly to request access.
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {accesses.map((a: any) => (
              <Card key={a.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm">
                      {a.resident.firstName} {a.resident.lastName}
                    </CardTitle>
                    <Badge variant={a.accessType === "COMMENT" ? "default" : "outline"} className="text-xs">
                      {a.accessType === "COMMENT" ? "Read + Comment" : "Read Only"}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">{a.resident.organisation.name}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar className="h-3.5 w-3.5" />
                    Expires {format(new Date(a.expiresAt), "d MMM yyyy 'at' HH:mm")}
                  </div>
                  {a.resident.nhsNumber && (
                    <div className="text-xs text-gray-500">NHS: {a.resident.nhsNumber}</div>
                  )}
                  <Link href={`/professional/resident/${a.resident.id}`}>
                    <Button size="sm" className="w-full mt-2">View Record</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
