import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { MobileBottomNav } from "@/components/layout/sidebar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const user = session.user as any
  const orgId = user.organisationId as string
  const userId = user.id as string

  const notifications = orgId
    ? await prisma.notification.findMany({
        where: {
          organisationId: orgId,
          OR: [{ userId: null }, { userId }],
          isRead: false,
        },
        orderBy: { createdAt: "desc" },
        take: 15,
      })
    : []

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={user.role} />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <Header
          userName={user.name || "User"}
          userRole={user.role || "CARE_STAFF"}
          organisationName={user.organisationName || "Care Home"}
          initialNotifications={notifications}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </div>
  )
}

