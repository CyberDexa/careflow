import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getMyGroups } from "@/actions/group"
import { GroupDashboard } from "@/components/group/group-dashboard"

export default async function GroupPage() {
  const session = await auth()
  const user = session?.user as any
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) redirect("/dashboard")

  const result = await getMyGroups()
  const groups = "groups" in result ? result.groups : []

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Multi-Site Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor and compare performance across your group of care homes</p>
      </div>
      <GroupDashboard initialGroups={groups as any} isAdmin={user.role === "ADMIN"} />
    </div>
  )
}
