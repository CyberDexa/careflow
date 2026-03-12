"use server"

import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { logAudit } from "@/lib/audit"
import { z } from "zod"
import { SignJWT, jwtVerify } from "jose"

const PROFESSIONAL_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ?? "changeme-professional-secret"
)
const COOKIE_NAME = "professional_token"

// ── Register a professional user ──────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  profession: z.string().min(1, "Profession required"),
  gmcNumber: z.string().optional(),
  phone: z.string().optional(),
})

export async function registerProfessional(input: z.infer<typeof registerSchema>) {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const existing = await prisma.professionalUser.findUnique({
    where: { email: parsed.data.email },
  })
  if (existing) return { error: "An account with this email already exists" }

  const hash = await bcrypt.hash(parsed.data.password, 12)
  const professional = await prisma.professionalUser.create({
    data: {
      email: parsed.data.email,
      passwordHash: hash,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      profession: parsed.data.profession,
      gmcNumber: parsed.data.gmcNumber ?? null,
      phone: parsed.data.phone ?? null,
    },
  })

  return { professionalId: professional.id }
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function loginProfessional(email: string, password: string) {
  const professional = await prisma.professionalUser.findUnique({
    where: { email },
  })
  if (!professional) return { error: "Invalid email or password" }

  const valid = await bcrypt.compare(password, professional.passwordHash)
  if (!valid) return { error: "Invalid email or password" }

  // Issue a JWT
  const token = await new SignJWT({
    sub: professional.id,
    email: professional.email,
    firstName: professional.firstName,
    lastName: professional.lastName,
    profession: professional.profession,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(PROFESSIONAL_SECRET)

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/professional",
  })

  return { success: true }
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logoutProfessional() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  return { success: true }
}

// ── Get current professional from cookie ─────────────────────────────────────

export async function getProfessionalSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, PROFESSIONAL_SECRET)
    return {
      id: payload.sub as string,
      email: payload.email as string,
      firstName: payload.firstName as string,
      lastName: payload.lastName as string,
      profession: payload.profession as string,
    }
  } catch {
    return null
  }
}

// ── Get accessible residents for a professional ───────────────────────────────

export async function getMyProfessionalAccess() {
  const prof = await getProfessionalSession()
  if (!prof) return { error: "Unauthorised" }

  const now = new Date()
  const accesses = await prisma.professionalAccess.findMany({
    where: {
      professionalId: prof.id,
      isRevoked: false,
      expiresAt: { gt: now },
    },
    include: {
      resident: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          preferredName: true,
          dateOfBirth: true,
          nhsNumber: true,
          organisationId: true,
          organisation: { select: { name: true } },
        },
      },
    },
    orderBy: { expiresAt: "asc" },
  })

  return { accesses }
}

// ── Get a single resident's data (professional-scoped) ───────────────────────

export async function getProfessionalResidentView(residentId: string) {
  const prof = await getProfessionalSession()
  if (!prof) return { error: "Unauthorised" }

  const now = new Date()
  const access = await prisma.professionalAccess.findFirst({
    where: {
      professionalId: prof.id,
      residentId,
      isRevoked: false,
      expiresAt: { gt: now },
    },
  })
  if (!access) return { error: "No active access to this resident" }

  const [resident, medicalHistory, careNotes, carePlans] = await Promise.all([
    prisma.resident.findUnique({
      where: { id: residentId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        preferredName: true,
        dateOfBirth: true,
        nhsNumber: true,
        organisationId: true,
        gpName: true,
        gpPractice: true,
        dnacprInPlace: true,
        mentalCapacity: true,
      },
    }),
    prisma.residentMedical.findUnique({
      where: { residentId },
      select: { diagnoses: true, allergies: true, currentMedications: true },
    }),
    prisma.careNote.findMany({
      where: { residentId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        content: true,
        category: true,
        createdAt: true,
        author: { select: { firstName: true, lastName: true, role: true } },
      },
    }),
    prisma.carePlan.findMany({
      where: { residentId, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, category: true, updatedAt: true, status: true },
    }),
  ])

  if (!resident) return { error: "Resident not found" }

  // Log audit
  await logAudit({
    organisationId: access.organisationId,
    userId: prof.id,
    action: "PROFESSIONAL_VIEWED_RESIDENT",
    entityType: "Resident",
    entityId: residentId,
    after: { professionalId: prof.id, profession: prof.profession },
  })

  return { resident: { ...resident, ...medicalHistory }, careNotes, carePlans, accessType: access.accessType }
}

