"use client"

import { signOut } from "next-auth/react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Settings, User } from "lucide-react"
import { initials } from "@/lib/utils"
import { NotificationBell } from "@/components/layout/notification-bell"
import { Breadcrumb } from "@/components/layout/breadcrumb"

interface NotificationData {
  id: string
  type: string
  title: string
  body: string
  entityType?: string | null
  entityId?: string | null
  isRead: boolean
  createdAt: Date
}

interface HeaderProps {
  userName: string
  userRole: string
  organisationName: string
  initialNotifications?: NotificationData[]
}

const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  SENIOR_CARER: "Senior Carer",
  CARE_STAFF: "Care Staff",
}

const roleVariants: Record<string, "default" | "secondary" | "success" | "warning"> = {
  ADMIN: "default",
  MANAGER: "default",
  SENIOR_CARER: "warning",
  CARE_STAFF: "secondary",
}

export function Header({ userName, userRole, organisationName, initialNotifications = [] }: HeaderProps) {
  const [firstName, lastName] = userName.split(" ")

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/[0.06] glass px-4 lg:px-6">
      {/* Org name (mobile) */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center">
          <span className="text-white font-bold text-xs">CF</span>
        </div>
        <span className="font-semibold text-sm truncate max-w-[140px] text-white/90">{organisationName}</span>
      </div>

      {/* Org name + breadcrumb (desktop) */}
      <div className="hidden lg:flex items-center gap-2">
        <p className="text-sm text-white/50">{organisationName}</p>
        <Breadcrumb />
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <NotificationBell initial={initialNotifications} />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-11 px-2 hover:bg-white/[0.04]">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-gradient-to-br from-cyan-500/20 to-teal-500/20 text-cyan-400 border border-cyan-500/20">
                  {initials(firstName || "U", lastName || "U")}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start text-left">
                <span className="text-sm font-medium leading-none text-white/90">{userName}</span>
              </div>
              <Badge variant={roleVariants[userRole] || "secondary"} className="hidden sm:flex text-xs">
                {roleLabels[userRole] || userRole}
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{roleLabels[userRole]}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

