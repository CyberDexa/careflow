import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Shield } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface Props {
  searchParams: Promise<{ page?: string; action?: string; entity?: string }>
}

const ACTION_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "warning" | "destructive" | "success" }> = {
  CREATE: { label: "Created", variant: "success" },
  UPDATE: { label: "Updated", variant: "secondary" },
  DELETE: { label: "Deleted", variant: "destructive" },
  LOGIN: { label: "Login", variant: "default" },
  LOGOUT: { label: "Logout", variant: "default" },
  VIEW: { label: "Viewed", variant: "secondary" },
  SUBMIT: { label: "Submitted", variant: "default" },
  APPROVE: { label: "Approved", variant: "success" },
  APPROVE_ASSESSMENT: { label: "Approved Assessment", variant: "success" },
  SUBMIT_FOR_APPROVAL: { label: "Submitted for Approval", variant: "warning" },
  COMPLETE_ASSESSMENT: { label: "Completed Assessment", variant: "success" },
  ADD_FOLLOW_UP: { label: "Follow-up Added", variant: "default" },
  UPDATE_STATUS: { label: "Status Updated", variant: "secondary" },
  REJECT: { label: "Rejected", variant: "destructive" },
}

const PAGE_SIZE = 50

export default async function AuditLogsPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const user = session.user as any

  // Manager-only access
  if (user.role !== "MANAGER") redirect("/dashboard")

  const { page: pageStr = "1", action: actionFilter, entity: entityFilter } = await searchParams
  const page = Math.max(1, parseInt(pageStr, 10))
  const skip = (page - 1) * PAGE_SIZE

  const where = {
    organisationId: user.organisationId as string,
    ...(actionFilter ? { action: actionFilter } : {}),
    ...(entityFilter ? { entityType: entityFilter } : {}),
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
    }),
  ])

  // Get distinct actions and entity types for filters
  const [actionGroups, entityGroups] = await Promise.all([
    prisma.auditLog.groupBy({ by: ["action"], where: { organisationId: user.organisationId } }),
    prisma.auditLog.groupBy({ by: ["entityType"], where: { organisationId: user.organisationId } }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function buildLink(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams()
    if (params.page && params.page !== "1") sp.set("page", params.page)
    if (params.action) sp.set("action", params.action)
    if (params.entity) sp.set("entity", params.entity)
    const qs = sp.toString()
    return `/audit-logs${qs ? `?${qs}` : ""}`
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Audit Log</h1>
          <p className="text-sm text-muted-foreground">
            Full audit trail · {total.toLocaleString()} entries total
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={buildLink({ page: "1", action: undefined, entity: entityFilter })}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${!actionFilter ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
        >
          All actions
        </Link>
        {actionGroups.map(({ action }) => (
          <Link
            key={action}
            href={buildLink({ page: "1", action, entity: entityFilter })}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${actionFilter === action ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
          >
            {ACTION_LABELS[action]?.label ?? action}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={buildLink({ page: "1", action: actionFilter, entity: undefined })}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${!entityFilter ? "bg-secondary text-secondary-foreground border-border" : "border-border hover:bg-muted"}`}
        >
          All types
        </Link>
        {entityGroups.map(({ entityType }) => (
          <Link
            key={entityType}
            href={buildLink({ page: "1", action: actionFilter, entity: entityType })}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${entityFilter === entityType ? "bg-secondary text-secondary-foreground border-secondary" : "border-border hover:bg-muted"}`}
          >
            {entityType}
          </Link>
        ))}
      </div>

      {/* Log table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Time</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">User</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Action</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Record type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Record ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center px-4 py-8 text-muted-foreground text-sm">
                    No audit entries found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actionMeta = ACTION_LABELS[log.action]
                  return (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-xs">
                            {log.user.firstName} {log.user.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {log.user.role?.replace(/_/g, " ").toLowerCase()}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={actionMeta?.variant ?? "secondary"} className="text-xs">
                          {actionMeta?.label ?? log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {log.entityType}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {log.entityId.slice(0, 8)}…
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground text-xs">
            Showing {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildLink({ page: String(page - 1), action: actionFilter, entity: entityFilter })}
                className="px-3 py-1.5 rounded-md border text-xs hover:bg-muted transition-colors"
              >
                ← Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildLink({ page: String(page + 1), action: actionFilter, entity: entityFilter })}
                className="px-3 py-1.5 rounded-md border text-xs hover:bg-muted transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