// ── Grant professional access (staff-side) ───────────────────────────────────

const grantSchema = z.object({
  professionalEmail: z.string().email("Invalid email"),
  residentId: z.string().min(1, "Resident required"),
  accessType: z.enum(["READ_ONLY", "COMMENT"]),
  durationDays: z.number().min(1).max(90),
})

export async function grantProfessionalAccess(input: z.infer<typeof grantSchema>) {
  const session = await auth()
  const user = session?.user as any
  if (!user || !["ADMIN", "MANAGER"].includes(user.role)) return { error: "Unauthorised" }

  const parsed = grantSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const professional = await prisma.professionalUser.findUnique({
    where: { email: parsed.data.professionalEmail },
  })
  if (!professional) return { error: "No professional account found with that email. They must register first." }

  // Check resident belongs to this org
  const resident = await prisma.resident.findFirst({
    where: { id: parsed.data.residentId, organisationId: user.organisationId },
  })
  if (!resident) return { error: "Resident not found" }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + parsed.data.durationDays)

  // Revoke any existing active access for this professional + resident
  await prisma.professionalAccess.updateMany({
    where: {
      professionalId: professional.id,
      residentId: parsed.data.residentId,
      isRevoked: false,
    },
    data: { isRevoked: true, revokedAt: new Date() },
  })

  const access = await prisma.professionalAccess.create({
    data: {
      professionalId: professional.id,
      organisationId: user.organisationId,
      residentId: parsed.data.residentId,
      grantedById: user.id,
      accessType: parsed.data.accessType,
      expiresAt,
    },
  })

  await logAudit({
    organisationId: user.organisationId,
    userId: user.id,
    action: "PROFESSIONAL_ACCESS_GRANTED",
    entityType: "ProfessionalAccess",
    entityId: access.id,
    after: {
      professionalEmail: professional.email,
      residentId: parsed.data.residentId,
      expiresAt,
      accessType: parsed.data.accessType,
    },
  })

  return { access }
}

// ── Revoke professional access ────────────────────────────────────────────────

export async function revokeProfessionalAccess(accessId: string) {
  const session = await auth()
  const user = session?.user as any
  if (!user || !["ADMIN", "MANAGER"].includes(user.role)) return { error: "Unauthorised" }

  const access = await prisma.professionalAccess.findFirst({
    where: { id: accessId, organisationId: user.organisationId },
  })
  if (!access) return { error: "Access grant not found" }

  await prisma.professionalAccess.update({
    where: { id: accessId },
    data: { isRevoked: true, revokedAt: new Date() },
  })

  await logAudit({
    organisationId: user.organisationId,
    userId: user.id,
    action: "PROFESSIONAL_ACCESS_REVOKED",
    entityType: "ProfessionalAccess",
    entityId: accessId,
    after: { revokedBy: user.id },
  })

  return { success: true }
}

// ── List all active grants for this org ───────────────────────────────────────

export async function getOrgProfessionalAccesses() {
  const session = await auth()
  const user = session?.user as any
  if (!user || !["ADMIN", "MANAGER"].includes(user.role)) return { error: "Unauthorised" }

  const now = new Date()
  const accesses = await prisma.professionalAccess.findMany({
    where: { organisationId: user.organisationId },
    include: {
      professional: { select: { id: true, firstName: true, lastName: true, email: true, profession: true } },
      resident: { select: { id: true, firstName: true, lastName: true } },
      grantedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { expiresAt: "desc" },
  })

  return {
    accesses: accesses.map((a) => ({
      ...a,
      isExpired: a.expiresAt < now,
      isActive: !a.isRevoked && a.expiresAt >= now,
    })),
  }
}
