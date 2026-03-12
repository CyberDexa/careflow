"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  residents: "Residents",
  "care-plans": "Care Plans",
  "care-notes": "Care Notes",
  assessments: "Assessments",
  incidents: "Incidents",
  handover: "Handover",
  compliance: "Compliance",
  "audit-logs": "Audit Logs",
  pipeline: "Pipeline",
  // sub-pages
  "body-map": "Body Map",
  new: "New",
  edit: "Edit",
  // care-plan sub-pages handled dynamically
}

// Whether a path segment looks like a generated ID (cuid / uuid)
function isId(segment: string) {
  return segment.length >= 20 || /^[a-z0-9]{20,}$/i.test(segment)
}

export function Breadcrumb({ className }: { className?: string }) {
  const pathname = usePathname()

  // Split into segments, strip empty + leading slash
  const segments = pathname.split("/").filter(Boolean)

  // Build crumbs: each crumb has a label and a cumulative href
  const crumbs: { label: string; href: string; isLast: boolean }[] = []

  let currentPath = ""
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    currentPath += `/${segment}`

    // Skip ID-looking segments in the label, but still accumulate the path
    if (isId(segment)) continue

    const label = SEGMENT_LABELS[segment] ?? segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    crumbs.push({ label, href: currentPath, isLast: false })
  }

  // Mark last
  if (crumbs.length > 0) crumbs[crumbs.length - 1].isLast = true

  // Don't render if only 0-1 crumbs (top-level page)
  if (crumbs.length <= 1) return null

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1 text-sm", className)}>
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />}
          {crumb.isLast ? (
            <span className="font-medium text-foreground truncate max-w-[160px]">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[120px]"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
