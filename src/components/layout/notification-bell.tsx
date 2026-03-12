"use client"

import { useState, useTransition } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { markNotificationRead, markAllNotificationsRead } from "@/actions/notifications"
import { formatDistanceToNow } from "date-fns"

type Notification = {
  id: string
  type: string
  title: string
  body: string
  entityType?: string | null
  entityId?: string | null
  isRead: boolean
  createdAt: Date
}

const typeIcon: Record<string, string> = {
  CRITICAL_INCIDENT: "🚨",
  HIGH_SEVERITY_INCIDENT: "⚠️",
  CARE_PLAN_PENDING_APPROVAL: "📋",
  ASSESSMENT_OVERDUE: "🕐",
  MEDICATION_MISSED: "💊",
  PATTERN_ALERT: "📊",
}

export function NotificationBell({ initial }: { initial: Notification[] }) {
  const [notifications, setNotifications] = useState<Notification[]>(initial)
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const unreadCount = notifications.filter((n) => !n.isRead).length

  function handleRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
    startTransition(() => markNotificationRead(id))
  }

  function handleMarkAll() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    startTransition(() => markAllNotificationsRead())
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 max-h-[420px] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between py-2">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              disabled={pending}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No new notifications</p>
          </div>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${
                !n.isRead ? "bg-accent/40" : ""
              }`}
              onClick={() => !n.isRead && handleRead(n.id)}
            >
              <div className="flex items-start justify-between w-full gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm shrink-0">{typeIcon[n.type] ?? "🔔"}</span>
                  <span className="font-medium text-sm truncate">{n.title}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!n.isRead && (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  )}
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 pl-5">{n.body}</p>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
