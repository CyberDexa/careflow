import { familyAuth } from "@/family-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Heart, LogOut } from "lucide-react"

export default async function FamilyPortalLayout({ children }: { children: React.ReactNode }) {
  const session = await familyAuth()
  if (!session?.user) redirect("/family/login")

  const user = session.user as any

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50">
      {/* Header */}
      <header className="bg-white border-b border-rose-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">CareFlow Family</p>
              <p className="text-xs text-gray-500">
                {user.residentFirstName} {user.residentLastName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:block">
              Hello, {user.name?.split(" ")[0]}
            </span>
            <form
              action={async () => {
                "use server"
                const { familySignOut } = await import("@/family-auth")
                await familySignOut({ redirectTo: "/family/login" })
              }}
            >
              <button
                type="submit"
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-rose-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="max-w-2xl mx-auto px-4 flex gap-1 pb-1">
          {[
            { href: "/family/dashboard", label: "Updates" },
            { href: "/family/messages", label: "Messages" },
            { href: "/family/care-plans", label: "Care Plans" },
          ].map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-t-lg transition-colors"
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-gray-400 border-t border-gray-100 mt-8">
        CareFlow Family Portal — Keeping you connected with your loved one&apos;s care
      </footer>
    </div>
  )
}
