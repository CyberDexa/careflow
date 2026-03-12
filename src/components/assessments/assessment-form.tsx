"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Loader2, ChevronRight, ChevronLeft, CheckCircle, Info } from "lucide-react"
import { isRedirectError } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { FormField } from "@/components/ui/form-field"
import { saveAndSubmitAssessment } from "@/actions/assessments"
import { getAssessmentConfig } from "@/lib/assessment-registry"
import type { AssessmentConfig, Question, QuestionOption, AssessmentSection } from "@/lib/assessment-registry"

/**
 * Generic assessment form that renders any AssessmentConfig for a given resident.
 * For single-domain formal assessments (one section per page, or all on one page).
 */

interface AssessmentFormProps {
  residentId: string
  /** Assessment type key — used to look up the config client-side (functions can't cross the server→client boundary). */
  assessmentType: string
  /** If provided the form will have a back nav that goes to this path */
  backHref?: string
  /** Flattened pre-admission data to pre-fill matching question IDs */
  prefillData?: Record<string, any>
}

export function AssessmentForm({ residentId, assessmentType, backHref, prefillData }: AssessmentFormProps) {
  const config = getAssessmentConfig(assessmentType)!
  const [answers, setAnswers] = useState<Record<string, any>>(prefillData ?? {})
  const [isSubmitting, setIsSubmitting] = useState(false)

  function isVisible(q: Question): boolean {
    if (!q.conditional) return true
    const condVal = answers[q.conditional.id]
    return String(condVal) === String(q.conditional.value)
  }

  function setValue(id: string, value: any) {
    setAnswers((prev) => ({ ...prev, [id]: value }))
  }

  function getValue(id: string) {
    return answers[id] ?? ""
  }

  // MUST: auto-calculate BMI and suggest bmi_score band
  const mustBmi = config.type === "MUST_NUTRITIONAL"
    ? (() => {
        const w = parseFloat(answers.weight)
        const h = parseFloat(answers.height)
        if (!w || !h || h === 0) return null
        const hM = h / 100
        return Math.round((w / (hM * hM)) * 10) / 10
      })()
    : null
  const mustBmiSuggested = mustBmi !== null
    ? mustBmi > 20 ? "0" : mustBmi >= 18.5 ? "1" : "2"
    : null

  // Calculate total score if scoring is defined
  const score = config.scoring ? config.scoring.getTotal(answers) : null
  const riskResult = score !== null && config.scoring ? config.scoring.getRiskResult(score) : null

  async function handleSubmit() {
    // Check required fields
    const allQuestions = config.sections.flatMap((s) => s.questions)
    const missing = allQuestions.filter(
      (q) => q.required && isVisible(q) && (answers[q.id] === undefined || answers[q.id] === "" || answers[q.id] === null)
    )
    if (missing.length > 0) {
      toast.error(`Please complete required fields: ${missing.map((q) => q.label).join(", ")}`)
      return
    }

    setIsSubmitting(true)
    try {
      await saveAndSubmitAssessment(residentId, config.type, answers, score)
    } catch (err: any) {
      if (isRedirectError(err)) throw err
      toast.error(err.message || "Failed to save assessment")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Pre-fill banner */}
      {prefillData && Object.keys(prefillData).length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-3">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900">Pre-filled from pre-admission assessment</p>
            <p className="text-xs text-blue-700 mt-0.5">Matching fields have been pre-populated. Review and update all answers before saving.</p>
          </div>
        </div>
      )}
      {/* MUST BMI calculator helper */}
      {mustBmi !== null && (
        <div className="rounded-lg border border-green-200 bg-green-50/50 p-4 space-y-1">
          <p className="text-sm font-medium text-green-900">
            Calculated BMI: <span className="font-bold">{mustBmi}</span>
          </p>
          <p className="text-xs text-green-700">
            Suggested BMI score band:{" "}
            {mustBmiSuggested === "0" ? "Score 0 — BMI > 20" :
             mustBmiSuggested === "1" ? "Score 1 — BMI 18.5–20" :
             "Score 2 — BMI < 18.5"}
          </p>
          {answers.bmi_score !== mustBmiSuggested && (
            <button
              type="button"
              onClick={() => setValue("bmi_score", mustBmiSuggested!)}
              className="text-xs text-green-700 underline underline-offset-2 hover:text-green-900"
            >
              Apply suggested BMI score →
            </button>
          )}
        </div>
      )}
      {/* Score card — sticky summary for scored assessments */}
      {config.scoring && score !== null && (
        <div className={`rounded-lg border p-4 bg-muted/40 flex items-center justify-between`}>
          <div>
            <p className="text-sm text-muted-foreground">{config.scoring.scoreLabel ?? "Score"}</p>
            <p className="text-2xl font-bold">{score}</p>
          </div>
          {riskResult && (
            <div className="text-right">
              <p className={`font-semibold ${riskResult.colour}`}>{riskResult.label}</p>
              <p className="text-xs text-muted-foreground capitalize">{riskResult.level.replace("_", " ")}</p>
            </div>
          )}
        </div>
      )}

      {/* Sections */}
      {config.sections.map((section, si) => (
        <SectionBlock
          key={si}
          section={section}
          answers={answers}
          isVisible={isVisible}
          getValue={getValue}
          setValue={setValue}
        />
      ))}

      {/* Risk recommendations */}
      {riskResult?.recommendations && riskResult.recommendations.length > 0 && (
        <div className="rounded-lg border border-dashed p-4 space-y-2">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-primary" /> Recommended Actions
          </p>
          <ul className="space-y-1">
            {riskResult.recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-primary shrink-0">•</span>{rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        {backHref ? (
          <Button type="button" variant="outline" asChild>
            <a href={backHref}><ChevronLeft className="mr-1 h-4 w-4" /> Back</a>
          </Button>
        ) : <div />}
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Assessment
        </Button>
      </div>
    </div>
  )
}

