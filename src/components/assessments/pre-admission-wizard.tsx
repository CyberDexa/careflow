"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { isRedirectError } from "@/lib/utils"
import { Loader2, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { FormField, FormSection, StepIndicator } from "@/components/ui/form-field"
import { startAssessment, saveAssessmentDomain, submitAssessment } from "@/actions/assessments"

const PRE_ADMISSION_STEPS = [
  { key: "PRE_ADMISSION_PERSONAL", label: "Personal" },
  { key: "PRE_ADMISSION_CARE_NEEDS", label: "Care Needs" },
  { key: "PRE_ADMISSION_MEDICAL", label: "Medical" },
  { key: "PRE_ADMISSION_SOCIAL", label: "Social" },
  { key: "PRE_ADMISSION_COMMUNICATION", label: "Communication" },
  { key: "PRE_ADMISSION_PREFERENCES", label: "Preferences" },
]

interface Props {
  residentId: string
}

export function PreAdmissionWizard({ residentId }: Props) {
  const [step, setStep] = useState(0)
  const [assessmentId, setAssessmentId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Per-domain data
  const [personal, setPersonal] = useState<Record<string, any>>({})
  const [careNeeds, setCareNeeds] = useState<Record<string, any>>({})
  const [medical, setMedical] = useState<Record<string, any>>({})
  const [social, setSocial] = useState<Record<string, any>>({})
  const [communication, setCommunication] = useState<Record<string, any>>({})
  const [preferences, setPreferences] = useState<Record<string, any>>({})

  const dataMap = [personal, careNeeds, medical, social, communication, preferences]
  const setMap = [setPersonal, setCareNeeds, setMedical, setSocial, setCommunication, setPreferences]

  function update(field: string, value: any) {
    setMap[step]((prev) => ({ ...prev, [field]: value }))
  }

  function get(field: string) {
    return dataMap[step][field] ?? ""
  }

  async function ensureAssessment(): Promise<string> {
    if (assessmentId) return assessmentId
    const result = await startAssessment(residentId, "PRE_ADMISSION")
    if ("error" in result && result.error) throw new Error(result.error)
    const id = (result as any).assessmentId
    setAssessmentId(id)
    return id
  }

  async function handleNext() {
    setIsSaving(true)
    try {
      const id = await ensureAssessment()
      await saveAssessmentDomain(id, PRE_ADMISSION_STEPS[step].key, dataMap[step], null)
      setStep((s) => s + 1)
    } catch (err: any) {
      toast.error(err.message || "Failed to save section")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleBack() {
    if (step === 0) return
    if (assessmentId) {
      setIsSaving(true)
      try {
        await saveAssessmentDomain(assessmentId, PRE_ADMISSION_STEPS[step].key, dataMap[step], null)
      } catch {}
      setIsSaving(false)
    }
    setStep((s) => s - 1)
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      const id = await ensureAssessment()
      await saveAssessmentDomain(id, PRE_ADMISSION_STEPS[step].key, dataMap[step], null)
      await submitAssessment(id)
    } catch (err: any) {
      if (isRedirectError(err)) throw err
      toast.error(err.message || "Failed to submit pre-admission assessment")
      setIsSubmitting(false)
    }
  }

  const isLast = step === PRE_ADMISSION_STEPS.length - 1

  return (
    <div className="max-w-2xl space-y-6">
      <StepIndicator steps={PRE_ADMISSION_STEPS.map((s) => s.label)} currentStep={step} />

      {step === 0 && <PersonalDomain get={get} update={update} />}
      {step === 1 && <CareNeedsDomain get={get} update={update} />}
      {step === 2 && <MedicalDomain get={get} update={update} />}
      {step === 3 && <SocialDomain get={get} update={update} />}
      {step === 4 && <CommunicationDomain get={get} update={update} />}
      {step === 5 && <PreferencesDomain get={get} update={update} />}

      <div className="flex justify-between pt-4 border-t">
        {step > 0 ? (
          <Button type="button" variant="outline" onClick={handleBack} disabled={isSaving}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        ) : (
          <Link href={`/residents/${residentId}/assessments/new`}>
            <Button type="button" variant="outline"><ChevronLeft className="mr-1 h-4 w-4" /> All assessments</Button>
          </Link>
        )}
        {isLast ? (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Complete Assessment
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save & Continue <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Domain 1: Personal ───────────────────────────────────────────────────────
function PersonalDomain({ get, update }: { get: (f: string) => any; update: (f: string, v: any) => void }) {
  return (
    <div className="space-y-5">
      <FormSection title="Personal Profile" description="Basic information about the prospective resident.">
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Full name"><Input value={get("fullName")} onChange={(e) => update("fullName", e.target.value)} placeholder="Alice McGivern" /></FormField>
          <FormField label="Date of birth"><Input type="date" value={get("dob")} onChange={(e) => update("dob", e.target.value)} /></FormField>
          <FormField label="Gender">
            <Select value={get("gender")} onValueChange={(v) => update("gender", v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {["Male", "Female", "Non-binary", "Prefer not to say"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="NHS number"><Input value={get("nhsNumber")} onChange={(e) => update("nhsNumber", e.target.value)} placeholder="123 456 7890" /></FormField>
        </div>
        <FormField label="Current address"><Textarea value={get("currentAddress")} onChange={(e) => update("currentAddress", e.target.value)} rows={2} placeholder="Home address or current hospital ward..." /></FormField>
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Religion / Spirituality"><Input value={get("religion")} onChange={(e) => update("religion", e.target.value)} placeholder="Christian" /></FormField>
          <FormField label="Ethnicity"><Input value={get("ethnicity")} onChange={(e) => update("ethnicity", e.target.value)} placeholder="White British" /></FormField>
          <FormField label="First language"><Input value={get("language")} onChange={(e) => update("language", e.target.value)} placeholder="English" /></FormField>
        </div>
        <div className="flex items-center gap-3 rounded-md border p-3">
          <Switch id="interpreter" checked={!!get("interpreterNeeded")} onCheckedChange={(v) => update("interpreterNeeded", v)} />
          <label htmlFor="interpreter" className="text-sm cursor-pointer">Interpreter required</label>
        </div>
      </FormSection>

      <FormSection title="Referral Information">
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Referred by"><Input value={get("referredBy")} onChange={(e) => update("referredBy", e.target.value)} placeholder="Hospital discharge team, GP, family..." /></FormField>
          <FormField label="Referral date"><Input type="date" value={get("referralDate")} onChange={(e) => update("referralDate", e.target.value)} /></FormField>
        </div>
        <FormField label="Reason for enquiry / referral"><Textarea value={get("referralReason")} onChange={(e) => update("referralReason", e.target.value)} rows={2} placeholder="Brief reason for enquiry..." /></FormField>
        <FormField label="Proposed admission date"><Input type="date" value={get("proposedAdmissionDate")} onChange={(e) => update("proposedAdmissionDate", e.target.value)} /></FormField>
      </FormSection>
    </div>
  )
}

// ─── Domain 2: Care Needs ─────────────────────────────────────────────────────
function CareNeedsDomain({ get, update }: { get: (f: string) => any; update: (f: string, v: any) => void }) {
  return (
    <div className="space-y-5">
      <FormSection title="Personal Care Needs">
        {[
          ["washing", "Washing / bathing", ["Independent", "Requires supervision", "Requires assistance", "Fully dependent"]],
          ["dressing", "Dressing", ["Independent", "Requires supervision", "Requires assistance", "Fully dependent"]],
          ["continence", "Continence", ["Continent", "Occasional accidents", "Urinary incontinence", "Faecal incontinence", "Double incontinence", "Catheterised"]],
          ["mobility_self_care", "Mobility for self-care", ["Independent", "Requires walking aid", "One-person assist", "Two-person assist", "Hoist required", "Bedbound"]],
        ].map(([id, label, options]) => (
          <FormField key={id as string} label={label as string}>
            <Select value={get(id as string)} onValueChange={(v) => update(id as string, v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{(options as string[]).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
        ))}
      </FormSection>

      <FormSection title="Nursing / Clinical Needs">
        <FormField label="Nursing interventions required"><Textarea value={get("nursingNeeds")} onChange={(e) => update("nursingNeeds", e.target.value)} rows={3} placeholder="Wound dressings, PEG feeds, IV medications, syringe driver, oxygen therapy..." /></FormField>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            ["dnacpr_enquiry", "DNACPR in place"],
            ["peg_feed", "PEG / NG feed"],
            ["oxygen", "Oxygen therapy"],
            ["syringe_driver", "Syringe driver"],
          ].map(([id, label]) => (
            <div key={id as string} className="flex items-center gap-3 rounded-md border p-3">
              <Switch id={id as string} checked={!!get(id as string)} onCheckedChange={(v) => update(id as string, v)} />
              <label htmlFor={id as string} className="text-sm cursor-pointer">{label as string}</label>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection title="Capacity Assessment">
        <div className="flex items-center gap-3 rounded-md border p-3">
          <Switch id="mental_capacity_enquiry" checked={!!get("mentalCapacity")} onCheckedChange={(v) => update("mentalCapacity", v)} />
          <label htmlFor="mental_capacity_enquiry" className="text-sm cursor-pointer">Has mental capacity</label>
        </div>
        <div className="flex items-center gap-3 rounded-md border p-3">
          <Switch id="dols_enquiry" checked={!!get("doLs")} onCheckedChange={(v) => update("doLs", v)} />
          <label htmlFor="dols_enquiry" className="text-sm cursor-pointer">DoLS authorised</label>
        </div>
        <FormField label="MCA / DoLS notes"><Textarea value={get("capacityNotes")} onChange={(e) => update("capacityNotes", e.target.value)} rows={2} placeholder="Any relevant capacity or DoLS information..." /></FormField>
      </FormSection>
    </div>
  )
}

// ─── Domain 3: Medical ────────────────────────────────────────────────────────
function MedicalDomain({ get, update }: { get: (f: string) => any; update: (f: string, v: any) => void }) {
  return (
    <div className="space-y-5">
      <FormSection title="Medical History">
        <FormField label="Primary diagnosis / reason for care"><Input value={get("primaryDiagnosis")} onChange={(e) => update("primaryDiagnosis", e.target.value)} placeholder="e.g. Vascular dementia, COPD, stroke with right hemiplegia..." /></FormField>
        <FormField label="Other diagnoses" hint="List all relevant conditions"><Textarea value={get("otherDiagnoses")} onChange={(e) => update("otherDiagnoses", e.target.value)} rows={3} placeholder="e.g. Type 2 diabetes, osteoporosis, atrial fibrillation..." /></FormField>
        <FormField label="Allergies"><Textarea value={get("allergies")} onChange={(e) => update("allergies", e.target.value)} rows={2} placeholder="Drug allergies, food allergies, and reactions..." /></FormField>
      </FormSection>

      <FormSection title="Current Medications">
        <FormField label="Current medications summary"><Textarea value={get("medications")} onChange={(e) => update("medications", e.target.value)} rows={4} placeholder="List current medications, doses, and frequency or attach medication reconciliation form..." /></FormField>
      </FormSection>

      <FormSection title="GP and Hospital Details">
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="GP name"><Input value={get("gpName")} onChange={(e) => update("gpName", e.target.value)} placeholder="Dr Smith" /></FormField>
          <FormField label="GP practice"><Input value={get("gpPractice")} onChange={(e) => update("gpPractice", e.target.value)} placeholder="Hillside Medical Centre" /></FormField>
          <FormField label="GP telephone"><Input value={get("gpPhone")} onChange={(e) => update("gpPhone", e.target.value)} type="tel" /></FormField>
          <FormField label="Current hospital / ward (if applicable)"><Input value={get("hospital")} onChange={(e) => update("hospital", e.target.value)} placeholder="Ward 7 North, Royal Infirmary" /></FormField>
        </div>
        <FormField label="Consultant(s)"><Input value={get("consultants")} onChange={(e) => update("consultants", e.target.value)} placeholder="Dr Jones, Cardiology; Mr Patel, Orthopaedics..." /></FormField>
      </FormSection>

      <FormSection title="Infection Control">
        <FormField label="Known infections / screening results"><Textarea value={get("infections")} onChange={(e) => update("infections", e.target.value)} rows={2} placeholder="MRSA, C.diff, COVID positive, wound swab results..." /></FormField>
        <div className="flex items-center gap-3 rounded-md border p-3">
          <Switch id="infection_precautions" checked={!!get("infectionPrecautions")} onCheckedChange={(v) => update("infectionPrecautions", v)} />
          <label htmlFor="infection_precautions" className="text-sm cursor-pointer">Infection control precautions required</label>
        </div>
      </FormSection>
    </div>
  )
}

// ─── Domain 4: Social ─────────────────────────────────────────────────────────
function SocialDomain({ get, update }: { get: (f: string) => any; update: (f: string, v: any) => void }) {
  return (
    <div className="space-y-5">
      <FormSection title="Family & Social Situation">
        <FormField label="Current living situation"><Textarea value={get("livingSituation")} onChange={(e) => update("livingSituation", e.target.value)} rows={2} placeholder="Lives alone, with family, in hospital, in previous care home..." /></FormField>
        <FormField label="Family involvement and support"><Textarea value={get("familySupport")} onChange={(e) => update("familySupport", e.target.value)} rows={2} placeholder="Describe family dynamics, visiting expectations, next of kin involvement..." /></FormField>
        <FormField label="Significant relationships / key people"><Textarea value={get("relationships")} onChange={(e) => update("relationships", e.target.value)} rows={2} placeholder="Spouse, children, close friends, community connections..." /></FormField>
      </FormSection>

      <FormSection title="Funding & Legal">
        <FormField label="Funding type">
          <Select value={get("fundingType")} onValueChange={(v) => update("fundingType", v)}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {["Self-funded", "Local authority", "NHS Continuing Healthcare", "Joint funding", "Other"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Social worker (if applicable)"><Input value={get("socialWorker")} onChange={(e) => update("socialWorker", e.target.value)} placeholder="Name and contact details..." /></FormField>
        <div className="flex items-center gap-3 rounded-md border p-3">
          <Switch id="lpa_social" checked={!!get("lpa")} onCheckedChange={(v) => update("lpa", v)} />
          <label htmlFor="lpa_social" className="text-sm cursor-pointer">Lasting Power of Attorney registered</label>
        </div>
        {get("lpa") && (
          <FormField label="LPA holder name(s)"><Input value={get("lpaHolder")} onChange={(e) => update("lpaHolder", e.target.value)} /></FormField>
        )}
      </FormSection>

      <FormSection title="Safeguarding">
        <div className="flex items-center gap-3 rounded-md border p-3 border-orange-200 bg-orange-50">
          <Switch id="safeguarding_concerns" checked={!!get("safeguardingConcerns")} onCheckedChange={(v) => update("safeguardingConcerns", v)} />
          <label htmlFor="safeguarding_concerns" className="text-sm cursor-pointer font-medium">Safeguarding concerns identified</label>
        </div>
        {get("safeguardingConcerns") && (
          <FormField label="Safeguarding concern details">
            <Textarea value={get("safeguardingDetails")} onChange={(e) => update("safeguardingDetails", e.target.value)} rows={3} placeholder="Document safeguarding concerns and actions taken..." />
          </FormField>
        )}
      </FormSection>
    </div>
  )
}

// ─── Domain 5: Communication ──────────────────────────────────────────────────
function CommunicationDomain({ get, update }: { get: (f: string) => any; update: (f: string, v: any) => void }) {
  return (
    <div className="space-y-5">
      <FormSection title="Verbal Communication">
        <FormField label="Primary language"><Input value={get("primaryLanguage")} onChange={(e) => update("primaryLanguage", e.target.value)} placeholder="English" /></FormField>
        <FormField label="Communication ability">
          <Select value={get("communicationAbility")} onValueChange={(v) => update("communicationAbility", v)}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {["Effective verbal communication", "Some difficulty — word finding", "Limited verbal — uses key words / phrases", "Non-verbal — uses gestures / signs", "Non-verbal — uses communication aids", "No verbal communication"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Communication details / strategies"><Textarea value={get("communicationStrategies")} onChange={(e) => update("communicationStrategies", e.target.value)} rows={3} placeholder="What works well? Short sentences, visual cues, picture boards, Makaton..." /></FormField>
      </FormSection>

      <FormSection title="Hearing & Vision">
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Hearing">
            <Select value={get("hearing")} onValueChange={(v) => update("hearing", v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {["Normal", "Mild loss", "Moderate loss", "Severe / profound loss", "Hearing aid worn (one)", "Hearing aid worn (both)"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Vision">
            <Select value={get("vision")} onValueChange={(v) => update("vision", v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {["Normal", "Glasses worn", "Partially sighted", "Registered blind", "Recent deterioration"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Cognitive Communication">
        <FormField label="Cognitive level">
          <Select value={get("cognitiveLevel")} onValueChange={(v) => update("cognitiveLevel", v)}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {["Alert and orientated", "Mild cognitive impairment", "Moderate cognitive impairment / dementia", "Severe cognitive impairment / advanced dementia", "Fluctuating cognition"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Behaviour notes"><Textarea value={get("behaviourNotes")} onChange={(e) => update("behaviourNotes", e.target.value)} rows={3} placeholder="Distressed behaviours, wandering, sundowning, triggers and de-escalation strategies..." /></FormField>
        <FormField label="SLT referral required?">
          <Select value={get("sltReferral")} onValueChange={(v) => update("sltReferral", v)}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {["Yes", "No", "Existing SLT patient", "Under investigation"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
      </FormSection>
    </div>
  )
}

// ─── Domain 6: Preferences ─────────────────────────────────────────────────────
function PreferencesDomain({ get, update }: { get: (f: string) => any; update: (f: string, v: any) => void }) {
  return (
    <div className="space-y-5">
      <FormSection title="Daily Life Preferences">
        <FormField label="Preferred wake-up time"><Input value={get("wakeTime")} onChange={(e) => update("wakeTime", e.target.value)} placeholder="e.g. 7am, 8-9am, likes a lie-in..." /></FormField>
        <FormField label="Preferred bedtime"><Input value={get("bedTime")} onChange={(e) => update("bedTime", e.target.value)} placeholder="e.g. 9pm, 10pm, watches late TV..." /></FormField>
        <FormField label="Preferred meal times"><Input value={get("mealTimes")} onChange={(e) => update("mealTimes", e.target.value)} placeholder="e.g. traditional breakfast at 8am, early dinner..." /></FormField>
        <FormField label="Favourite foods / drinks"><Textarea value={get("favouriteFoods")} onChange={(e) => update("favouriteFoods", e.target.value)} rows={2} placeholder="e.g. tea with two sugars, loves fish and chips on Fridays..." /></FormField>
        <FormField label="Foods / drinks to avoid"><Textarea value={get("foodsToAvoid")} onChange={(e) => update("foodsToAvoid", e.target.value)} rows={2} placeholder="e.g. does not eat pork for religious reasons, dislikes porridge..." /></FormField>
      </FormSection>

      <FormSection title="Interests and Activities">
        <FormField label="Interests and hobbies"><Textarea value={get("interests")} onChange={(e) => update("interests", e.target.value)} rows={3} placeholder="e.g. enjoys gardening, watching football, listening to 60s music, crosswords..." /></FormField>
        <FormField label="Activities to avoid"><Input value={get("activitiesToAvoid")} onChange={(e) => update("activitiesToAvoid", e.target.value)} /></FormField>
      </FormSection>

      <FormSection title="Personal Preferences">
        <FormField label="Privacy and dignity preferences"><Textarea value={get("privacyPreferences")} onChange={(e) => update("privacyPreferences", e.target.value)} rows={2} placeholder="e.g. prefers female carer for personal care, knocks before entering, dresses in own clothes..." /></FormField>
        <FormField label="Important routines"><Textarea value={get("routines")} onChange={(e) => update("routines", e.target.value)} rows={2} placeholder="e.g. morning walk, evening prayers, daily phone call with daughter..." /></FormField>
        <FormField label="What is most important to this person?"><Textarea value={get("mostImportant")} onChange={(e) => update("mostImportant", e.target.value)} rows={3} placeholder="In their own words (or as described by family) — what matters most to them in daily life..." /></FormField>
      </FormSection>

      <FormSection title="Advance Decisions (if known)">
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            ["dnacpr_pref", "DNACPR in place"],
            ["lpa_health", "LPA (Health and Welfare)"],
          ].map(([id, label]) => (
            <div key={id as string} className="flex items-center gap-3 rounded-md border p-3">
              <Switch id={id as string} checked={!!get(id as string)} onCheckedChange={(v) => update(id as string, v)} />
              <label htmlFor={id as string} className="text-sm cursor-pointer">{label as string}</label>
            </div>
          ))}
        </div>
        <FormField label="Additional preferences / wishes"><Textarea value={get("additionalPreferences")} onChange={(e) => update("additionalPreferences", e.target.value)} rows={3} placeholder="Any other preferences, wishes, or important information..." /></FormField>
      </FormSection>
    </div>
  )
}
