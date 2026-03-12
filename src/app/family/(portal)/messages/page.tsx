import { familyAuth } from "@/family-auth"
import { redirect } from "next/navigation"
import { getMessagesForFamilyUser } from "@/actions/family"
import FamilyInboxClient from "@/components/family/family-inbox-client"
import { MessageCircle } from "lucide-react"

export default async function FamilyMessagesPage() {
  const session = await familyAuth()
  if (!session?.user) redirect("/family/login")

  const user = session.user as any

  const messages = await getMessagesForFamilyUser(user.residentId, user.organisationId)

  const unreadFromStaff = messages.filter((m) => m.fromStaffId && !m.isRead).length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-rose-500" />
        <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
        {unreadFromStaff > 0 && (
          <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {unreadFromStaff} new
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500">
        Send a message to the care team or view their replies. All messages are private and secure.
      </p>

      <FamilyInboxClient
        messages={messages as any}
        residentId={user.residentId}
        organisationId={user.organisationId}
        familyUserId={user.familyUserId}
      />
    </div>
  )
}
