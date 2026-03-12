import { z } from "zod"

// ─── Auth ───────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export const registerSchema = z.object({
  organisationName: z.string().min(2, "Organisation name must be at least 2 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  regulatoryBody: z.enum(["CQC", "CARE_INSPECTORATE", "CSSIW", "RQIA"]).default("CQC"),
})

export const registerClientSchema = registerSchema.extend({
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

export type RegisterClientInput = z.infer<typeof registerClientSchema>

// ─── Resident ───────────────────────────────────────────────────
export const residentPersonalSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  preferredName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  pronouns: z.string().optional(),
  nationality: z.string().optional(),
  religion: z.string().optional(),
  ethnicity: z.string().optional(),
  language: z.string().optional().default("English"),
  interpreterNeeded: z.boolean().default(false),
  nhsNumber: z.string().optional(),
  roomNumber: z.string().optional(),
})

export const residentMedicalSchema = z.object({
  diagnoses: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
  vaccinationAlerts: z.array(z.string()).default([]),
  currentMedications: z.string().optional(),
  mobilityLevel: z.enum(["INDEPENDENT", "SUPERVISED", "ONE_PERSON_ASSIST", "TWO_PERSON_ASSIST", "HOIST", "BEDBOUND"]).default("INDEPENDENT"),
  mobilityAids: z.array(z.string()).default([]),
  continenceLevel: z.enum(["CONTINENT", "OCCASIONALLY_INCONTINENT", "FREQUENTLY_INCONTINENT", "TOTALLY_INCONTINENT", "CATHETERISED", "STOMA"]).default("CONTINENT"),
  dietaryNeeds: z.array(z.string()).default([]),
  textureModified: z.boolean().default(false),
  textureLevel: z.string().optional(),
  fluidThickened: z.boolean().default(false),
  fluidThickness: z.string().optional(),
  skinIntegrityNotes: z.string().optional(),
  smokingStatus: z.string().optional(),
  alcoholUse: z.string().optional(),
  additionalNeeds: z.string().optional(),
  dnacprInPlace: z.boolean().default(false),
  dnacprDate: z.string().optional(),
  mentalCapacity: z.boolean().default(true),
  doLsAuthorised: z.boolean().default(false),
  gpName: z.string().optional(),
  gpPractice: z.string().optional(),
  gpPhone: z.string().optional(),
  gpAddress: z.string().optional(),
})

export const residentContactSchema = z.object({
  relationship: z.string().min(1, "Relationship is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  isNextOfKin: z.boolean().default(false),
  isPoa: z.boolean().default(false),
  isEmergency: z.boolean().default(true),
  notes: z.string().optional(),
})

export const residentAdmissionSchema = z.object({
  admissionDate: z.string().optional(),
  expectedStayType: z.string().optional(),
  fundingType: z.string().optional(),
  referralSource: z.string().optional(),
  notes: z.string().optional(),
})

// ─── Care Notes ──────────────────────────────────────────────────
export const careNoteSchema = z.object({
  residentId: z.string().min(1, "Resident is required"),
  category: z.enum(["PERSONAL_CARE", "FOOD_FLUID", "MOBILITY", "WELLBEING", "BEHAVIOUR", "HEALTH_CONCERN", "SOCIAL", "SLEEP", "CONTINENCE", "GENERAL"]),
  shift: z.enum(["MORNING", "AFTERNOON", "NIGHT"]),
  content: z.string().min(10, "Note must be at least 10 characters"),
})

// ─── Incidents ───────────────────────────────────────────────────
export const incidentSchema = z.object({
  residentId: z.string().min(1, "Resident is required"),
  type: z.enum(["FALL", "MEDICATION_ERROR", "SKIN_INTEGRITY", "BEHAVIOURAL", "SAFEGUARDING", "HEALTH_DETERIORATION", "NEAR_MISS", "COMPLAINT", "ENVIRONMENTAL", "OTHER"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  description: z.string().min(20, "Description must be at least 20 characters"),
  location: z.string().optional(),
  occurredAt: z.string().min(1, "Time of incident is required"),
  witnesses: z.string().optional(),
  injuryDetails: z.string().optional(),
  firstAidGiven: z.boolean().default(false),
  firstAidDetails: z.string().optional(),
  familyNotified: z.boolean().default(false),
  gpNotified: z.boolean().default(false),
})

// ─── Body Map ────────────────────────────────────────────────────
export const bodyMapSchema = z.object({
  residentId: z.string().min(1),
  bodyRegion: z.string().min(1, "Body region is required"),
  description: z.string().min(5, "Description is required"),
  type: z.enum(["SKIN_TEAR", "PRESSURE_DAMAGE", "WOUND", "BRUISE", "RASH", "SWELLING", "NEW_MARK", "OTHER"]),
  severity: z.enum(["MINOR", "MODERATE", "SEVERE"]),
})

// ─── Handover ────────────────────────────────────────────────────
export const handoverSchema = z.object({
  shift: z.enum(["MORNING", "AFTERNOON", "NIGHT"]),
  shiftDate: z.string().min(1, "Date is required"),
  manualAdditions: z.string().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ResidentPersonalInput = z.infer<typeof residentPersonalSchema>
export type ResidentMedicalInput = z.infer<typeof residentMedicalSchema>
export type ResidentContactInput = z.infer<typeof residentContactSchema>
export type ResidentAdmissionInput = z.infer<typeof residentAdmissionSchema>
export type CareNoteInput = z.infer<typeof careNoteSchema>
export type IncidentInput = z.infer<typeof incidentSchema>
export type BodyMapInput = z.infer<typeof bodyMapSchema>
export type HandoverInput = z.infer<typeof handoverSchema>
