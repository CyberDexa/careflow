'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { generateGPCommunicationDraft } from '@/actions/gp-communications'
import { Sparkles, Plus } from 'lucide-react'

interface Resident {
  id: string
  firstName: string
  lastName: string
}

interface NewGPCommFormProps {
  residents: Resident[]
}

const COMM_TYPES = [
  { value: 'PRESCRIPTION_REQUEST', label: 'Prescription Request' },
  { value: 'CLINICAL_CONCERN',     label: 'Clinical Concern' },
  { value: 'MEDICATION_REVIEW',    label: 'Medication Review' },
  { value: 'URGENT_REFERRAL',      label: 'Urgent Referral' },
  { value: 'ROUTINE_UPDATE',       label: 'Routine Update' },
  { value: 'OTHER',                label: 'Other' },
]

export function NewGPCommForm({ residents }: NewGPCommFormProps) {
  const [open, setOpen] = useState(false)
  const [residentId, setResidentId] = useState('')
  const [type, setType] = useState<string>('PRESCRIPTION_REQUEST')
  const [subject, setSubject] = useState('')
  const [context, setContext] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSubmit = () => {
    if (!residentId || !subject || !context) {
      setError('Resident, subject, and context are required')
      return
    }
    setError('')
    startTransition(async () => {
      try {
        await generateGPCommunicationDraft({
          residentId,
          type: type as any,
          subject,
          context,
          followUpDate: followUpDate || undefined,
          recipientEmail: recipientEmail || undefined,
        })
        setOpen(false)
        setResidentId('')
        setSubject('')
        setContext('')
        setFollowUpDate('')
        setRecipientEmail('')
        router.refresh()
      } catch (e: any) {
        setError(e.message ?? 'Failed to generate draft')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Communication
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            New GP Communication
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Resident *</Label>
            <Select value={residentId} onValueChange={setResidentId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select resident..." />
              </SelectTrigger>
              <SelectContent>
                {residents.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.firstName} {r.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Communication Type *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMM_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Subject *</Label>
            <Input
              className="mt-1"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Prescription request — Furosemide 40mg"
            />
          </div>

          <div>
            <Label>Context for AI Draft *</Label>
            <Textarea
              className="mt-1"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Describe the clinical situation, what has been observed, and what you need from the GP..."
              rows={5}
            />
            <p className="text-xs text-muted-foreground mt-1">
              The AI will use this to generate a professional letter draft.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Follow-up Date</Label>
              <Input
                type="date"
                className="mt-1"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
            </div>
            <div>
              <Label>GP Email</Label>
              <Input
                type="email"
                className="mt-1"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="gp@practice.nhs.uk"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                  Generating Draft...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Draft
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
