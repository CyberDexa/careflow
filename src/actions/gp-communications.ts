'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'
import { openai } from '@/lib/openai'
import { createNotification } from '@/actions/notifications'

// ─────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────

const gpCommunicationSchema = z.object({
  residentId: z.string().min(1),
  type: z.enum([
    'PRESCRIPTION_REQUEST',
    'CLINICAL_CONCERN',
    'MEDICATION_REVIEW',
    'URGENT_REFERRAL',
    'ROUTINE_UPDATE',
    'OTHER',
  ]),
  subject: z.string().min(1, 'Subject is required'),
  context: z.string().min(10, 'Please provide context for the AI to draft from'),
  followUpDate: z.string().optional(),
  recipientEmail: z.string().email().optional().or(z.literal('')),
})

const approveGPCommunicationSchema = z.object({
  id: z.string().min(1),
  finalContent: z.string().min(10, 'Communication content cannot be empty'),
})

// ─────────────────────────────────────────────
// AI Prompts
// ─────────────────────────────────────────────

const PRESCRIPTION_REQUEST_SYSTEM_PROMPT = `You are a senior care home manager drafting a formal prescription request letter to a GP surgery on behalf of a UK registered care home.

Write in professional NHS-aligned language. Structure the letter as follows:
1. Opening: Resident's full name, NHS number (if provided), DOB, care home name
2. Purpose: Clear statement of what is being requested and why
3. Clinical context: Relevant medical history, current condition, previous medications tried
4. Specific request: Exact medication, dose, frequency, and duration required
5. Urgency: If urgent, state clearly why
6. Closing: Care home contact details, who to respond to

Requirements:
- Use UK spelling and terminology throughout
- Reference relevant clinical guidelines where appropriate
- Be clear, concise, and professional
- Do NOT include any speculative or unsupported clinical claims
- Output plain text only — no markdown`

const CLINICAL_CONCERN_SYSTEM_PROMPT = `You are a senior care home manager drafting a clinical concern communication to a GP surgery in the UK.

Write in professional NHS-aligned language. Structure as follows:
1. Opening: Resident details and reason for contact
2. Clinical presentation: What has been observed, when, by whom
3. Relevant history: Pertinent medical/medication history
4. Risk assessment: What risks have been identified
5. What action is being requested: Specific ask (visit, phone review, medication change, referral)
6. Urgency: LOW / MEDIUM / HIGH / URGENT — with justification
7. Closing: Contact details, availability

Requirements:
- UK spelling and clinical terminology
- Reference NICE guidelines or CQC standards where relevant
- Factual and evidence-based — only include observed data
- Output plain text only — no markdown`

const MEDICATION_REVIEW_SYSTEM_PROMPT = `You are a senior care home manager requesting a formal medication review for a resident at a UK registered care home.

Write a professional letter to the GP surgery including:
1. Resident details and reason for review request
2. Current medication list and any concerns (polypharmacy, side effects, effectiveness)
3. Recent clinical observations relevant to medication management
4. Specific questions or areas for the GP to address
5. Any relevant recent test results or assessments (Waterlow, MUST, etc.)
6. Closing with contact details

Requirements:
- UK spelling, professional tone
- Highlight safety concerns clearly
- Output plain text only — no markdown`

// ─────────────────────────────────────────────
// Generate AI Draft
// ─────────────────────────────────────────────

export async function generateGPCommunicationDraft(
  data: z.infer<typeof gpCommunicationSchema>
) {
  const session = await getServerSession()
  const user = session.user as any

  const validated = gpCommunicationSchema.parse(data)

  const resident = await prisma.resident.findFirst({
    where: { id: validated.residentId, organisationId: user.organisationId },
    include: {
      medicalHistory: true,
      contacts: { where: { isPoa: true } },
    },
  })
  if (!resident) throw new Error('Resident not found')

  const org = await prisma.organisation.findUnique({
    where: { id: user.organisationId },
  })

  const systemPrompt =
    validated.type === 'PRESCRIPTION_REQUEST'
      ? PRESCRIPTION_REQUEST_SYSTEM_PROMPT
      : validated.type === 'CLINICAL_CONCERN'
        ? CLINICAL_CONCERN_SYSTEM_PROMPT
        : MEDICATION_REVIEW_SYSTEM_PROMPT

  const userPrompt = `
Resident: ${resident.firstName} ${resident.lastName}
Date of Birth: ${resident.dateOfBirth ? new Date(resident.dateOfBirth).toLocaleDateString('en-GB') : 'Not recorded'}
NHS Number: ${resident.nhsNumber ?? 'Not recorded'}
GP Practice: ${resident.gpPractice ?? 'Not recorded'}
GP Name: Dr ${resident.gpName ?? 'Not recorded'}
Care Home: ${org?.name ?? 'Care Home'}
Care Home Address: ${org?.address ?? 'Not provided'}

Current Medical Diagnoses: ${resident.medicalHistory?.diagnoses?.join(', ') ?? 'See medical notes'}
Known Allergies: ${resident.medicalHistory?.allergies?.join(', ') ?? 'No known allergies'}

Context provided by care staff:
${validated.context}

Communication type: ${validated.type.replace(/_/g, ' ')}
Subject: ${validated.subject}
Date: ${new Date().toLocaleDateString('en-GB')}
`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 800,
  })

  const aiDraft = completion.choices[0].message.content ?? ''

  const communication = await prisma.gPCommunication.create({
    data: {
      residentId: validated.residentId,
      organisationId: user.organisationId,
      authorId: user.id,
      type: validated.type,
      subject: validated.subject,
      aiDraftContent: aiDraft,
      finalContent: aiDraft,
      status: 'DRAFT',
      followUpDate: validated.followUpDate ? new Date(validated.followUpDate) : undefined,
      recipientEmail: validated.recipientEmail || undefined,
    },
  })

  await logAudit({
    organisationId: user.organisationId,
    userId: user.id,
    action: 'CREATE',
    entityType: 'GPCommunication',
    entityId: communication.id,
    after: { type: validated.type, status: 'DRAFT' },
  })

  revalidatePath(`/residents/${validated.residentId}`)
  return { success: true, communication }
}

