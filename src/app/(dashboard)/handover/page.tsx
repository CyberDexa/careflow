import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatDistanceToNow } from "date-fns"
import HandoverClient from "@/components/handover/handover-client"
import { ClipboardList } from "lucide-react"

export default async function HandoverPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const user = session.user as any

  const recentReports = await prisma.handoverReport.findMany({
    where: { organisationId: user.organisationId },
    include: { author: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  const SHIFT_LABELS: Record<string, string> = {
    MORNING: "Morning",
    AFTERNOON: "Afternoon",
    NIGHT: "Night",
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shift Handover</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate AI-assisted handover reports from shift care notes, or write manually.
        </p>
      </div>

      <HandoverClient />

      {/* Recent reports */}
      {recentReports.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Reports</h2>
          <div className="space-y-2">
            {recentReports.map((r: any) => (
              <div key={r.id} className="flex items-start gap-3 rounded-lg border px-4 py-3">
                <ClipboardList className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">
                      {SHIFT_LABELS[r.shift] ?? r.shift} Handover — {new Date(r.shiftDate).toLocaleDateString("en-GB")}
                    </span>
                    {r.aiGenerated && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">AI</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    By {r.generatedBy?.name ?? "Unknown"} · {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{r.content.slice(0, 160)}…</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
