'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'

interface RiskProfile {
  id: string
  combinedScore: number
  overallRiskLevel: string
  fallScore: number
  fallRiskLevel: string
  pressureUlcerScore: number
  pressureUlcerRiskLevel: string
  medicationScore: number
  medicationRiskLevel: string
  safeguardingScore: number
  safeguardingRiskLevel: string
  lastCalculatedAt: Date | string
  resident: {
    id: string
    firstName: string
    lastName: string
    roomNumber: string | null
    status: string
  }
}

const LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  LOW:       { label: 'Low',       color: 'text-green-700',  bg: 'bg-green-100' },
  MEDIUM:    { label: 'Medium',    color: 'text-amber-700',  bg: 'bg-amber-100' },
  HIGH:      { label: 'High',      color: 'text-orange-700', bg: 'bg-orange-100' },
  VERY_HIGH: { label: 'Very High', color: 'text-red-700',    bg: 'bg-red-100' },
}

const SCORE_BAR_COLOR: Record<string, string> = {
  LOW:       'bg-green-500',
  MEDIUM:    'bg-amber-500',
  HIGH:      'bg-orange-500',
  VERY_HIGH: 'bg-red-600',
}

interface RiskDashboardTableProps {
  profiles: RiskProfile[]
}

export function RiskDashboardTable({ profiles }: RiskDashboardTableProps) {
  if (profiles.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <p className="text-sm font-medium text-muted-foreground">No risk profiles yet</p>
        <p className="text-xs text-muted-foreground">
          Click <strong>Calculate Risk Scores</strong> to analyse all admitted residents.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="text-left py-3 pr-4">Resident</th>
            <th className="text-left py-3 pr-2">Overall</th>
            <th className="text-left py-3 pr-2 hidden md:table-cell">Falls</th>
            <th className="text-left py-3 pr-2 hidden md:table-cell">Pressure</th>
            <th className="text-left py-3 pr-2 hidden lg:table-cell">Medication</th>
            <th className="text-left py-3 pr-2 hidden lg:table-cell">Safeguarding</th>
            <th className="text-left py-3 pr-4 hidden xl:table-cell">Last Updated</th>
            <th className="py-3" />
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => {
            const cfg = LEVEL_CONFIG[p.overallRiskLevel] ?? LEVEL_CONFIG.LOW
            return (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="py-3 pr-4">
                  <p className="font-medium">{p.resident.firstName} {p.resident.lastName}</p>
                  {p.resident.roomNumber && (
                    <p className="text-xs text-muted-foreground">Room {p.resident.roomNumber}</p>
                  )}
                </td>
                <td className="py-3 pr-2">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', SCORE_BAR_COLOR[p.overallRiskLevel])}
                        style={{ width: `${p.combinedScore}%` }}
                      />
                    </div>
                    <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded', cfg.bg, cfg.color)}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{p.combinedScore}</span>
                  </div>
                </td>
                <ScoreCell score={p.fallScore} level={p.fallRiskLevel} className="hidden md:table-cell" />
                <ScoreCell score={p.pressureUlcerScore} level={p.pressureUlcerRiskLevel} className="hidden md:table-cell" />
                <ScoreCell score={p.medicationScore} level={p.medicationRiskLevel} className="hidden lg:table-cell" />
                <ScoreCell score={p.safeguardingScore} level={p.safeguardingRiskLevel} className="hidden lg:table-cell" />
                <td className="py-3 pr-4 text-xs text-muted-foreground hidden xl:table-cell">
                  {format(new Date(p.lastCalculatedAt), 'dd MMM HH:mm')}
                </td>
                <td className="py-3">
                  <Link
                    href={`/risk-analytics/${p.resident.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ScoreCell({ score, level, className }: { score: number; level: string; className?: string }) {
  const cfg = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.LOW
  return (
    <td className={cn('py-3 pr-2', className)}>
      <span className={cn('text-xs px-1.5 py-0.5 rounded', cfg.bg, cfg.color)}>
        {score}
      </span>
    </td>
  )
}