// ─── Section Block ───────────────────────────────────────────────────────────
function SectionBlock({
  section,
  answers,
  isVisible,
  getValue,
  setValue,
}: {
  section: AssessmentSection
  answers: Record<string, any>
  isVisible: (q: Question) => boolean
  getValue: (id: string) => any
  setValue: (id: string, val: any) => void
}) {
  const visibleQuestions = section.questions.filter(isVisible)
  if (visibleQuestions.length === 0) return null

  return (
    <div className="space-y-4">
      {section.title && (
        <div className="border-b pb-2">
          <h3 className="font-semibold">{section.title}</h3>
          {section.description && <p className="text-sm text-muted-foreground mt-0.5">{section.description}</p>}
        </div>
      )}
      {visibleQuestions.map((q) => (
        <QuestionInput key={q.id} question={q} value={getValue(q.id)} onChange={(v) => setValue(q.id, v)} />
      ))}
    </div>
  )
}

// ─── Question Input ──────────────────────────────────────────────────────────
function QuestionInput({
  question: q,
  value,
  onChange,
}: {
  question: Question
  value: any
  onChange: (v: any) => void
}) {
  const label = (
    <span>
      {q.label}
      {q.required && <span className="text-destructive ml-0.5">*</span>}
      {q.unit && <span className="text-muted-foreground text-xs ml-1">({q.unit})</span>}
    </span>
  )

  if (q.type === "radio" && q.options) {
    return (
      <FormField label={q.label} hint={q.description} required={q.required}>
        <div className="space-y-1.5">
          {q.options.map((opt) => (
            <label key={String(opt.value)} className={`flex items-start gap-2.5 rounded-md border px-3 py-2 cursor-pointer text-sm transition-colors ${String(value) === String(opt.value) ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
              <input
                type="radio"
                name={q.id}
                value={String(opt.value)}
                checked={String(value) === String(opt.value)}
                onChange={() => onChange(String(opt.value))}
                className="mt-0.5 accent-primary shrink-0"
              />
              <span>
                <span className="font-medium">{opt.label}</span>
                {opt.description && <span className="block text-xs text-muted-foreground">{opt.description}</span>}
              </span>
            </label>
          ))}
        </div>
      </FormField>
    )
  }

  if (q.type === "checkbox" && q.options) {
    const opt = q.options[0]
    return (
      <div className="flex items-center gap-3 rounded-md border p-3">
        <Switch
          id={q.id}
          checked={value === true || value === "true" || String(value) === String(opt.value)}
          onCheckedChange={(v) => onChange(v ? String(opt.value) : false)}
        />
        <div>
          <label htmlFor={q.id} className="text-sm font-medium cursor-pointer">{q.label}</label>
          {q.description && <p className="text-xs text-muted-foreground">{q.description}</p>}
        </div>
      </div>
    )
  }

  if (q.type === "multicheck" && q.options) {
    const selected: string[] = Array.isArray(value) ? value : value ? [value] : []
    function toggle(v: string) {
      if (selected.includes(v)) onChange(selected.filter((x) => x !== v))
      else onChange([...selected, v])
    }
    return (
      <FormField label={q.label} hint={q.description} required={q.required}>
        <div className="flex flex-wrap gap-2">
          {q.options.map((opt) => (
            <label key={String(opt.value)} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 cursor-pointer text-sm transition-colors ${selected.includes(String(opt.value)) ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted/50"}`}>
              <input
                type="checkbox"
                checked={selected.includes(String(opt.value))}
                onChange={() => toggle(String(opt.value))}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </FormField>
    )
  }

  if (q.type === "select" && q.options) {
    return (
      <FormField label={q.label} hint={q.description} required={q.required}>
        <Select value={value || ""} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {q.options.map((opt) => (
              <SelectItem key={String(opt.value)} value={String(opt.value)}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    )
  }

  if (q.type === "number") {
    return (
      <FormField label={q.label} hint={q.description} required={q.required}>
        <Input
          type="number"
          min={q.min}
          max={q.max}
          step={q.step ?? 1}
          value={value || ""}
          placeholder={q.placeholder}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          className="max-w-xs"
        />
      </FormField>
    )
  }

  if (q.type === "textarea") {
    return (
      <FormField label={q.label} hint={q.description} required={q.required}>
        <Textarea
          value={value || ""}
          placeholder={q.placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      </FormField>
    )
  }

  if (q.type === "date") {
    return (
      <FormField label={q.label} hint={q.description} required={q.required}>
        <Input type="date" value={value || ""} onChange={(e) => onChange(e.target.value)} className="max-w-xs" />
      </FormField>
    )
  }

  // Default: text
  return (
    <FormField label={q.label} hint={q.description} required={q.required}>
      <Input
        type="text"
        value={value || ""}
        placeholder={q.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </FormField>
  )
}
