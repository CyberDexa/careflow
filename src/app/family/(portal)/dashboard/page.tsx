import { familyAuth } from "@/family-auth"
import { redirect } from "next/navigation"
import {
  getResidentSummaryForFamily,
  getWellbeingUpdatesForFamily,
} from "@/actions/family"
import { format, formatDistanceToNow } from "date-fns"
import { Smile, Coffee, Moon, Activity, Camera, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"

const MOOD_CONFIG = {
  VERY_HAPPY: { label: "Very Happy", emoji: "😄", colour: "bg-green-100 text-green-800" },
  HAPPY: { label: "Happy", emoji: "😊", colour: "bg-green-50 text-green-700" },
  NEUTRAL: { label: "Settled", emoji: "😐", colour: "bg-yellow-50 text-yellow-700" },
  SAD: { label: "A little low", emoji: "😔", colour: "bg-orange-50 text-orange-700" },
  DISTRESSED: { label: "Distressed", emoji: "😢", colour: "bg-red-50 text-red-800" },
}

const LEVEL_CONFIG = {
  EXCELLENT: { label: "Excellent", colour: "text-green-600" },
  GOOD: { label: "Good", colour: "text-green-500" },
  FAIR: { label: "Fair", colour: "text-yellow-600" },
  POOR: { label: "Poor", colour: "text-red-600" },
}

export default async function FamilyDashboardPage() {
  const session = await familyAuth()
  if (!session?.user) redirect("/family/login")

  const user = session.user as any

  const [resident, updates] = await Promise.all([
    getResidentSummaryForFamily(user.residentId, user.organisationId),
    getWellbeingUpdatesForFamily(user.residentId, user.organisationId),
  ])

  if (!resident) redirect("/family/login")

  const displayName = resident.preferredName ?? resident.firstName

  return (
    <div className="space-y-6">
      {/* Resident card */}
      <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-5 flex items-center gap-4">
        {resident.photoUrl ? (
          <Image
            src={resident.photoUrl}
            alt={displayName}
            width={64}
            height={64}
            className="w-16 h-16 rounded-full object-cover border-2 border-rose-200"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-2xl font-bold text-rose-500">
            {resident.firstName[0]}
          </div>
        )}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{displayName}</h2>
          {resident.roomNumber && (
            <p className="text-sm text-gray-500">Room {resident.roomNumber}</p>
          )}
          {resident.admissionDate && (
            <p className="text-xs text-gray-400">
              Resident since {format(new Date(resident.admissionDate), "MMMM yyyy")}
            </p>
          )}
        </div>
      </div>

      {/* Wellbeing updates */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-500" />
            Wellbeing Updates
          </h3>
          <span className="text-xs text-gray-400">Last 30 days</span>
        </div>

        {updates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-gray-400 text-sm">
              No updates yet. The care team publishes updates here daily.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {updates.map((update) => {
              const mood = MOOD_CONFIG[update.mood as keyof typeof MOOD_CONFIG]
              return (
                <Card key={update.id} className="border border-rose-100 shadow-sm bg-white">
                  <CardContent className="p-5 space-y-4">
                    {/* Date + mood */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {format(new Date(update.createdAt), "EEEE d MMMM")}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(update.createdAt), { addSuffix: true })} ·{" "}
                          Posted by {update.createdBy.firstName}
                        </p>
                      </div>
                      <Badge className={`${mood?.colour} border-0 text-sm px-3 py-1`}>
                        {mood?.emoji} {mood?.label}
                      </Badge>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <Coffee className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Appetite</p>
                        <p
                          className={`text-xs font-semibold ${LEVEL_CONFIG[update.appetite as keyof typeof LEVEL_CONFIG]?.colour}`}
                        >
                          {LEVEL_CONFIG[update.appetite as keyof typeof LEVEL_CONFIG]?.label}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <Moon className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Sleep</p>
                        <p
                          className={`text-xs font-semibold ${LEVEL_CONFIG[update.sleep as keyof typeof LEVEL_CONFIG]?.colour}`}
                        >
                          {LEVEL_CONFIG[update.sleep as keyof typeof LEVEL_CONFIG]?.label}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <Activity className="w-4 h-4 text-rose-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Activity</p>
                        <p
                          className={`text-xs font-semibold ${LEVEL_CONFIG[update.activityLevel as keyof typeof LEVEL_CONFIG]?.colour}`}
                        >
                          {LEVEL_CONFIG[update.activityLevel as keyof typeof LEVEL_CONFIG]?.label}
                        </p>
                      </div>
                    </div>

                    {/* Note */}
                    {update.note && (
                      <p className="text-sm text-gray-700 bg-rose-50 rounded-xl p-3 leading-relaxed">
                        &ldquo;{update.note}&rdquo;
                      </p>
                    )}

                    {/* Photos */}
                    {update.photoUrls.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Camera className="w-3.5 h-3.5" />
                          {update.photoUrls.length} photo{update.photoUrls.length > 1 ? "s" : ""}
                        </div>
                        {update.photoUrls.slice(0, 3).map((url, i) => (
                          <Image
                            key={i}
                            src={url}
                            alt="Wellbeing photo"
                            width={72}
                            height={72}
                            className="w-18 h-18 rounded-lg object-cover border border-gray-200"
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
