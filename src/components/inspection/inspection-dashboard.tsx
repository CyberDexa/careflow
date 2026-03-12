'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { refreshComplianceEvidence, setRegulatorySwitchBody } from '@/actions/inspection-readiness'
import { toast } from 'sonner'
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Circle,
  CheckCircle2,
  AlertCircle,
  XCircle,
  BookOpen,
  User,
  Calendar,
} from 'lucide-react'
import { format } from 'date-fns'

type EvidenceRecord = {
  id: string
  entityType: string
  entityId: string
  entityDate: Date
  residentId: string | null
  residentName: string | null
  summary: string
}

type Standard = {
  id: string
  code: string
  domain: string
  title: string
  description: string
  evidenceCount: number
  recentCount: number
  rag: 'GREEN' | 'AMBER' | 'RED'
  evidence: EvidenceRecord[]
}

type DomainGroups = Record<string, Standard[]>

interface Props {
  initialDomainGroups: DomainGroups
  initialBody: string
  totalStandards: number
}

const ragConfig = {
  GREEN: {
    label: 'Good Evidence',
    bg: 'bg-green-50',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-800',
    icon: CheckCircle2,
    iconColor: 'text-green-500',
    dot: 'bg-green-500',
  },
  AMBER: {
    label: 'Limited Evidence',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-800',
    icon: AlertCircle,
    iconColor: 'text-yellow-500',
    dot: 'bg-yellow-500',
  },
  RED: {
    label: 'Evidence Gap',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-800',
    icon: XCircle,
    iconColor: 'text-red-500',
    dot: 'bg-red-500',
  },
}

const domainColorMap: Record<string, string> = {
  Safe: 'bg-red-100 text-red-800',
  Effective: 'bg-blue-100 text-blue-800',
  Caring: 'bg-pink-100 text-pink-800',
  Responsive: 'bg-indigo-100 text-indigo-800',
  'Well-led': 'bg-purple-100 text-purple-800',
  'Quality of Care and Support': 'bg-blue-100 text-blue-800',
  'Quality of Environment': 'bg-green-100 text-green-800',
  'Quality of Staffing': 'bg-orange-100 text-orange-800',
  'Quality of Management and Leadership': 'bg-purple-100 text-purple-800',
}

