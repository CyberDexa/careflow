'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  submitForApproval,
  approveGPCommunication,
  markGPCommunicationSent,
  recordGPResponse,
} from '@/actions/gp-communications'
import { CheckCircle2, Send, MessageSquare, Clock } from 'lucide-react'

type GPCommunicationStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SENT' | 'CLOSED'

interface GPComm {
  id: string
  type: string
  subject: string
  status: GPCommunicationStatus
  finalContent: string
  followUpDate: Date | string | null
  sentAt: Date | string | null
  recipientEmail: string | null
  gpResponseNotes: string | null
  createdAt: Date | string
  resident: { id: string; firstName: string; lastName: string; roomNumber: string | null }
}

const STATUS_CONFIG: Record<GPCommunicationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  DRAFT:            { label: 'Draft',            variant: 'secondary' },
  PENDING_APPROVAL: { label: 'Pending Approval', variant: 'outline' },
  APPROVED:         { label: 'Approved',          variant: 'default' },
  SENT:             { label: 'Sent',              variant: 'default' },
  CLOSED:           { label: 'Closed',            variant: 'secondary' },
}

interface GPCommListProps {
  communications: GPComm[]
  userRole: string
  overdueCount: number
}

export function GPCommList({ communications, userRole, overdueCount }: GPCommListProps) {
  const [selected, setSelected] = useState<GPComm | null>(null)
  const [editedContent, setEditedContent] = useState('')
  const [responseNotes, setResponseNotes] = useState('')
  const [sentMethod, setSentMethod] = useState('EMAIL')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const isManager = ['MANAGER', 'ADMIN'].includes(userRole)

  const open = (comm: GPComm) => {
    setSelected(comm)
    setEditedContent(comm.finalContent)
    setResponseNotes(comm.gpResponseNotes ?? '')
  }

  const handleSubmitForApproval = () => {
    if (!selected) return
    startTransition(async () => {
      await submitForApproval(selected.id, editedContent)
      setSelected(null)
      router.refresh()
    })
  }

  const handleApprove = () => {
    if (!selected) return
    startTransition(async () => {
      await approveGPCommunication({ id: selected.id, finalContent: editedContent })
      setSelected(null)
      router.refresh()
    })
  }

  const handleMarkSent = () => {
    if (!selected) return
    startTransition(async () => {
      await markGPCommunicationSent(selected.id, sentMethod)
      setSelected(null)
      router.refresh()
    })
  }

  const handleRecordResponse = () => {
    if (!selected || !responseNotes) return
    startTransition(async () => {
      await recordGPResponse(selected.id, responseNotes)
      setSelected(null)
      router.refresh()
    })
  }

  return (
    <>
      {overdueCount > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <Clock className="h-4 w-4 shrink-0" />
          <span>{overdueCount} communication{overdueCount > 1 ? 's' : ''} overdue follow-up</span>
        </div>
      )}

      <div className="space-y-3">
        {communications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No communications yet</p>
        ) : (
          communications.map((comm) => {
            const cfg = STATUS_CONFIG[comm.status]
            return (
              <Card
                key={comm.id}
                className="cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => open(comm)}
              >
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{comm.subject}</span>
                        <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                        <Badge variant="outline" className="text-xs">{comm.type.replace(/_/g, ' ')}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {comm.resident.firstName} {comm.resident.lastName} · Room {comm.resident.roomNumber}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(comm.createdAt), 'dd MMM yyyy')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Detail / Action Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {selected?.subject}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <Badge variant={STATUS_CONFIG[selected.status].variant}>{STATUS_CONFIG[selected.status].label}</Badge>
                <Badge variant="outline">{selected.type.replace(/_/g, ' ')}</Badge>
                <span className="text-muted-foreground">
                  {selected.resident.firstName} {selected.resident.lastName}
                </span>
                {selected.followUpDate && (
                  <span className="text-muted-foreground">
                    · Follow-up: {format(new Date(selected.followUpDate), 'dd MMM yyyy')}
                  </span>
                )}
              </div>

              {/* Editable content for DRAFT/PENDING/APPROVED states */}
              {['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(selected.status) ? (
                <div>
                  <Label>Communication Content</Label>
                  <Textarea
                    className="mt-1 font-mono text-sm"
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    rows={14}
                    readOnly={selected.status === 'PENDING_APPROVAL' && !isManager}
                  />
                </div>
              ) : (
                <div>
                  <Label>Content</Label>
                  <div className="mt-1 bg-muted/40 rounded-md p-3 text-sm whitespace-pre-wrap font-mono">
                    {selected.finalContent}
                  </div>
                </div>
              )}

              {/* Sent method for APPROVED */}
              {selected.status === 'APPROVED' && (
                <div>
                  <Label>Send Method</Label>
                  <Select value={sentMethod} onValueChange={setSentMethod}>
                    <SelectTrigger className="mt-1 w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="FAX">Fax</SelectItem>
                      <SelectItem value="POST">Post</SelectItem>
                      <SelectItem value="PHONE">Phone</SelectItem>
                      <SelectItem value="EMIS">EMIS Web</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Response notes for SENT */}
              {selected.status === 'SENT' && (
                <div>
                  <Label>GP Response</Label>
                  <Textarea
                    className="mt-1"
                    value={responseNotes}
                    onChange={(e) => setResponseNotes(e.target.value)}
                    placeholder="Record GP's response here..."
                    rows={4}
                  />
                </div>
              )}

              {selected.status === 'CLOSED' && selected.gpResponseNotes && (
                <div>
                  <Label className="text-muted-foreground">GP Response Recorded</Label>
                  <p className="mt-1 text-sm bg-green-50 border border-green-200 rounded p-3">
                    {selected.gpResponseNotes}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
                {selected.status === 'DRAFT' && (
                  <Button onClick={handleSubmitForApproval} disabled={isPending}>
                    Submit for Approval
                  </Button>
                )}
                {selected.status === 'PENDING_APPROVAL' && isManager && (
                  <Button onClick={handleApprove} disabled={isPending}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                )}
                {selected.status === 'APPROVED' && (
                  <Button onClick={handleMarkSent} disabled={isPending}>
                    <Send className="h-4 w-4 mr-1" />
                    Mark as Sent
                  </Button>
                )}
                {selected.status === 'SENT' && (
                  <Button onClick={handleRecordResponse} disabled={isPending || !responseNotes}>
                    Record GP Response
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
