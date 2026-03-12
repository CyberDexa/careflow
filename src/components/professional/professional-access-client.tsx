"use client"

import { useState, useTransition } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { Plus, Trash2, Shield, ShieldOff, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { grantProfessionalAccess, revokeProfessionalAccess } from "@/actions/professional"

interface Access {
  id: string
  isActive: boolean
  isExpired: boolean
  isRevoked: boolean
  expiresAt: Date
  accessType: string
  professional: { id: string; firstName: string; lastName: string; email: string; profession: string }
  resident: { id: string; firstName: string; lastName: string }
  grantedBy: { firstName: string; lastName: string }
}

interface Props {
  initialAccesses: Access[]
}

export function ProfessionalAccessClient({ initialAccesses }: Props) {
  const [accesses, setAccesses] = useState(initialAccesses)
  const [grantOpen, setGrantOpen] = useState(false)
  const [filter, setFilter] = useState<"active" | "all">("active")
  const [isPending, startTransition] = useTransition()

  const displayed = filter === "active"
    ? accesses.filter((a) => a.isActive)
    : accesses

  async function handleRevoke(accessId: string) {
    const result = await revokeProfessionalAccess(accessId)
    if ("error" in result) { toast.error(result.error as string); return }
    toast.success("Access revoked")
    setAccesses((prev) =>
      prev.map((a) => (a.id === accessId ? { ...a, isActive: false, isRevoked: true } : a))
    )
  }

  async function handleGrant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const result = await grantProfessionalAccess({
      professionalEmail: fd.get("professionalEmail") as string,
      residentId: fd.get("residentId") as string,
      accessType: fd.get("accessType") as "READ_ONLY" | "COMMENT",
      durationDays: parseInt(fd.get("durationDays") as string, 10),
    })
    if ("error" in result) { toast.error(result.error as string); return }
    toast.success("Access granted")
    setGrantOpen(false)
    // Reload triggers are not available in client; inform user to refresh for new entry
    toast.info("Refresh the page to see the new access entry")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          <Button
            variant={filter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("active")}
          >
            Active ({accesses.filter((a) => a.isActive).length})
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All ({accesses.length})
          </Button>
        </div>
        <Button size="sm" className="ml-auto" onClick={() => setGrantOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Grant Access
        </Button>
      </div>

      {displayed.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-gray-500">
            No {filter === "active" ? "active " : ""}access grants found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {displayed.map((a) => (
            <Card key={a.id} className={a.isActive ? "" : "opacity-60"}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm">
                      {a.professional.firstName} {a.professional.lastName}
                    </CardTitle>
                    <p className="text-xs text-gray-500">{a.professional.profession} · {a.professional.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {a.isActive ? (
                      <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
                    ) : a.isRevoked ? (
                      <Badge variant="destructive" className="text-xs">Revoked</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Expired</Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {a.accessType === "COMMENT" ? "Read + Comment" : "Read Only"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-gray-600">
                  Resident: <span className="font-medium">{a.resident.firstName} {a.resident.lastName}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Expires: {format(new Date(a.expiresAt), "d MMM yyyy HH:mm")}
                </p>
                <p className="text-xs text-gray-400">
                  Granted by {a.grantedBy.firstName} {a.grantedBy.lastName}
                </p>
                {a.isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleRevoke(a.id)}
                  >
                    <ShieldOff className="h-3.5 w-3.5 mr-1" />
                    Revoke Access
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Grant Dialog */}
      <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Professional Access</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGrant} className="space-y-3">
            <div>
              <Label className="text-xs">Professional Email *</Label>
              <Input
                type="email"
                name="professionalEmail"
                required
                placeholder="gp@nhs.net"
              />
              <p className="text-xs text-gray-400 mt-1">The professional must have a CareFlow portal account.</p>
            </div>
            <div>
              <Label className="text-xs">Resident ID *</Label>
              <Input
                name="residentId"
                required
                placeholder="Resident ID (from resident's URL)"
              />
            </div>
            <div>
              <Label className="text-xs">Access Level *</Label>
              <Select name="accessType" required defaultValue="READ_ONLY">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="READ_ONLY">Read Only</SelectItem>
                  <SelectItem value="COMMENT">Read + Comment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Duration (days) *</Label>
              <Select name="durationDays" required defaultValue="7">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit">Grant Access</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
