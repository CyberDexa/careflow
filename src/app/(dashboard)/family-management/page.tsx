import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getFamilyUsers } from "@/actions/family"
import FamilyManagementClient from "@/components/family/family-management-client"

export default async function FamilyManagementPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const user = session.user as any
  if (!["MANAGER", "ADMIN"].includes(user.role)) redirect("/dashboard")

  const [familyUsers, residents] = await Promise.all([
    getFamilyUsers(),
    prisma.resident.findMany({
      where: {
        organisationId: user.organisationId,
        status: "ADMITTED",
        deletedAt: null,
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <FamilyManagementClient familyUsers={familyUsers as any} residents={residents} />
    </div>
  )
}