export function InspectionDashboard({ initialDomainGroups, initialBody, totalStandards }: Props) {
  const [domainGroups, setDomainGroups] = useState(initialDomainGroups)
  const [body, setBodyState] = useState(initialBody)
  const [openDomains, setOpenDomains] = useState<Record<string, boolean>>({})
  const [openStandards, setOpenStandards] = useState<Record<string, boolean>>({})
  const [isPending, startTransition] = useTransition()

  const allStandards = Object.values(domainGroups).flat()
  const greenCount = allStandards.filter((s) => s.rag === 'GREEN').length
  const amberCount = allStandards.filter((s) => s.rag === 'AMBER').length
  const redCount = allStandards.filter((s) => s.rag === 'RED').length
  const overallScore = Math.round((greenCount / totalStandards) * 100)

  function toggleDomain(domain: string) {
    setOpenDomains((prev) => ({ ...prev, [domain]: !prev[domain] }))
  }

  function toggleStandard(id: string) {
    setOpenStandards((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function handleRefresh() {
    startTransition(async () => {
      const res = await refreshComplianceEvidence()
      if ('error' in res) toast.error(res.error as string)
      else {
        toast.success(`Evidence refreshed — ${(res as { evidenceCount: number }).evidenceCount} records mapped`)
        window.location.reload()
      }
    })
  }

  function handleBodySwitch(newBody: string) {
    startTransition(async () => {
      await setRegulatorySwitchBody(newBody)
      setBodyState(newBody)
      window.location.reload()
    })
  }

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <Select value={body} onValueChange={handleBodySwitch}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CQC">CQC (England)</SelectItem>
              <SelectItem value="CARE_INSPECTORATE">Care Inspectorate (Scotland)</SelectItem>
              <SelectItem value="CSSIW">CIW (Wales)</SelectItem>
              <SelectItem value="RQIA">RQIA (N. Ireland)</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-500">
            {totalStandards} standards assessed
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isPending}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isPending ? 'animate-spin' : ''}`} />
          Refresh Evidence
        </Button>
      </div>

      {/* RAG summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Readiness Score</p>
            <p className="text-3xl font-bold text-indigo-700">{overallScore}%</p>
            <p className="text-xs text-gray-400 mt-0.5">{greenCount}/{totalStandards} standards evidenced</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Good Evidence</p>
            <p className="text-3xl font-bold text-green-700">{greenCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-100">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Limited Evidence</p>
            <p className="text-3xl font-bold text-yellow-700">{amberCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-100">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Evidence Gaps</p>
            <p className="text-3xl font-bold text-red-700">{redCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Domain sections */}
      {Object.entries(domainGroups).map(([domain, standards]) => {
        const domainRed = standards.filter((s) => s.rag === 'RED').length
        const domainAmber = standards.filter((s) => s.rag === 'AMBER').length
        const domainGreen = standards.filter((s) => s.rag === 'GREEN').length
        const domainColor = domainColorMap[domain] || 'bg-gray-100 text-gray-800'
        const isOpen = openDomains[domain] !== false // default open

        return (
          <Card key={domain} className="overflow-hidden">
            <Collapsible open={isOpen} onOpenChange={() => toggleDomain(domain)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors pb-3 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                      <CardTitle className="text-base">
                        <span className={`px-2 py-0.5 rounded text-sm font-semibold ${domainColor}`}>
                          {domain}
                        </span>
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {domainGreen > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          {domainGreen} ✓
                        </span>
                      )}
                      {domainAmber > 0 && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                          {domainAmber} ⚠
                        </span>
                      )}
                      {domainRed > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                          {domainRed} gap{domainRed > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4 space-y-2">
                  {standards.map((standard) => {
                    const rag = ragConfig[standard.rag]
                    const RagIcon = rag.icon
                    const isStdOpen = openStandards[standard.id]

                    return (
                      <Collapsible
                        key={standard.id}
                        open={isStdOpen}
                        onOpenChange={() => toggleStandard(standard.id)}
                      >
                        <div className={`rounded-lg border ${rag.border} ${rag.bg} overflow-hidden`}>
                          <CollapsibleTrigger asChild>
                            <div className="flex items-start gap-3 p-3 cursor-pointer hover:brightness-95 transition-all">
                              <RagIcon className={`h-4.5 w-4.5 mt-0.5 flex-shrink-0 ${rag.iconColor}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-mono text-gray-500">{standard.code}</span>
                                  <span className="text-sm font-medium text-gray-900">{standard.title}</span>
                                  <Badge variant="outline" className={`text-xs ${rag.badge}`}>
                                    {rag.label}
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {standard.evidenceCount} record{standard.evidenceCount !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">{standard.description}</p>
                              </div>
                              {standard.evidence.length > 0 && (
                                isStdOpen ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-1" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-1" />
                              )}
                            </div>
                          </CollapsibleTrigger>

                          {standard.evidence.length > 0 && (
                            <CollapsibleContent>
                              <div className="border-t border-gray-200 bg-white/60 px-3 py-2 space-y-1.5">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                  Evidence Records
                                </p>
                                {standard.evidence.map((ev) => (
                                  <div key={ev.id} className="flex items-start gap-2 text-xs py-1 border-b border-gray-100 last:border-0">
                                    <BookOpen className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono mr-1.5">
                                        {ev.entityType}
                                      </span>
                                      <span className="text-gray-700">{ev.summary}</span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 text-gray-400">
                                      {ev.residentName && (
                                        <span className="flex items-center gap-0.5">
                                          <User className="h-3 w-3" />
                                          {ev.residentName}
                                        </span>
                                      )}
                                      <span className="flex items-center gap-0.5">
                                        <Calendar className="h-3 w-3" />
                                        {format(new Date(ev.entityDate), 'd MMM yy')}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          )}

                          {standard.rag === 'RED' && (
                            <div className="px-3 py-2 bg-red-50/80 border-t border-red-100">
                              <p className="text-xs text-red-700">
                                ⚠ Gap identified — no evidence records found for this standard. Consider generating care records that address this requirement.
                              </p>
                            </div>
                          )}
                        </div>
                      </Collapsible>
                    )
                  })}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )
      })}
    </div>
  )
}