// ─────────────────────────────────────────────
// Approval Workflow
// ─────────────────────────────────────────────

export async function submitForApproval(id: string, finalContent: string) {
  const session = await getServerSession()
  const user = session.user as any

  const comm = await prisma.gPCommunication.findFirst({
    where: { id, organisationId: user.organisationId, deletedAt: null },
    include: { resident: { select: { firstName: true, lastName: true } } },
  })
  if (!comm) throw new Error('Communication not found')

  await prisma.gPCommunication.update({
    where: { id },
    data: { finalContent, status: 'PENDING_APPROVAL' },
  })

  // Notify managers
  await createNotification({
    organisationId: user.organisationId,
    type: 'CARE_PLAN_PENDING_APPROVAL', // reuse approval type
    title: 'GP Communication Awaiting Approval',
    body: `A ${comm.type.replace(/_/g, ' ')} for ${comm.resident.firstName} ${comm.resident.lastName} needs approval before sending.`,
    entityType: 'GPCommunication',
    entityId: id,
  })

  revalidatePath(`/residents/${comm.residentId}`)
  revalidatePath('/gp-communications')
  return { success: true }
}

export async function approveGPCommunication(data: z.infer<typeof approveGPCommunicationSchema>) {
  const session = await getServerSession()
  const user = session.user as any
  if (!['MANAGER', 'ADMIN'].includes(user.role)) throw new Error('Only managers can approve GP communications')

  const validated = approveGPCommunicationSchema.parse(data)

  const comm = await prisma.gPCommunication.findFirst({
    where: { id: validated.id, organisationId: user.organisationId, deletedAt: null },
  })
  if (!comm) throw new Error('Communication not found')

  await prisma.gPCommunication.update({
    where: { id: validated.id },
    data: {
      finalContent: validated.finalContent,
      status: 'APPROVED',
      approvedById: user.id,
      approvedAt: new Date(),
    },
  })

  await logAudit({
    organisationId: user.organisationId,
    userId: user.id,
    action: 'UPDATE',
    entityType: 'GPCommunication',
    entityId: validated.id,
    after: { status: 'APPROVED' },
  })

  revalidatePath('/gp-communications')
  return { success: true }
}

export async function markGPCommunicationSent(id: string, method: string) {
  const session = await getServerSession()
  const user = session.user as any

  const comm = await prisma.gPCommunication.findFirst({
    where: { id, organisationId: user.organisationId, status: 'APPROVED' },
  })
  if (!comm) throw new Error('Communication not found or not approved')

  await prisma.gPCommunication.update({
    where: { id },
    data: { status: 'SENT', sentAt: new Date(), sentMethod: method },
  })

  revalidatePath('/gp-communications')
  revalidatePath(`/residents/${comm.residentId}`)
  return { success: true }
}

export async function recordGPResponse(id: string, notes: string) {
  const session = await getServerSession()
  const user = session.user as any

  await prisma.gPCommunication.update({
    where: { id },
    data: {
      gpResponseNotes: notes,
      followUpReceived: true,
      status: 'CLOSED',
    },
  })

  revalidatePath('/gp-communications')
  return { success: true }
}

// ─────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────

export async function getGPCommunications(residentId?: string) {
  const session = await getServerSession()
  const user = session.user as any

  return prisma.gPCommunication.findMany({
    where: {
      organisationId: user.organisationId,
      deletedAt: null,
      ...(residentId ? { residentId } : {}),
    },
    include: {
      resident: { select: { id: true, firstName: true, lastName: true, roomNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getOverdueFollowUps() {
  const session = await getServerSession()
  const user = session.user as any

  const now = new Date()
  return prisma.gPCommunication.findMany({
    where: {
      organisationId: user.organisationId,
      status: 'SENT',
      followUpDate: { lt: now },
      followUpReceived: false,
      deletedAt: null,
    },
    include: {
      resident: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { followUpDate: 'asc' },
  })
}
