"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Sparkles, Loader2, Save, Check, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { saveCarePlan } from "@/actions/care-plans"
import { isRedirectError } from "@/lib/utils"

const CATEGORIES = [
  { value: "PERSONAL_CARE", label: "Personal Care & Hygiene" },
  { value: "MOBILITY", label: "Mobility & Moving/Handling" },
  { value: "NUTRITION", label: "Nutrition & Hydration" },
  { value: "CONTINENCE", label: "Continence Management" },
  { value: "MEDICATION", label: "Medication Management" },
  { value: "COMMUNICATION", label: "Communication & Social Needs" },
  { value: "SKIN_INTEGRITY", label: "Skin Integrity & Pressure Care" },
  { value: "MENTAL_HEALTH", label: "Mental Health & Wellbeing" },
  { value: "END_OF_LIFE", label: "Advance Care & End of Life" },
  { value: "FALLS_PREVENTION", label: "Falls Prevention" },
  { value: "CLINICAL", label: "Clinical Nursing Care" },
  { value: "SOCIAL", label: "Social Engagement & Activities" },
]

interface CarePlanEditorProps {
  residentId: string
  residentName: string
  defaultCategory?: string
}

interface GeneratedPlan {
  needsAssessment: string
  goals: string[]
  interventions: string[]
  outcomes: string[]
  reviewDate: string
  riskFlags: string[]
}

export function CarePlanEditor({ residentId, residentName, defaultCategory }: CarePlanEditorProps) {
  const router = useRouter()
  const [category, setCategory] = useState(defaultCategory ?? "")
  const [plan, setPlan] = useState<GeneratedPlan | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [aiGenerated, setAiGenerated] = useState(false)

  // Editable state
  const [needsAssessment, setNeedsAssessment] = useState("")
  const [goals, setGoals] = useState<string[]>([])
  const [interventions, setInterventions] = useState<string[]>([])
  const [outcomes, setOutcomes] = useState<string[]>([])
  const [reviewDate, setReviewDate] = useState("")
  const [riskFlags, setRiskFlags] = useState<string[]>([])

  async function handleGenerate() {
    if (!category) { toast.error("Select a care plan category first"); return }
    setIsGenerating(true)
    try {
      const res = await fetch("/api/care-plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ residentId, category }),
      })
      if (!res.ok) { toast.error("AI generation failed"); return }
      const { generated, error } = await res.json()
      if (error) { toast.error(error); return }

      setNeedsAssessment(generated.needsAssessment ?? "")
      setGoals(generated.goals ?? [])
      setInterventions(generated.interventions ?? [])
      setOutcomes(generated.outcomes ?? [])
      setReviewDate(generated.reviewDate ? generated.reviewDate.slice(0, 10) : "")
      setRiskFlags(generated.riskFlags ?? [])
      setAiGenerated(true)
      toast.success("AI care plan generated — review and edit before saving")
    } catch {
      toast.error("Request failed")
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSave() {
    if (!category) { toast.error("Category required"); return }
    if (!needsAssessment.trim()) { toast.error("Needs assessment required"); return }
    setIsSaving(true)
    try {
      const result = await saveCarePlan({ residentId, category, needsAssessment, goals, interventions, outcomes, reviewDate, riskFlags, aiGenerated })
      if (result && "error" in result) { toast.error(result.error); return }
      toast.success("Care plan saved as draft")
      router.push(`/residents/${residentId}?tab=care-plans`)
    } catch (err) {
      if (isRedirectError(err)) throw err
      toast.error("Failed to save")
    } finally {
      setIsSaving(false)
    }
  }

  function updateListItem(setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number, value: string) {
    setter((prev) => prev.map((v, i) => i === idx ? value : v))
  }

  function addListItem(setter: React.Dispatch<React.SetStateAction<string[]>>) {
    setter((prev) => [...prev, ""])
  }

  function removeListItem(setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number) {
    setter((prev) => prev.filter((_, i) => i !== idx))
  }

  const hasContent = needsAssessment || goals.length > 0 || interventions.length > 0

  return (
    <div className="space-y-6">
      {/* Category + Generate */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Care Plan Category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Select category…" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleGenerate} disabled={isGenerating || !category} className="gap-2">
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isGenerating ? "Generating…" : "Generate AI Care Plan"}
        </Button>
      </div>

      {hasContent && (
        <div className="space-y-5">
          {aiGenerated && (
            <div className="flex items-center gap-2 text-sm text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
              <Sparkles className="h-4 w-4 shrink-0" />
              AI-generated — review and personalise all sections before saving.
            </div>
          )}

          {/* Risk flags */}
          {riskFlags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {riskFlags.map((f, i) => (
                <span key={i} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                  <AlertTriangle className="h-3 w-3" /> {f}
                </span>
              ))}
            </div>
          )}

          {/* Care needs */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Care needs <span className="text-destructive">*</span></h3>
            <Textarea
              value={needsAssessment}
              onChange={(e) => setNeedsAssessment(e.target.value)}
              rows={8}
              className="resize-y text-sm"
              placeholder="Describe the individual’s current care needs in this area…"
            />
          </section>

          {/* Outcome/goal */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Outcome/goal</h3>
            {goals.map((g, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-xs text-muted-foreground mt-2.5 w-4 shrink-0">{i + 1}.</span>
                <Input value={g} onChange={(e) => updateListItem(setGoals, i, e.target.value)} className="text-sm" placeholder="e.g. [Name] will maintain independence with personal care with prompting only" />
                <button type="button" onClick={() => removeListItem(setGoals, i)} className="text-muted-foreground hover:text-destructive mt-2 text-sm px-1">×</button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addListItem(setGoals)}>+ Add Outcome/goal</Button>
          </section>

          {/* Able to do themselves */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Able to do themselves</h3>
            {outcomes.map((o, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-xs text-muted-foreground mt-2.5 w-4 shrink-0">{i + 1}.</span>
                <Input value={o} onChange={(e) => updateListItem(setOutcomes, i, e.target.value)} className="text-sm" placeholder="e.g. [Name] can wash their face and hands independently" />
                <button type="button" onClick={() => removeListItem(setOutcomes, i)} className="text-muted-foreground hover:text-destructive mt-2 text-sm px-1">×</button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addListItem(setOutcomes)}>+ Add item</Button>
          </section>

          {/* Description of care actions */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Description of care actions</h3>
            {interventions.map((int, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-xs text-muted-foreground mt-2.5 w-4 shrink-0">{i + 1}.</span>
                <Textarea value={int} onChange={(e) => updateListItem(setInterventions, i, e.target.value)} rows={3} className="resize-y text-sm" placeholder="e.g. Two staff to assist with repositioning every 2 hours using a slide sheet" />
                <button type="button" onClick={() => removeListItem(setInterventions, i)} className="text-muted-foreground hover:text-destructive mt-2 text-sm px-1">×</button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addListItem(setInterventions)}>+ Add care action</Button>
          </section>

          {/* Review Date */}
          <section className="space-y-1">
            <label className="text-sm font-semibold">Review Date</label>
            <Input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} className="w-44 text-sm" />
          </section>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save as Draft
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
