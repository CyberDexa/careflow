"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Sparkles, Save, Printer, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { generateHandoverReport, saveHandoverReport } from "@/actions/handover"

function getCurrentShift(): string {
  const h = new Date().getHours()
  if (h >= 7 && h < 15) return "MORNING"
  if (h >= 15 && h < 23) return "AFTERNOON"
  return "NIGHT"
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

const SHIFT_LABELS: Record<string, string> = {
  MORNING: "Morning (07:00–15:00)",
  AFTERNOON: "Afternoon (15:00–23:00)",
  NIGHT: "Night (23:00–07:00)",
}

export default function HandoverClient() {
  const [shift, setShift] = useState(getCurrentShift())
  const [shiftDate, setShiftDate] = useState(todayISO())
  const [content, setContent] = useState("")
  const [aiGenerated, setAiGenerated] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  async function handleGenerate() {
    setIsGenerating(true)
    try {
      const result = await generateHandoverReport(shift, shiftDate)
      if (!result || "error" in result) {
        toast.error((result as any)?.error ?? "Failed to load shift data")
        return
      }

      const res = await fetch("/api/handover/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      })
      if (!res.ok) {
        toast.error("AI generation failed")
        return
      }
      const { content: generatedContent } = await res.json()
      setContent(generatedContent)
      setAiGenerated(true)
      toast.success("Handover report generated — review and edit before saving")
    } catch {
      toast.error("Something went wrong")
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSave() {
    if (!content.trim()) {
      toast.error("Report content is empty")
      return
    }
    setIsSaving(true)
    const result = await saveHandoverReport({ shift, shiftDate, content, aiGenerated })
    setIsSaving(false)
    if (result && "error" in result) {
      toast.error(String(result.error))
      return
    }
    toast.success("Handover report saved")
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Shift</label>
          <Select value={shift} onValueChange={setShift}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SHIFT_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</label>
          <input
            type="date"
            value={shiftDate}
            onChange={(e) => setShiftDate(e.target.value)}
            className="h-9 w-40 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2">
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isGenerating ? "Generating…" : "Generate AI Handover"}
        </Button>
      </div>

      {/* Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Report Content</label>
            {aiGenerated && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Sparkles className="h-3 w-3" /> AI-assisted
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1 print:hidden">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving || !content} className="gap-1 print:hidden">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Report
            </Button>
          </div>
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={24}
          placeholder={`Generate an AI handover or type your ${SHIFT_LABELS[shift]} handover notes here…`}
          className="resize-none font-mono text-sm leading-relaxed"
        />
        {!content && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> Click &quot;Generate AI Handover&quot; to auto-draft from today&apos;s care notes, or write manually above.
          </p>
        )}
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold">Shift Handover — {SHIFT_LABELS[shift]}</h1>
        <p className="text-sm text-gray-500">{shiftDate} · Generated {new Date().toLocaleTimeString("en-GB")}</p>
        <hr className="mt-3" />
      </div>
    </div>
  )
}
