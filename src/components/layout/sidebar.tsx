"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  BookOpen,
  AlertTriangle,
  ClipboardCheck,
  Bell,
  HandshakeIcon,
  GitMerge,
  Shield,
  Pill,
  Stethoscope,
  Building2,
  Activity,
  Heart,
  Brain,
  Search,
  CalendarDays,
  UserRound,
} from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/residents", label: "Residents", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: GitMerge },
  { href: "/care-notes", label: "Care Notes", icon: FileText },
  { href: "/care-plans", label: "Care Plans", icon: BookOpen },
  { href: "/assessments", label: "Assessments", icon: ClipboardList },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/handover", label: "Handover", icon: HandshakeIcon },
  // Phase 2 — Clinical Operations
  { href: "/emar", label: "eMAR", icon: Pill },
  { href: "/gp-communications", label: "GP Communications", icon: Stethoscope },
  { href: "/pharmacy", label: "Pharmacy", icon: Building2 },
  { href: "/risk-analytics", label: "Risk Analytics", icon: Activity, managerOnly: true },
  // Phase 3 — Family Portal
  { href: "/family-management", label: "Family Portal", icon: Heart, managerOnly: true },
  // Phase 3 — AI & Compliance
  { href: "/pattern-alerts", label: "Pattern Alerts", icon: Brain, managerOnly: true },
  { href: "/inspection", label: "Inspection Ready", icon: Search, managerOnly: true },
  { href: "/compliance", label: "Compliance", icon: ClipboardCheck },
  { href: "/audit-logs", label: "Audit Logs", icon: Shield, managerOnly: true },
  // Phase 4 — Staff, Multi-Site, Professional
  { href: "/staff", label: "Staff", icon: UserRound, managerOnly: true },
  { href: "/staff/rota", label: "Rota", icon: CalendarDays, managerOnly: true },
  { href: "/group", label: "Multi-Site", icon: Building2, managerOnly: true },
  { href: "/professional-access", label: "Prof. Access", icon: Stethoscope, managerOnly: true },
]

interface SidebarProps {
  role?: string
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const visibleItems = navItems.filter((item) => !item.managerOnly || role === "MANAGER")

  return (
    <aside className="hidden lg:flex flex-col w-64 sidebar-glow h-screen sticky top-0 overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/[0.06]">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <span className="text-white font-extrabold text-sm tracking-tight">CF</span>
        </div>
        <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">CareFlow</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        <ul className="space-y-0.5">
          {visibleItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/")
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 min-h-[44px] relative",
                    active
                      ? "bg-gradient-to-r from-cyan-500/15 to-teal-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm shadow-cyan-500/5"
                      : "text-white/50 hover:text-white/90 hover:bg-white/[0.04]"
                  )}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-cyan-400" />
                  )}
                  <Icon className={cn(
                    "h-4 w-4 shrink-0 transition-colors duration-200",
                    active ? "text-cyan-400" : "text-white/40 group-hover:text-white/70"
                  )} />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}

// Mobile bottom tab bar — only the 5 most-used items
const mobileNavItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/residents", label: "Residents", icon: Users },
  { href: "/care-notes", label: "Notes", icon: FileText },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/handover", label: "Handover", icon: HandshakeIcon },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/[0.06] safe-area-inset-bottom">
      <ul className="flex items-stretch">
        {mobileNavItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-all duration-200 w-full min-h-[52px]",
                  active ? "text-cyan-400" : "text-white/40"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
