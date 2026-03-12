"use client"

import { useState, useTransition } from "react"
import { Building2, Users, AlertTriangle, FileText, Plus, ChevronRight, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getGroupStats, upsertOrganisationGroup } from "@/actions/group"

interface OrgStat {
  id: string
  name: string
  residents: number
  incidents30d: number
  openCarePlans: number
  activeStaff: number
}

interface Group {
  id: string
  name: string
  description?: string | null
  myRole: string
  memberships: Array<{ orgId: string; organisation: { id: string; name: string } }>
}

interface Props {
  initialGroups: Group[]
  isAdmin: boolean
}

function RagDot({ val, warn, danger }: { val: number; warn: number; danger: number }) {
  if (val >= danger) return <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
  if (val >= warn) return <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
  return <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
}

export function GroupDashboard({ initialGroups, isAdmin }: Props) {
  const [groups, setGroups] = useState(initialGroups)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    initialGroups[0]?.id ?? null
  )
  const [orgStats, setOrgStats] = useState<OrgStat[] | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function loadStats(groupId: string) {
    setSelectedGroupId(groupId)
    startTransition(async () => {
      const result = await getGroupStats(groupId)
      if ("orgs" in result) setOrgStats(result.orgs as OrgStat[])
      else toast.error(result.error as string)
    })
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId)

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const result = await upsertOrganisationGroup({
      name: fd.get("name") as string,
      description: fd.get("description") as string,
    })
    if ("error" in result) { toast.error(result.error as string); return }
    toast.success("Group created")
    setCreateOpen(false)
    // Refresh groups
    const name = fd.get("name") as string
    setGroups((prev) => [...prev, { ...(result.group as any), myRole: "OWNER", memberships: [] }])
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <Building2 className="h-10 w-10 text-gray-300 mx-auto" />
        <p className="text-gray-500">No groups yet.</p>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </Button>
        )}
        <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={handleCreate} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Group selector */}
      <div className="flex items-center gap-3 flex-wrap">
        {groups.map((g) => (
          <Button
            key={g.id}
            variant={selectedGroupId === g.id ? "default" : "outline"}
            size="sm"
            onClick={() => loadStats(g.id)}
          >
            {g.name}
          </Button>
        ))}
        {isAdmin && (
          <Button variant="ghost" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Group
          </Button>
        )}
      </div>

      {/* Stats grid */}
      {isPending && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading stats…
        </div>
      )}

      {!orgStats && !isPending && selectedGroup && (
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => loadStats(selectedGroup.id)}>
          <CardHeader>
            <CardTitle className="text-base">{selectedGroup.name}</CardTitle>
            <CardDescription>
              {selectedGroup.memberships.length} site{selectedGroup.memberships.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" onClick={() => loadStats(selectedGroup.id)}>
              Load Dashboard
            </Button>
          </CardContent>
        </Card>
      )}

      {orgStats && (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              icon={<Building2 className="h-5 w-5 text-blue-600" />}
              label="Sites"
              value={orgStats.length}
              bg="bg-blue-50"
            />
            <SummaryCard
              icon={<Users className="h-5 w-5 text-green-600" />}
              label="Total Residents"
              value={orgStats.reduce((a, o) => a + o.residents, 0)}
              bg="bg-green-50"
            />
            <SummaryCard
              icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
              label="Incidents (30d)"
              value={orgStats.reduce((a, o) => a + o.incidents30d, 0)}
              bg="bg-amber-50"
            />
            <SummaryCard
              icon={<FileText className="h-5 w-5 text-purple-600" />}
              label="Open Care Plans"
              value={orgStats.reduce((a, o) => a + o.openCarePlans, 0)}
              bg="bg-purple-50"
            />
          </div>

          {/* Per-site cards */}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {orgStats.map((org) => (
              <Card key={org.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-semibold">{org.name}</CardTitle>
                    <RagDot val={org.incidents30d} warn={3} danger={6} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <Stat label="Residents" value={org.residents} />
                    <Stat label="Staff" value={org.activeStaff} />
                    <Stat label="Incidents (30d)" value={org.incidents30d} warn={org.incidents30d >= 3} />
                    <Stat label="Open Plans" value={org.openCarePlans} warn={org.openCarePlans >= 5} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={handleCreate} />
    </div>
  )
}

function SummaryCard({ icon, label, value, bg }: {
  icon: React.ReactNode; label: string; value: number; bg: string
}) {
  return (
    <div className={`${bg} rounded-xl p-4 flex items-center gap-3`}>
      <div>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`font-semibold ${warn ? "text-amber-600" : "text-gray-900"}`}>{value}</p>
    </div>
  )
}

function CreateGroupDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Group Name *</Label>
            <Input name="name" required placeholder="e.g. Southern Region" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea name="description" placeholder="Optional description…" rows={2} />
          </div>
          <DialogFooter>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
