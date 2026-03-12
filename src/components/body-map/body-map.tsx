"use client"

import { useState, useRef } from "react"

// Body regions with approximate SVG positions (x, y as % of viewBox)
const BODY_REGIONS = [
  // Head/neck
  { id: "head", label: "Head", cx: 50, cy: 7 },
  { id: "neck", label: "Neck", cx: 50, cy: 13 },
  // Trunk - front
  { id: "chest-left", label: "Chest (L)", cx: 40, cy: 22 },
  { id: "chest-right", label: "Chest (R)", cx: 60, cy: 22 },
  { id: "abdomen-upper", label: "Abdomen (upper)", cx: 50, cy: 28 },
  { id: "abdomen-lower", label: "Abdomen (lower)", cx: 50, cy: 33 },
  // Upper limbs
  { id: "shoulder-left", label: "Shoulder (L)", cx: 28, cy: 21 },
  { id: "shoulder-right", label: "Shoulder (R)", cx: 72, cy: 21 },
  { id: "upper-arm-left", label: "Upper Arm (L)", cx: 22, cy: 28 },
  { id: "upper-arm-right", label: "Upper Arm (R)", cx: 78, cy: 28 },
  { id: "elbow-left", label: "Elbow (L)", cx: 19, cy: 34 },
  { id: "elbow-right", label: "Elbow (R)", cx: 81, cy: 34 },
  { id: "forearm-left", label: "Forearm (L)", cx: 17, cy: 41 },
  { id: "forearm-right", label: "Forearm (R)", cx: 83, cy: 41 },
  { id: "wrist-left", label: "Wrist (L)", cx: 15, cy: 47 },
  { id: "wrist-right", label: "Wrist (R)", cx: 85, cy: 47 },
  { id: "hand-left", label: "Hand (L)", cx: 14, cy: 53 },
  { id: "hand-right", label: "Hand (R)", cx: 86, cy: 53 },
  // Lower back / buttocks
  { id: "hip-left", label: "Hip (L)", cx: 38, cy: 40 },
  { id: "hip-right", label: "Hip (R)", cx: 62, cy: 40 },
  { id: "sacrum", label: "Sacrum/Coccyx", cx: 50, cy: 45 },
  // Lower limbs
  { id: "thigh-left", label: "Thigh (L)", cx: 38, cy: 56 },
  { id: "thigh-right", label: "Thigh (R)", cx: 62, cy: 56 },
  { id: "knee-left", label: "Knee (L)", cx: 37, cy: 67 },
  { id: "knee-right", label: "Knee (R)", cx: 63, cy: 67 },
  { id: "shin-left", label: "Shin (L)", cx: 36, cy: 76 },
  { id: "shin-right", label: "Shin (R)", cx: 64, cy: 76 },
  { id: "ankle-left", label: "Ankle (L)", cx: 35, cy: 87 },
  { id: "ankle-right", label: "Ankle (R)", cx: 65, cy: 87 },
  { id: "foot-left", label: "Foot (L)", cx: 34, cy: 93 },
  { id: "foot-right", label: "Foot (R)", cx: 66, cy: 93 },
]

interface BodyMapEntry {
  region: string
  description?: string
}

interface BodyMapProps {
  value: BodyMapEntry[]
  onChange: (entries: BodyMapEntry[]) => void
}

export function BodyMap({ value, onChange }: BodyMapProps) {
  const [activeRegion, setActiveRegion] = useState<string | null>(null)

  const markedIds = new Set(value.map((e) => e.region))

  function toggleRegion(regionId: string) {
    if (markedIds.has(regionId)) {
      onChange(value.filter((e) => e.region !== regionId))
      if (activeRegion === regionId) setActiveRegion(null)
    } else {
      onChange([...value, { region: regionId, description: "" }])
      setActiveRegion(regionId)
    }
  }

  function updateDescription(regionId: string, description: string) {
    onChange(value.map((e) => e.region === regionId ? { ...e, description } : e))
  }

  const regionsByLabel = Object.fromEntries(BODY_REGIONS.map((r) => [r.id, r.label]))

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">Click body areas to mark affected regions. Click again to remove.</p>
      <div className="flex gap-6 flex-wrap items-start">
        {/* SVG body outline */}
        <div className="w-48 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full border rounded-xl bg-slate-50 p-1" style={{ aspectRatio: "1/2", height: "360px" }}>
            {/* Simple body silhouette */}
            {/* Head */}
            <ellipse cx="50" cy="7" rx="8" ry="6" fill="none" stroke="#cbd5e1" strokeWidth="1" />
            {/* Neck */}
            <rect x="46" y="12.5" width="8" height="3.5" rx="1" fill="none" stroke="#cbd5e1" strokeWidth="1" />
            {/* Torso */}
            <rect x="30" y="16" width="40" height="30" rx="3" fill="none" stroke="#cbd5e1" strokeWidth="1" />
            {/* Left arm */}
            <path d="M30 18 Q22 25 18 42 Q16 48 14 55" fill="none" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
            {/* Right arm */}
            <path d="M70 18 Q78 25 82 42 Q84 48 86 55" fill="none" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
            {/* Left leg */}
            <path d="M38 46 Q38 58 38 68 Q37 77 35 90 Q34 93 34 96" fill="none" stroke="#cbd5e1" strokeWidth="7" strokeLinecap="round" />
            {/* Right leg */}
            <path d="M62 46 Q62 58 62 68 Q63 77 65 90 Q66 93 66 96" fill="none" stroke="#cbd5e1" strokeWidth="7" strokeLinecap="round" />

            {/* Clickable region dots */}
            {BODY_REGIONS.map((region) => {
              const isMarked = markedIds.has(region.id)
              const isActive = activeRegion === region.id
              return (
                <circle
                  key={region.id}
                  cx={region.cx}
                  cy={region.cy}
                  r={isMarked ? 3.5 : 2.5}
                  fill={isMarked ? (isActive ? "#0ea5e9" : "#ef4444") : "transparent"}
                  stroke={isMarked ? (isActive ? "#0ea5e9" : "#ef4444") : "#94a3b8"}
                  strokeWidth={isMarked ? "0" : "0.8"}
                  className="cursor-pointer hover:fill-sky-400"
                  onClick={() => toggleRegion(region.id)}
                >
                  <title>{region.label}</title>
                </circle>
              )
            })}
          </svg>
          <p className="text-xs text-center text-muted-foreground mt-1">
            {markedIds.size} region{markedIds.size !== 1 ? "s" : ""} marked
          </p>
        </div>

        {/* Selected regions list */}
        <div className="flex-1 min-w-48">
          {value.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No regions marked. Click the body diagram to mark areas of concern.</p>
          ) : (
            <div className="space-y-2">
              {value.map((entry) => (
                <div
                  key={entry.region}
                  className={`rounded-lg border p-2 bg-background cursor-pointer transition-colors ${activeRegion === entry.region ? "border-sky-400 ring-1 ring-sky-200" : "hover:border-muted-foreground/40"}`}
                  onClick={() => setActiveRegion(activeRegion === entry.region ? null : entry.region)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{regionsByLabel[entry.region] ?? entry.region}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleRegion(entry.region) }}
                      className="text-muted-foreground hover:text-destructive text-xs px-1"
                    >
                      ×
                    </button>
                  </div>
                  {activeRegion === entry.region && (
                    <textarea
                      className="mt-1.5 w-full text-xs rounded border border-input bg-muted/30 px-2 py-1 resize-none placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
                      rows={2}
                      placeholder="Describe injury/observation (optional)"
                      value={entry.description ?? ""}
                      onChange={(e) => updateDescription(entry.region, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
