"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format, formatDistanceToNow } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  UserPlus,
  Copy,
  Check,
  UserX,
  UserCheck,
  Clock,
  Mail,
  MessageSquare,
} from "lucide-react"
import { inviteFamilyUser, deactivateFamilyUser, reactivateFamilyUser, sendMessageToFamily } from "@/actions/family"
import { Alert, AlertDescription } from "@/components/ui/alert"

const inviteSchema = z.object({
  residentId: z.string().min(1),
  email: z.string().email("Valid email required"),
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  relationship: z.string().min(1, "Required"),
  phone: z.string().optional(),
})

type InviteData = z.infer<typeof inviteSchema>

const RELATIONSHIPS = [
  "Daughter", "Son", "Partner/Spouse", "Parent",
  "Sibling", "Friend", "Power of Attorney", "Other",
]

interface Resident {
  id: string
  firstName: string
  lastName: string
}

interface FamilyUserRow {
  id: string
  firstName: string
  lastName: string
  email: string
  relationship: string
  phone: string | null
  isActive: boolean
  inviteAcceptedAt: Date | null
  inviteExpiresAt: Date | null
  lastLoginAt: Date | null
  createdAt: Date
  resident: { firstName: string; lastName: string }
}

interface Props {
  familyUsers: FamilyUserRow[]
  residents: Resident[]
}

function InviteDialog({ residents }: { residents: Resident[] }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [inviteLink, setInviteLink] = useState("")
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<InviteData>({
    resolver: zodResolver(inviteSchema) as any,
    defaultValues: { residentId: "", email: "", firstName: "", lastName: "", relationship: "", phone: "" },
  })

  const onSubmit = (data: InviteData) => {
    setError("")
    startTransition(async () => {
      try {
        const result = await inviteFamilyUser(data)
        setInviteLink(result.inviteLink)
        reset()
      } catch (e: any) {
        setError(e.message ?? "Failed to create invite")
      }
    })
  }

  const copyLink = async () => {
    const fullUrl = `${window.location.origin}${inviteLink}`
    await navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setInviteLink(""); setError(""); reset() } }}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-rose-500 hover:bg-rose-600 text-white">
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Family Member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Family Member</DialogTitle>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800 text-sm">
                Invite created! Share the link below with the family member securely.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Invite link (valid 7 days)</Label>
              <div className="flex gap-2">
                <Input
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}${inviteLink}`}
                  readOnly
                  className="text-xs font-mono bg-gray-50"
                />
                <Button variant="outline" size="sm" onClick={copyLink} className="flex-shrink-0">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <Button className="w-full" onClick={() => { setInviteLink(""); setOpen(false) }}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Resident</Label>
              <Select onValueChange={(v) => setValue("residentId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select resident" />
                </SelectTrigger>
                <SelectContent>
                  {residents.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.firstName} {r.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.residentId && <p className="text-xs text-red-500">Resident is required</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">First name</Label>
                <Input {...register("firstName")} placeholder="Jane" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Last name</Label>
                <Input {...register("lastName")} placeholder="Smith" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email address</Label>
              <Input {...register("email")} type="email" placeholder="jane.smith@email.com" />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Relationship to resident</Label>
              <Select onValueChange={(v) => setValue("relationship", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Phone <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input {...register("phone")} type="tel" placeholder="07700 900000" />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={pending} className="bg-rose-500 hover:bg-rose-600 text-white">
                {pending ? "Creating invite…" : "Create invite link"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function MessageDialog({ residentId, residentName }: { residentId: string; residentName: string }) {
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState("")
  const [subject, setSubject] = useState("")
  const [pending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)

  const handleSend = () => {
    if (!body.trim()) return
    startTransition(async () => {
      await sendMessageToFamily({ residentId, body, subject: subject || undefined })
      setSent(true)
      setTimeout(() => { setSent(false); setOpen(false); setBody(""); setSubject("") }, 1500)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs">
          <MessageSquare className="w-3.5 h-3.5 mr-1" />
          Message family
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Message family of {residentName}</DialogTitle>
        </DialogHeader>
        {sent ? (
          <div className="py-6 text-center text-green-600 font-medium">Message sent!</div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Subject (optional)</Label>
              <Input placeholder="e.g. Upcoming appointment" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Message</Label>
              <textarea
                className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-200"
                rows={4}
                placeholder="Type your message…"
                value={body}
                onChange={e => setBody(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" disabled={pending || !body.trim()} className="bg-rose-500 hover:bg-rose-600 text-white" onClick={handleSend}>
                {pending ? "Sending…" : "Send"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function FamilyManagementClient({ familyUsers, residents }: Props) {
  const [pending, startTransition] = useTransition()

  const grouped = residents.map((r) => ({
    resident: r,
    users: familyUsers.filter((fu) => fu.resident.firstName === r.firstName && fu.resident.lastName === r.lastName),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Family Portal Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage family access and send updates to connected families.
          </p>
        </div>
        <InviteDialog residents={residents} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 bg-rose-50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-rose-700">{familyUsers.filter(f => f.isActive && f.inviteAcceptedAt).length}</p>
            <p className="text-xs text-rose-600">Active family accounts</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-700">{familyUsers.filter(f => !f.inviteAcceptedAt && f.isActive).length}</p>
            <p className="text-xs text-amber-600">Pending invites</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gray-50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-gray-700">{familyUsers.filter(f => !f.isActive).length}</p>
            <p className="text-xs text-gray-500">Deactivated</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Family Member</TableHead>
              <TableHead>Resident</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {familyUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                  No family accounts yet. Use &ldquo;Invite Family Member&rdquo; to get started.
                </TableCell>
              </TableRow>
            ) : (
              familyUsers.map((fu) => (
                <TableRow key={fu.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{fu.firstName} {fu.lastName}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {fu.email}
                      </p>
                      <p className="text-xs text-gray-400">{fu.relationship}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {fu.resident.firstName} {fu.resident.lastName}
                  </TableCell>
                  <TableCell>
                    {!fu.isActive ? (
                      <Badge variant="secondary" className="text-xs">Deactivated</Badge>
                    ) : !fu.inviteAcceptedAt ? (
                      <Badge className="text-xs bg-amber-100 text-amber-800 border-0">
                        <Clock className="w-3 h-3 mr-1" />
                        Invite pending
                      </Badge>
                    ) : (
                      <Badge className="text-xs bg-green-100 text-green-800 border-0">
                        <UserCheck className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-gray-400">
                    {fu.lastLoginAt
                      ? formatDistanceToNow(new Date(fu.lastLoginAt), { addSuffix: true })
                      : fu.inviteAcceptedAt
                        ? "Never logged in"
                        : "Awaiting invite accept"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <MessageDialog
                        residentId={familyUsers.find(f => f.id === fu.id)?.resident
                          ? residents.find(r => r.firstName === fu.resident.firstName)?.id ?? ""
                          : ""}
                        residentName={`${fu.resident.firstName} ${fu.resident.lastName}`}
                      />
                      {fu.isActive ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-red-600 hover:text-red-700"
                          onClick={() =>
                            startTransition(() => deactivateFamilyUser(fu.id))
                          }
                          disabled={pending}
                        >
                          <UserX className="w-3.5 h-3.5 mr-1" />
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-green-600 hover:text-green-700"
                          onClick={() =>
                            startTransition(() => reactivateFamilyUser(fu.id))
                          }
                          disabled={pending}
                        >
                          <UserCheck className="w-3.5 h-3.5 mr-1" />
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
