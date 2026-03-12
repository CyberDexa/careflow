'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { acknowledgeRisk } from '@/actions/risk-analytics'
import { Sparkles, CheckCircle2, AlertTriangle, FileText, Pill } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'

const LEVEL_CONFIG: Record<RiskLevel, { label: string; color: string; bg: string; border: string }> = {
  LOW:       { label: 'Low',        color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
  MEDIUM:    { label: 'Medium',     color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  HIGH:      { label: 'High',       color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  VERY_HIGH: { label: 'Very High',  color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' },
}

interface RiskFactor {
  id: string
  domain: string
  description: string
  weight: number
}

interface RiskProfileDetailProps {
  residentId: string
  profile: {
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
    aiRecommendations: string | null
    lastCalculatedAt: Date | string
    factors: RiskFactor[]
    resident: { firstName: string; lastName: string }
  }
}

export function RiskProfileDetail({ residentId, profile }: RiskProfileDetailProps) {
  const [ackOpen, setAckOpen] = useState(false)
  const [ackDomain, setAckDomain] = useState<string>('FALLS')
  const [ackNotes, setAckNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleAcknowledge = () => {
    if (!ackNotes) return
    startTransition(async () => {
      await acknowledgeRisk({ residentId, domain: ackDomain as any, notes: ackNotes })
      setAckOpen(false)
      setAckNotes('')
      router.refresh()
    })
  }

  const domains = [
    { key: 'fall',         label: 'Falls',          score: profile.fallScore,           level: profile.fallRiskLevel as RiskLevel },
    { key: 'pressure',     label: 'Pressure Ulcer', score: profile.pressureUlcerScore,  level: profile.pressureUlcerRiskLevel as RiskLevel },
    { key: 'medication',   label: 'Medication',     score: profile.medicationScore,     level: profile.medicationRiskLevel as RiskLevel },
    { key: 'safeguarding', label: 'Safeguarding',   score: profile.safeguardingScore,   level: profile.safeguardingRiskLevel as RiskLevel },
  ]

  const overallCfg = LEVEL_CONFIG[profile.overallRiskLevel as RiskLevel] ?? LEVEL_CONFIG.LOW

  return (
    <div className="space-y-6">
      {/* Overall risk banner */}
      <div className={cn('flex items-center justify-between rounded-xl border p-4', overallCfg.bg, overallCfg.border)}>
        <div>
          <p className={cn('text-sm font-semibold', overallCfg.color)}>
            Overall Risk: {overallCfg.label}
          </p>
          <p className="text-2xl font-bold mt-0.5">{profile.combinedScore}<span className="text-base font-normal text-muted-foreground">/100</span></p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>Last calculated</p>
          <p>{format(new Date(profile.lastCalculatedAt), 'dd MMM yyyy HH:mm')}</p>
        </div>
      </div>

      {/* 4 domain score cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {domains.map((d) => {
          const cfg = LEVEL_CONFIG[d.level] ?? LEVEL_CONFIG.LOW
          return (
            <Card key={d.key} className={cn('border', cfg.border)}>
              <CardContent className="py-4 px-4">
                <p className="text-xs text-muted-foreground font-medium">{d.label}</p>
                <p className="text-xl font-bold mt-1">{d.score}<span className="text-xs font-normal text-muted-foreground">/100</span></p>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', d.score < 34 ? 'bg-green-500' : d.score < 67 ? 'bg-amber-500' : d.score < 80 ? 'bg-orange-500' : 'bg-red-600')}
                    style={{ width: `${d.score}%` }}
                  />
                </div>
                <span className={cn('mt-1 text-xs font-semibold px-1.5 py-0.5 rounded inline-block', cfg.bg, cfg.color)}>
                  {cfg.label}
                </span>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Risk factors */}
      {profile.factors.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Active Risk Factors</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {profile.factors.map((f) => (
                <div key={f.id} className="flex items-start gap-3 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-xs text-muted-foreground uppercase tracking-wide mr-2">
                      {f.domain}
                    </span>
                    {f.description}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations */}
      {profile.aiRecommendations && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Risk Reduction Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm whitespace-pre-line leading-relaxed">{profile.aiRecommendations}</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Link href={`/incidents/new?residentId=${residentId}`}>
          <Button variant="outline" size="sm">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Log Incident
          </Button>
        </Link>
        <Link href={`/care-plans?residentId=${residentId}`}>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Update Care Plan
          </Button>
        </Link>
        <Link href={`/emar/${residentId}`}>
          <Button variant="outline" size="sm">
            <Pill className="h-4 w-4 mr-2" />
            View Medications
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAckOpen(true)}
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Acknowledge Risk
        </Button>
      </div>

      {/* Acknowledge dialog */}
      <Dialog open={ackOpen} onOpenChange={setAckOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acknowledge Risk</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Risk Domain</Label>
              <Select value={ackDomain} onValueChange={setAckDomain}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FALLS">Falls</SelectItem>
                  <SelectItem value="PRESSURE_ULCER">Pressure Ulcer</SelectItem>
                  <SelectItem value="MEDICATION">Medication</SelectItem>
                  <SelectItem value="SAFEGUARDING">Safeguarding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes / Action Taken *</Label>
              <Textarea
                className="mt-1"
                value={ackNotes}
                onChange={(e) => setAckNotes(e.target.value)}
                placeholder="Describe what action has been taken to mitigate this risk..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAckOpen(false)}>Cancel</Button>
              <Button onClick={handleAcknowledge} disabled={isPending || !ackNotes}>
                Acknowledge
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
