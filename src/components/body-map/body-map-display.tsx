"use client"

import { useState } from "react"

const BODY_REGIONS: Record<string, { cx: number; cy: number; label: string }> = {
  head:               { cx: 50, cy: 7,  label: "Head" },
  neck:               { cx: 50, cy: 13, label: "Neck" },
  "chest-left":       { cx: 40, cy: 22, label: "Chest (L)" },
  "chest-right":      { cx: 60, cy: 22, label: "Chest (R)" },
  "abdomen-upper":    { cx: 50, cy: 28, label: "Abdomen (upper)" },
  "abdomen-lower":    { cx: 50, cy: 33, label: "Abdomen (lower)" },
  "shoulder-left":    { cx: 28, cy: 21, label: "Shoulder (L)" },
  "shoulder-right":   { cx: 72, cy: 21, label: "Shoulder (R)" },
  "upper-arm-left":   { cx: 22, cy: 28, label: "Upper Arm (L)" },
  "upper-arm-right":  { cx: 78, cy: 28, label: "Upper Arm (R)" },
  "elbow-left":       { cx: 19, cy: 34, label: "Elbow (L)" },
  "elbow-right":      { cx: 81, cy: 34, label: "Elbow (R)" },
  "forearm-left":     { cx: 17, cy: 41, label: "Forearm (L)" },
  "forearm-right":    { cx: 83, cy: 41, label: "Forearm (R)" },
  "wrist-left":       { cx: 15, cy: 47, label: "Wrist (L)" },
  "wrist-right":      { cx: 85, cy: 47, label: "Wrist (R)" },
  "hand-left":        { cx: 14, cy: 53, label: "Hand (L)" },
  "hand-right":       { cx: 86, cy: 53, label: "Hand (R)" },
  "hip-left":         { cx: 38, cy: 40, label: "Hip (L)" },
  "hip-right":        { cx: 62, cy: 40, label: "Hip (R)" },
  sacrum:             { cx: 50, cy: 45, label: "Sacrum/Coccyx" },
  "thigh-left":       { cx: 38, cy: 56, label: "Thigh (L)" },
  "thigh-right":      { cx: 62, cy: 56, label: "Thigh (R)" },
  "knee-left":        { cx: 37, cy: 67, label: "Knee (L)" },
  "knee-right":       { cx: 63, cy: 67, label: "Knee (R)" },
  "shin-left":        { cx: 36, cy: 76, label: "Shin (L)" },
  "shin-right":       { cx: 64, cy: 76, label: "Shin (R)" },
  "ankle-left":       { cx: 35, cy: 87, label: "Ankle (L)" },
  "ankle-right":      { cx: 65, cy: 87, label: "Ankle (R)" },
  "foot-left":        { cx: 34, cy: 93, label: "Foot (L)" },
  "foot-right":       { cx: 66, cy: 93, label: "Foot (R)" },
}

const SEVERITY_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  MINOR:    { fill: "#fbbf24", stroke: "#d97706", label: "Minor" },
  MODERATE: { fill: "#f97316", stroke: "#ea580c", label: "Moderate" },
  SEVERE:   { fill: "#ef4444", stroke: "#dc2626", label: "Severe" },
}

export interface BodyMapEntryDisplay {
  id: string
  bodyRegion: string
  severity: string
  type: string
  description?: string | null
  isResolved: boolean
}

interface Props {
  entries: BodyMapEntryDisplay[]
  showResolved?: boolean
}

