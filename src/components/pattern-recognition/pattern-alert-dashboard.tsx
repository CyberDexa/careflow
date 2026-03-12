'use client'

import { useState, useTransition } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  acknowledgePatternAlert,
  addPatternAlertAction,
  dismissPatternAlert,
  runResidentPatternAnalysis,
} from '@/actions/pattern-recognition'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Eye,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Brain,
  RefreshCw,
  User,
} from 'lucide-react'
import Link from 'next/link'

type PatternAlertWithResident = {
  id: string
  residentId: string
  severity: string
  category: string
  title: string
  description: string
  evidence: { date: string; source: string; detail: string }[]
  recommendation: string | null
  status: string
  dismissReason: string | null
  actionNote: string | null
  acknowledgedAt: Date | null
  periodFrom: Date
  periodTo: Date
  createdAt: Date
  resident: {
    id: string
    firstName: string
    lastName: string
    roomNumber: string | null
    photoUrl: string | null
  }
}

const severityConfig = {
  CRITICAL: { label: 'Critical', color: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-500', border: 'border-l-red-500' },
  HIGH: { label: 'High', color: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500', border: 'border-l-orange-500' },
  MEDIUM: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-500', border: 'border-l-yellow-500' },
  LOW: { label: 'Low', color: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-400', border: 'border-l-blue-400' },
}

const statusConfig = {
  OPEN: { label: 'Open', color: 'bg-gray-100 text-gray-800' },
  ACKNOWLEDGED: { label: 'Acknowledged', color: 'bg-indigo-100 text-indigo-800' },
  ACTION_TAKEN: { label: 'Action Taken', color: 'bg-green-100 text-green-800' },
  DISMISSED: { label: 'Dismissed', color: 'bg-gray-100 text-gray-500' },
  CLOSED: { label: 'Closed', color: 'bg-gray-100 text-gray-500' },
}

const categoryEmoji: Record<string, string> = {
  FALLS: '🏥',
  NUTRITION: '🍽️',
  BEHAVIOUR: '💭',
  MEDICATION: '💊',
  SKIN: '🩹',
  CLINICAL: '🩺',
  SOCIAL: '👥',
}

interface Props {
  initialAlerts: PatternAlertWithResident[]
  residentIds?: string[] // for run-analysis button
  showResidentCol?: boolean
}

export function PatternAlertDashboard({ initialAlerts, showResidentCol = true }: Props) {
  const [alerts, setAlerts] = useState(initialAlerts)
  const [statusFilter, setStatusFilter] = useState('OPEN')
  const [severityFilter, setSeverityFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = alerts.filter((a) => {
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false
    if (categoryFilter !== 'ALL' && a.category !== categoryFilter) return false
    return true
  })

  const openCount = alerts.filter((a) => a.status === 'OPEN').length
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL' && a.status === 'OPEN').length
  const highCount = alerts.filter((a) => a.severity === 'HIGH' && a.status === 'OPEN').length

  function refreshAlerts() {
    startTransition(() => {
      window.location.reload()
    })
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-gray-300">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-gray-500">Open Alerts</p>
            <p className="text-3xl font-bold text-gray-900">{openCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-gray-500">Critical</p>
            <p className="text-3xl font-bold text-red-600">{criticalCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-gray-500">High Priority</p>
            <p className="text-3xl font-bold text-orange-600">{highCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
            <SelectItem value="ACTION_TAKEN">Action Taken</SelectItem>
            <SelectItem value="DISMISSED">Dismissed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Severities</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {['FALLS', 'NUTRITION', 'BEHAVIOUR', 'MEDICATION', 'SKIN', 'CLINICAL', 'SOCIAL'].map(
              (c) => (
                <SelectItem key={c} value={c}>
                  {categoryEmoji[c]} {c}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={refreshAlerts} disabled={isPending}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Alert list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No alerts match your filters.</p>
            {statusFilter === 'OPEN' && (
              <p className="text-sm text-gray-400 mt-1">
                Run pattern analysis on resident pages to generate AI-identified alerts.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              expanded={expandedId === alert.id}
              onToggle={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
              showResidentCol={showResidentCol}
              onUpdate={(updated) =>
                setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, ...updated } : a)))
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AlertCard({
  alert,
  expanded,
  onToggle,
  showResidentCol,
  onUpdate,
}: {
  alert: PatternAlertWithResident
  expanded: boolean
  onToggle: () => void
  showResidentCol: boolean
  onUpdate: (data: Partial<PatternAlertWithResident>) => void
}) {
  const sev = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.LOW
  const stat = statusConfig[alert.status as keyof typeof statusConfig] || statusConfig.OPEN
  const [isPending, startTransition] = useTransition()
  const [noteText, setNoteText] = useState('')
  const [dismissText, setDismissText] = useState('')
  const evidence = alert.evidence as { date: string; source: string; detail: string }[]

  function handleAcknowledge() {
    startTransition(async () => {
      const res = await acknowledgePatternAlert({ alertId: alert.id })
      if ('error' in res) toast.error(res.error)
      else {
        toast.success('Alert acknowledged')
        onUpdate({ status: 'ACKNOWLEDGED' })
      }
    })
  }

  function handleAction(close: () => void) {
    startTransition(async () => {
      const res = await addPatternAlertAction({ alertId: alert.id, note: noteText })
      if ('error' in res) toast.error(res.error)
      else {
        toast.success('Action recorded')
        onUpdate({ status: 'ACTION_TAKEN', actionNote: noteText })
        setNoteText('')
        close()
      }
    })
  }

  function handleDismiss(close: () => void) {
    startTransition(async () => {
      const res = await dismissPatternAlert({ alertId: alert.id, reason: dismissText })
      if ('error' in res) toast.error(res.error)
      else {
        toast.success('Alert dismissed')
        onUpdate({ status: 'DISMISSED', dismissReason: dismissText })
        setDismissText('')
        close()
      }
    })
  }

  return (
    <Card className={`border-l-4 ${sev.border} transition-shadow hover:shadow-md`}>
      <div
        className="flex items-start gap-4 p-4 cursor-pointer select-none"
        onClick={onToggle}
        role="button"
        aria-expanded={expanded}
      >
        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${sev.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-base font-semibold text-gray-900 truncate">
              {categoryEmoji[alert.category] || '🔍'} {alert.title}
            </span>
            <Badge variant="outline" className={sev.color}>
              {sev.label}
            </Badge>
            <Badge variant="outline" className={stat.color}>
              {stat.label}
            </Badge>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {alert.category}
            </span>
          </div>
          {showResidentCol && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <User className="h-3.5 w-3.5" />
              <Link
                href={`/residents/${alert.resident.id}`}
                className="hover:underline font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                {alert.resident.firstName} {alert.resident.lastName}
              </Link>
              {alert.resident.roomNumber && (
                <span className="text-gray-400">· Room {alert.resident.roomNumber}</span>
              )}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
            {' · '}
            {format(new Date(alert.periodFrom), 'd MMM')}–{format(new Date(alert.periodTo), 'd MMM yyyy')}
          </p>
        </div>
        <div className="flex-shrink-0 text-gray-400">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Pattern Description</h4>
            <p className="text-sm text-gray-600">{alert.description}</p>
          </div>

          {alert.recommendation && (
            <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
              <h4 className="text-sm font-medium text-indigo-800 mb-1">Recommended Action</h4>
              <p className="text-sm text-indigo-700">{alert.recommendation}</p>
            </div>
          )}

          {evidence.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Supporting Evidence</h4>
              <div className="space-y-1.5">
                {evidence.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono flex-shrink-0">
                      {e.date}
                    </span>
                    <span className="text-xs text-indigo-600 font-medium flex-shrink-0">{e.source}</span>
                    <span className="text-gray-600">{e.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {alert.actionNote && (
            <div className="bg-green-50 rounded-lg p-3 border border-green-100 text-sm">
              <span className="font-medium text-green-800">Action taken: </span>
              <span className="text-green-700">{alert.actionNote}</span>
            </div>
          )}

          {alert.dismissReason && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-sm">
              <span className="font-medium text-gray-600">Dismissed: </span>
              <span className="text-gray-500">{alert.dismissReason}</span>
            </div>
          )}

          {/* Action buttons for OPEN / ACKNOWLEDGED */}
          {(alert.status === 'OPEN' || alert.status === 'ACKNOWLEDGED') && (
            <div className="flex flex-wrap gap-2 pt-1">
              {alert.status === 'OPEN' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAcknowledge()
                  }}
                  disabled={isPending}
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Acknowledge
                </Button>
              )}

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    Record Action
                  </Button>
                </DialogTrigger>
                <DialogContent onClick={(e) => e.stopPropagation()}>
                  <DialogHeader>
                    <DialogTitle>Record Action Taken</DialogTitle>
                    <DialogDescription>
                      Describe the action taken to address this pattern alert.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label>Action Description</Label>
                    <Textarea
                      placeholder="e.g. Updated falls risk assessment, requested GP review, modified care plan..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <DialogFooter>
                    <Dialog>
                      <Button
                        onClick={() => {
                          const el = document.querySelector('[data-state="open"] [data-dialog-close]')
                          handleAction(() => (el as HTMLElement)?.click())
                        }}
                        disabled={isPending || noteText.trim().length < 5}
                      >
                        Save Action
                      </Button>
                    </Dialog>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1.5" />
                    Dismiss
                  </Button>
                </DialogTrigger>
                <DialogContent onClick={(e) => e.stopPropagation()}>
                  <DialogHeader>
                    <DialogTitle>Dismiss Alert</DialogTitle>
                    <DialogDescription>
                      Provide a reason for dismissing this pattern alert (e.g. false positive, already addressed).
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label>Reason for Dismissal</Label>
                    <Textarea
                      placeholder="e.g. False positive — resident has chronic condition explaining this pattern..."
                      value={dismissText}
                      onChange={(e) => setDismissText(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="destructive"
                      onClick={() => handleDismiss(() => {})}
                      disabled={isPending || dismissText.trim().length < 5}
                    >
                      Dismiss Alert
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
