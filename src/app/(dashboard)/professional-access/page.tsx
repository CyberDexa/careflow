import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getOrgProfessionalAccesses } from "@/actions/professional"
import { ProfessionalAccessClient } from "@/components/professional/professional-access-client"

export default async function ProfessionalAccessPage() {
  const session = await auth()
  const user = session?.user as any
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) redirect("/dashboard")

  const result = await getOrgProfessionalAccesses()
  const accesses = "accesses" in result ? result.accesses : []

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Professional Access</h1>
        <p className="text-sm text-gray-500 mt-1">
          Grant and manage time-limited access to resident records for GPs and healthcare professionals.
        </p>
      </div>
      <ProfessionalAccessClient initialAccesses={accesses as any} />
    </div>
  )
}