export function BodyMapDisplay({ entries, showResolved = false }: Props) {
  const [hoveredEntry, setHoveredEntry] = useState<BodyMapEntryDisplay | null>(null)

  const visibleEntries = showResolved ? entries : entries.filter((e) => !e.isResolved)

  // Group entries by region — take worst severity for display
  const regionMap = new Map<string, BodyMapEntryDisplay>()
  for (const entry of visibleEntries) {
    const existing = regionMap.get(entry.bodyRegion)
    if (!existing) {
      regionMap.set(entry.bodyRegion, entry)
    } else {
      // Upgrade to worse severity
      const rank = { MINOR: 1, MODERATE: 2, SEVERE: 3 }
      if ((rank[entry.severity as keyof typeof rank] ?? 0) > (rank[existing.severity as keyof typeof rank] ?? 0)) {
        regionMap.set(entry.bodyRegion, entry)
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 flex-wrap text-xs">
        <span className="font-medium text-muted-foreground">Severity key:</span>
        {Object.entries(SEVERITY_COLORS).map(([sev, { fill, stroke, label }]) => (
          <span key={sev} className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <circle cx="6" cy="6" r="5" fill={fill} stroke={stroke} strokeWidth="1" />
            </svg>
            {label}
          </span>
        ))}
        {showResolved && (
          <span className="flex items-center gap-1.5 opacity-50">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <circle cx="6" cy="6" r="5" fill="#d1d5db" stroke="#9ca3af" strokeWidth="1" />
            </svg>
            Resolved
          </span>
        )}
      </div>

      <div className="flex gap-6 flex-wrap items-start">
        <div className="w-48 shrink-0">
          <svg
            viewBox="0 0 100 100"
            className="w-full border rounded-xl bg-slate-50 p-1"
            style={{ aspectRatio: "1/2", height: "360px" }}
          >
            {/* Body silhouette */}
            <ellipse cx="50" cy="7" rx="8" ry="6" fill="none" stroke="#cbd5e1" strokeWidth="1" />
            <rect x="46" y="12.5" width="8" height="3.5" rx="1" fill="none" stroke="#cbd5e1" strokeWidth="1" />
            <rect x="30" y="16" width="40" height="30" rx="3" fill="none" stroke="#cbd5e1" strokeWidth="1" />
            <path d="M30 18 Q22 25 18 42 Q16 48 14 55" fill="none" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
            <path d="M70 18 Q78 25 82 42 Q84 48 86 55" fill="none" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
            <path d="M38 46 Q38 58 38 68 Q37 77 35 90 Q34 93 34 96" fill="none" stroke="#cbd5e1" strokeWidth="7" strokeLinecap="round" />
            <path d="M62 46 Q62 58 62 68 Q63 77 65 90 Q66 93 66 96" fill="none" stroke="#cbd5e1" strokeWidth="7" strokeLinecap="round" />

            {/* All region dots — grey background */}
            {Object.entries(BODY_REGIONS).map(([id, { cx, cy }]) => (
              <circle key={id} cx={cx} cy={cy} r="2" fill="transparent" stroke="#e2e8f0" strokeWidth="0.5" />
            ))}

            {/* Entry dots — severity-coded */}
            {Array.from(regionMap.entries()).map(([regionId, entry]) => {
              const region = BODY_REGIONS[regionId]
              if (!region) return null
              const colors = entry.isResolved
                ? { fill: "#d1d5db", stroke: "#9ca3af" }
                : SEVERITY_COLORS[entry.severity] ?? SEVERITY_COLORS.MINOR
              const isHovered = hoveredEntry?.id === entry.id
              return (
                <circle
                  key={entry.id}
                  cx={region.cx}
                  cy={region.cy}
                  r={isHovered ? 5 : 4}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth="1"
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredEntry(entry)}
                  onMouseLeave={() => setHoveredEntry(null)}
                >
                  <title>{region.label}: {entry.type.replace(/_/g, " ")} ({entry.severity}){entry.description ? ` — ${entry.description}` : ""}</title>
                </circle>
              )
            })}
          </svg>
          <p className="text-xs text-center text-muted-foreground mt-1">
            {regionMap.size} affected region{regionMap.size !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Hover detail or entry list */}
        <div className="flex-1 min-w-48 space-y-2">
          {hoveredEntry ? (
            <div className="rounded-lg border p-3 bg-muted/30 space-y-1">
              <p className="text-sm font-semibold">
                {BODY_REGIONS[hoveredEntry.bodyRegion]?.label ?? hoveredEntry.bodyRegion}
              </p>
              <p className="text-xs text-muted-foreground">{hoveredEntry.type.replace(/_/g, " ")}</p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: SEVERITY_COLORS[hoveredEntry.severity]?.fill + "33",
                    color: SEVERITY_COLORS[hoveredEntry.severity]?.stroke,
                    border: `1px solid ${SEVERITY_COLORS[hoveredEntry.severity]?.stroke}`,
                  }}
                >
                  {hoveredEntry.severity}
                </span>
                {hoveredEntry.isResolved && <span className="text-xs text-muted-foreground">Resolved</span>}
              </div>
              {hoveredEntry.description && <p className="text-xs mt-1">{hoveredEntry.description}</p>}
            </div>
          ) : visibleEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No body map observations to display.</p>
          ) : (
            <p className="text-xs text-muted-foreground">Hover a dot for details.</p>
          )}
        </div>
      </div>
    </div>
  )
}
