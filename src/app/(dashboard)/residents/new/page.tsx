"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { FormField, FormSection, StepIndicator } from "@/components/ui/form-field"
import { createResident } from "@/actions/residents"
import {
  residentPersonalSchema, residentMedicalSchema, residentContactSchema,
  type ResidentPersonalInput, type ResidentMedicalInput, type ResidentContactInput,
} from "@/lib/validations"
import { Plus, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { isRedirectError } from "@/lib/utils"

const STEPS = ["Personal", "Medical", "Contacts", "Admission"]

type TagInputProps = { value: string[]; onChange: (v: string[]) => void; placeholder?: string }

function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const [input, setInput] = useState("")
  function add() {
    const trimmed = input.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput("")
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>Add</Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <span key={item} className="inline-flex items-center gap-1 bg-muted text-sm px-2 py-0.5 rounded-full">
              {item}
              <button type="button" onClick={() => onChange(value.filter((v) => v !== item))} className="text-muted-foreground hover:text-foreground">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NewResidentPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Collected data across steps
  const [personalData, setPersonalData] = useState<ResidentPersonalInput | null>(null)
  const [medicalData, setMedicalData] = useState<ResidentMedicalInput | null>(null)
  const [contacts, setContacts] = useState<ResidentContactInput[]>([])
  const [admissionData, setAdmissionData] = useState<any>(null)

  const personalForm = useForm<ResidentPersonalInput>({ resolver: zodResolver(residentPersonalSchema) as any })
  const medicalForm = useForm<ResidentMedicalInput>({
    resolver: zodResolver(residentMedicalSchema) as any,
    defaultValues: {
      diagnoses: [], allergies: [], vaccinationAlerts: [], mobilityAids: [], dietaryNeeds: [],
      textureModified: false, fluidThickened: false, dnacprInPlace: false, mentalCapacity: true, doLsAuthorised: false,
      mobilityLevel: "INDEPENDENT", continenceLevel: "CONTINENT",
    },
  })

  async function handlePersonalSubmit(data: ResidentPersonalInput) {
    setPersonalData(data)
    setStep(1)
  }

  async function handleMedicalSubmit(data: ResidentMedicalInput) {
    setMedicalData(data)
    setStep(2)
  }

  async function handleFinalSubmit() {
    if (!personalData || !medicalData) return
    setIsSubmitting(true)
    try {
      await createResident({ personal: personalData, medical: medicalData, contacts, admission: admissionData })
    } catch (err: any) {
      if (isRedirectError(err)) throw err
      toast.error(err.message || "Failed to create resident")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/residents" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Add New Resident</h1>
          <p className="text-muted-foreground text-sm">Step {step + 1} of {STEPS.length}</p>
        </div>
      </div>

      <StepIndicator steps={STEPS} currentStep={step} />

      {/* Step 1: Personal Details */}
      {step === 0 && (
        <form onSubmit={personalForm.handleSubmit(handlePersonalSubmit)} className="space-y-6">
          <FormSection title="Personal Details" description="Basic identifying information about the resident.">
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="First name" error={personalForm.formState.errors.firstName?.message} required>
                <Input {...personalForm.register("firstName")} placeholder="Alice" />
              </FormField>
              <FormField label="Last name" error={personalForm.formState.errors.lastName?.message} required>
                <Input {...personalForm.register("lastName")} placeholder="McGivern" />
              </FormField>
            </div>
            <FormField label="Preferred name / Nickname" error={personalForm.formState.errors.preferredName?.message}>
              <Input {...personalForm.register("preferredName")} placeholder="Ali" />
            </FormField>
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Date of birth">
                <Input {...personalForm.register("dateOfBirth")} type="date" />
              </FormField>
              <FormField label="Room number">
                <Input {...personalForm.register("roomNumber")} placeholder="12" />
              </FormField>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Gender">
                <Select onValueChange={(v) => personalForm.setValue("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {["Male", "Female", "Non-binary", "Prefer not to say"].map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Pronouns">
                <Input {...personalForm.register("pronouns")} placeholder="She/her" />
              </FormField>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Religion / Spirituality">
                <Input {...personalForm.register("religion")} placeholder="Christian" />
              </FormField>
              <FormField label="Ethnicity">
                <Input {...personalForm.register("ethnicity")} placeholder="White British" />
              </FormField>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Primary language" hint="Default: English">
                <Input {...personalForm.register("language")} placeholder="English" />
              </FormField>
              <FormField label="NHS number">
                <Input {...personalForm.register("nhsNumber")} placeholder="123 456 7890" />
              </FormField>
            </div>
            <div className="flex items-center gap-3 rounded-md border p-3">
              <Switch
                id="interpreter"
                checked={personalForm.watch("interpreterNeeded")}
                onCheckedChange={(v) => personalForm.setValue("interpreterNeeded", v)}
              />
              <label htmlFor="interpreter" className="text-sm cursor-pointer">
                Interpreter / translation services needed
              </label>
            </div>
          </FormSection>
          <div className="flex justify-end">
            <Button type="submit">Continue <ChevronRight className="ml-1 h-4 w-4" /></Button>
          </div>
        </form>
      )}

      {/* Step 2: Medical */}
      {step === 1 && (
        <form onSubmit={medicalForm.handleSubmit(handleMedicalSubmit)} className="space-y-6">
          <FormSection title="Medical History" description="Health conditions, allergies, and care needs.">
            <FormField label="Diagnoses / Medical conditions" hint="Press Enter or click Add after each item">
              <TagInput
                value={medicalForm.watch("diagnoses") || []}
                onChange={(v) => medicalForm.setValue("diagnoses", v)}
                placeholder="e.g. Dementia, COPD, Diabetes Type 2..."
              />
            </FormField>
            <FormField label="Allergies" hint="Press Enter or click Add after each item">
              <TagInput
                value={medicalForm.watch("allergies") || []}
                onChange={(v) => medicalForm.setValue("allergies", v)}
                placeholder="e.g. Penicillin, Nuts..."
              />
            </FormField>
            <FormField label="Current medications summary">
              <Textarea {...medicalForm.register("currentMedications")} placeholder="Summarise current medications..." rows={3} />
            </FormField>
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Mobility level">
                <Select
                  defaultValue="INDEPENDENT"
                  onValueChange={(v) => medicalForm.setValue("mobilityLevel", v as any)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[["INDEPENDENT","Independent"],["SUPERVISED","Supervised"],["ONE_PERSON_ASSIST","1-person assist"],["TWO_PERSON_ASSIST","2-person assist"],["HOIST","Hoist"],["BEDBOUND","Bedbound"]].map(([v,l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Continence">
                <Select
                  defaultValue="CONTINENT"
                  onValueChange={(v) => medicalForm.setValue("continenceLevel", v as any)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[["CONTINENT","Continent"],["OCCASIONALLY_INCONTINENT","Occasionally incontinent"],["FREQUENTLY_INCONTINENT","Frequently incontinent"],["TOTALLY_INCONTINENT","Totally incontinent"],["CATHETERISED","Catheterised"],["STOMA","Stoma"]].map(([v,l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Switch
                    id="texture"
                    checked={medicalForm.watch("textureModified")}
                    onCheckedChange={(v) => medicalForm.setValue("textureModified", v)}
                  />
                  <label htmlFor="texture" className="text-sm">Texture-modified diet</label>
                </div>
                {medicalForm.watch("textureModified") && (
                  <Input {...medicalForm.register("textureLevel")} placeholder="IDDSI level e.g. Level 5 Minced" />
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Switch
                    id="fluid"
                    checked={medicalForm.watch("fluidThickened")}
                    onCheckedChange={(v) => medicalForm.setValue("fluidThickened", v)}
                  />
                  <label htmlFor="fluid" className="text-sm">Thickened fluids</label>
                </div>
                {medicalForm.watch("fluidThickened") && (
                  <Input {...medicalForm.register("fluidThickness")} placeholder="e.g. Level 2 Mildly thick" />
                )}
              </div>
            </div>
          </FormSection>

          <FormSection title="Key Clinical Flags">
            {[
              { id: "dnacpr", field: "dnacprInPlace" as const, label: "DNACPR in place", desc: "Do Not Attempt Cardiopulmonary Resuscitation order" },
              { id: "capacity", field: "mentalCapacity" as const, label: "Has mental capacity", desc: "Resident can make their own decisions" },
              { id: "dols", field: "doLsAuthorised" as const, label: "DoLS authorised", desc: "Deprivation of Liberty Safeguards in place" },
            ].map(({ id, field, label, desc }) => (
              <div key={id} className="flex items-center gap-3 rounded-md border p-3">
                <Switch
                  id={id}
                  checked={medicalForm.watch(field)}
                  onCheckedChange={(v) => medicalForm.setValue(field, v)}
                />
                <div>
                  <label htmlFor={id} className="text-sm font-medium cursor-pointer">{label}</label>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </FormSection>

          <FormSection title="GP Details">
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="GP Name">
                <Input {...medicalForm.register("gpName")} placeholder="Dr Smith" />
              </FormField>
              <FormField label="GP Practice">
                <Input {...medicalForm.register("gpPractice")} placeholder="Hillside Medical Centre" />
              </FormField>
              <FormField label="GP Phone">
                <Input {...medicalForm.register("gpPhone")} type="tel" placeholder="01234 567890" />
              </FormField>
            </div>
          </FormSection>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(0)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button type="submit">Continue <ChevronRight className="ml-1 h-4 w-4" /></Button>
          </div>
        </form>
      )}

      {/* Step 3: Contacts */}
      {step === 2 && (
        <div className="space-y-6">
          <FormSection title="Emergency Contacts" description="Next of Kin, Power of Attorney, and key contacts.">
            {contacts.map((contact, i) => (
              <Card key={i} className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => setContacts(contacts.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <CardContent className="p-4 pt-3">
                  <p className="font-medium text-sm">{contact.firstName} {contact.lastName}</p>
                  <p className="text-xs text-muted-foreground">{contact.relationship} · {contact.phone}</p>
                  <div className="flex gap-2 mt-1">
                    {contact.isNextOfKin && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">NOK</span>}
                    {contact.isPoa && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">POA</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
            <ContactAddForm onAdd={(c) => setContacts([...contacts, c])} />
          </FormSection>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button type="button" onClick={() => setStep(3)}>Continue <ChevronRight className="ml-1 h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Step 4: Admission */}
      {step === 3 && (
        <div className="space-y-6">
          <FormSection title="Admission Details" description="Optional admission and funding information.">
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Admission date">
                <Input type="date" onChange={(e) => setAdmissionData((p: any) => ({ ...p, admissionDate: e.target.value }))} />
              </FormField>
              <FormField label="Expected stay type">
                <Select onValueChange={(v) => setAdmissionData((p: any) => ({ ...p, expectedStayType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {["Permanent", "Respite", "Short-term", "Trial period", "Intermediate care"].map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Funding type">
                <Select onValueChange={(v) => setAdmissionData((p: any) => ({ ...p, fundingType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {["Self-funded", "Local authority", "NHS Continuing Healthcare", "Joint funding", "Other"].map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Referral source">
                <Input placeholder="Hospital discharge, GP, family..." onChange={(e) => setAdmissionData((p: any) => ({ ...p, referralSource: e.target.value }))} />
              </FormField>
            </div>
            <FormField label="Additional notes">
              <Textarea rows={3} placeholder="Any additional information..." onChange={(e) => setAdmissionData((p: any) => ({ ...p, notes: e.target.value }))} />
            </FormField>
          </FormSection>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button onClick={handleFinalSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Resident
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Inline contact add form
function ContactAddForm({ onAdd }: { onAdd: (c: ResidentContactInput) => void }) {
  const [open, setOpen] = useState(false)
  const form = useForm<ResidentContactInput>({
    resolver: zodResolver(residentContactSchema) as any,
    defaultValues: { isNextOfKin: false, isPoa: false, isEmergency: true },
  })

  function submit(data: ResidentContactInput) {
    onAdd(data)
    form.reset()
    setOpen(false)
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className="w-full">
        <Plus className="mr-2 h-4 w-4" /> Add Contact
      </Button>
    )
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3"><CardTitle className="text-sm">New Contact</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <FormField label="First name" error={form.formState.errors.firstName?.message} required>
              <Input {...form.register("firstName")} placeholder="Jane" />
            </FormField>
            <FormField label="Last name" error={form.formState.errors.lastName?.message} required>
              <Input {...form.register("lastName")} placeholder="McGivern" />
            </FormField>
          </div>
          <FormField label="Relationship" error={form.formState.errors.relationship?.message} required>
            <Input {...form.register("relationship")} placeholder="Daughter" />
          </FormField>
          <div className="grid sm:grid-cols-2 gap-3">
            <FormField label="Phone">
              <Input {...form.register("phone")} type="tel" placeholder="07700 900000" />
            </FormField>
            <FormField label="Email">
              <Input {...form.register("email")} type="email" placeholder="jane@example.com" />
            </FormField>
          </div>
          <div className="flex flex-wrap gap-4">
            {[
              { id: "nok", field: "isNextOfKin" as const, label: "Next of Kin" },
              { id: "poa", field: "isPoa" as const, label: "Power of Attorney" },
              { id: "emergency", field: "isEmergency" as const, label: "Emergency contact" },
            ].map(({ id, field, label }) => (
              <label key={id} className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" {...form.register(field)} className="rounded" />
                {label}
              </label>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm">Add Contact</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
