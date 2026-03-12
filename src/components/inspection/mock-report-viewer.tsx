'use client'

import { useState, useTransition, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { generateMockInspectionReport } from '@/actions/inspection-readiness'
import { toast } from 'sonner'
import {
  FileText,
  Loader2,
  Download,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { format } from 'date-fns'

type Report = {
  id: string
  regulatoryBody: string
  overallRating: string | null
  domainRatings: Record<string, string>
  reportContent: string
  strengthsSummary: string | null
  gapsSummary: string | null
  actionPlan: { priority: string; domain: string; action: string; timeframe: string }[] | null
  evidenceSnapshot: Record<string, { count: number; gaps: string[] }>
  createdAt: Date | string
}

interface Props {
  initialReports: Report[]
  orgName: string
  currentBody: string
}

const ratingConfig = {
  OUTSTANDING: { label: 'Outstanding', color: 'bg-purple-100 text-purple-800 border-purple-200', bg: 'from-purple-50' },
  GOOD: { label: 'Good', color: 'bg-green-100 text-green-800 border-green-200', bg: 'from-green-50' },
  REQUIRES_IMPROVEMENT: { label: 'Requires Improvement', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', bg: 'from-yellow-50' },
  INADEQUATE: { label: 'Inadequate', color: 'bg-red-100 text-red-800 border-red-200', bg: 'from-red-50' },
}

export function MockReportViewer({ initialReports, orgName, currentBody }: Props) {
  const [reports, setReports] = useState(initialReports)
  const [selectedReport, setSelectedReport] = useState<Report | null>(initialReports[0] || null)
  const [regulatoryBody, setRegulatoryBody] = useState(currentBody)
  const [isPending, startTransition] = useTransition()
  const printRef = useRef<HTMLDivElement>(null)

  function handleGenerate() {
    startTransition(async () => {
      const validBodies = ['CQC', 'CARE_INSPECTORATE', 'CSSIW', 'RQIA'] as const
      if (!validBodies.includes(regulatoryBody as (typeof validBodies)[number])) {
        toast.error('Invalid regulatory body')
        return
      }
      const res = await generateMockInspectionReport({
        regulatoryBody: regulatoryBody as (typeof validBodies)[number],
      })
      if ('error' in res) {
        toast.error(res.error as string)
        return
      }
      const newReport = (res as unknown as { report: Report }).report
      setReports((prev) => [newReport, ...prev])
      setSelectedReport(newReport)
      toast.success('Mock inspection report generated')
    })
  }

  function handlePrint() {
    window.print()
  }

  const rating = selectedReport?.overallRating
    ? ratingConfig[selectedReport.overallRating as keyof typeof ratingConfig]
    : null

  const domainRatings = (selectedReport?.domainRatings || {}) as Record<string, string>
  const actionPlan = (selectedReport?.actionPlan || []) as { priority: string; domain: string; action: string; timeframe: string }[]

  return (
    <div className="space-y-6">
      {/* Generate controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={regulatoryBody} onValueChange={setRegulatoryBody}>
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

        <Button onClick={handleGenerate} disabled={isPending} className="gap-2">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {isPending ? 'Generating...' : 'Generate Mock Inspection'}
        </Button>

        {selectedReport && (
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 ml-auto">
            <Download className="h-4 w-4" />
            Export / Print
          </Button>
        )}
      </div>

      {/* Report history selector */}
      {reports.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedReport(r)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                selectedReport?.id === r.id
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {format(new Date(r.createdAt), 'd MMM yyyy HH:mm')}
              {r.overallRating && (
                <span className="ml-1.5 opacity-80">
                  {ratingConfig[r.overallRating as keyof typeof ratingConfig]?.label}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Report content */}
      {selectedReport ? (
        <div ref={printRef} className="space-y-4 print:space-y-6">
          {/* Overall rating + header */}
          <Card className={`bg-gradient-to-br ${rating?.bg || 'from-gray-50'} to-white border-2 ${rating ? 'border-opacity-50' : 'border-gray-200'}`}>
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Mock Inspection Report</p>
                  <h2 className="text-xl font-bold text-gray-900">{orgName}</h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {selectedReport.regulatoryBody} Framework ·{' '}
                    {format(new Date(selectedReport.createdAt), 'd MMMM yyyy')}
                  </p>
                </div>
                {rating && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Overall Rating</p>
                    <Badge variant="outline" className={`text-base px-4 py-2 font-bold ${rating.color}`}>
                      {rating.label}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Domain ratings */}
              {Object.keys(domainRatings).length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(domainRatings).map(([domain, dr]) => {
                    const conf = ratingConfig[dr as keyof typeof ratingConfig]
                    return (
                      <div key={domain} className="bg-white/70 rounded-lg border p-2">
                        <p className="text-xs font-medium text-gray-600 truncate">{domain}</p>
                        <Badge variant="outline" className={`text-xs mt-0.5 ${conf?.color || 'bg-gray-100 text-gray-600'}`}>
                          {conf?.label || dr}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Strengths & gaps */}
          <div className="grid sm:grid-cols-2 gap-4">
            {selectedReport.strengthsSummary && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm text-green-800 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    Key Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-sm text-green-700">{selectedReport.strengthsSummary}</p>
                </CardContent>
              </Card>
            )}
            {selectedReport.gapsSummary && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm text-yellow-800 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    Areas for Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-sm text-yellow-700">{selectedReport.gapsSummary}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Full report narrative */}
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                Inspection Narrative
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line leading-relaxed">
                {selectedReport.reportContent}
              </div>
            </CardContent>
          </Card>

          {/* Action plan */}
          {actionPlan.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  Improvement Action Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {actionPlan.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-gray-50">
                      <Badge
                        variant="outline"
                        className={
                          item.priority === 'HIGH'
                            ? 'bg-red-100 text-red-700 border-red-200 flex-shrink-0'
                            : item.priority === 'MEDIUM'
                            ? 'bg-yellow-100 text-yellow-700 border-yellow-200 flex-shrink-0'
                            : 'bg-blue-100 text-blue-700 border-blue-200 flex-shrink-0'
                        }
                      >
                        {item.priority}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{item.action}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500">{item.domain}</span>
                          {item.timeframe && (
                            <span className="text-xs text-gray-400 flex items-center gap-0.5">
                              <Clock className="h-3 w-3" />
                              {item.timeframe}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No inspection reports generated yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Refresh evidence above, then generate a mock inspection report.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
