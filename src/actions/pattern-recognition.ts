'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'
import { openai } from '@/lib/openai'
import { subDays, formatISO } from 'date-fns'

// ─────────────────────────────────────────────
// Private schemas
// ─────────────────────────────────────────────

const acknowledgeSchema = z.object({
  alertId: z.string().min(1),
  note: z.string().optional(),
})

const actionSchema = z.object({
  alertId: z.string().min(1),
  note: z.string().min(5, 'Please describe the action taken'),
})

const dismissSchema = z.object({
  alertId: z.string().min(1),
  reason: z.string().min(5, 'Please provide a reason for dismissing this alert'),
})

// ─────────────────────────────────────────────
// DATA GATHERING — 30–90 day lookback
// ─────────────────────────────────────────────

async function gatherPatternData(residentId: string) {
  const now = new Date()
  const d30 = subDays(now, 30)
  const d90 = subDays(now, 90)

  const [
    resident,
    careNotes,
    incidents,
    bodyMapEntries,
    administrations,
    riskProfile,
    wellbeingUpdates,
  ] = await Promise.all([
    prisma.resident.findUnique({
      where: { id: residentId },
      include: { medicalHistory: true },
    }),
    prisma.careNote.findMany({
      where: { residentId, createdAt: { gte: d90 } },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    prisma.incident.findMany({
      where: { residentId, occurredAt: { gte: d90 } },
      orderBy: { occurredAt: 'desc' },
      include: { followUps: true },
    }),
    prisma.bodyMapEntry.findMany({
      where: { residentId, createdAt: { gte: d90 } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.medicationAdministration.findMany({
      where: {
        residentId,
        scheduledTime: { gte: d30 },
        status: { in: ['OMITTED', 'REFUSED'] },
      },
      include: { medication: true },
      take: 30,
    }),
    prisma.riskProfile.findUnique({
      where: { residentId },
      include: { factors: { where: { resolvedAt: null } } },
    }),
    prisma.wellbeingUpdate.findMany({
      where: { residentId, createdAt: { gte: d30 } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  return {
    resident,
    careNotes,
    incidents,
    bodyMapEntries,
    administrations,
    riskProfile,
    wellbeingUpdates,
    periodFrom: d90,
    periodTo: now,
  }
}

// ─────────────────────────────────────────────
// AI ANALYSIS
// ─────────────────────────────────────────────

interface EvidenceItem {
  date: string
  source: string
  detail: string
}

interface PatternAlertResult {
  category: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  description: string
  evidence: EvidenceItem[]
  recommendation: string
}

async function analyseResidentPatterns(
  residentId: string,
  organisationId: string
): Promise<PatternAlertResult[]> {
  const data = await gatherPatternData(residentId)
  if (!data.resident) return []

  const residentName = `${data.resident.firstName} ${data.resident.lastName}`
  const periodLabel = `${formatISO(data.periodFrom, { representation: 'date' })} to ${formatISO(data.periodTo, { representation: 'date' })}`

  const contextSummary = {
    resident: {
      name: residentName,
      dob: data.resident.dateOfBirth,
      conditions: data.resident.medicalHistory?.diagnoses || [],
    },
    period: periodLabel,
    careNotesSummary: {
      total: data.careNotes.length,
      categories: countBy(data.careNotes, 'category'),
      recentNotes: data.careNotes.slice(0, 10).map((n) => ({
        date: formatISO(n.createdAt, { representation: 'date' }),
        category: n.category,
        excerpt: n.content.slice(0, 200),
      })),
    },
    incidents: data.incidents.map((i) => ({
      date: formatISO(i.occurredAt, { representation: 'date' }),
      type: i.type,
      severity: i.severity,
      description: i.description.slice(0, 200),
      followUpCount: i.followUps.length,
    })),
    bodyMapEntries: data.bodyMapEntries.map((b) => ({
      date: formatISO(b.createdAt, { representation: 'date' }),
      area: b.bodyRegion,
      type: b.type,
      severity: b.severity,
      resolved: b.isResolved,
    })),
    missedDoses: data.administrations.map((a) => ({
      date: formatISO(a.scheduledTime, { representation: 'date' }),
      medication: a.medication.name,
      status: a.status,
      reason: a.outcome,
    })),
    wellbeingTrend: data.wellbeingUpdates.slice(0, 10).map((w) => ({
      date: formatISO(w.createdAt, { representation: 'date' }),
      mood: w.mood,
      appetite: w.appetite,
      sleep: w.sleep,
      activityLevel: w.activityLevel,
    })),
    currentRisks: data.riskProfile?.factors.map((f) => ({
      domain: f.domain,
      description: f.description,
      weight: f.weight,
    })) || [],
  }

  const systemPrompt = `You are a senior clinical analyst specialising in care home resident safety and wellbeing. 
Your role is to analyse resident data over the past 30–90 days and identify meaningful clinical patterns, trends, and emerging risks.

You must:
- Focus on patterns that require clinical attention (not one-off events)
- Be specific and evidence-based — cite dates and data points
- Identify trends across multiple data sources (care notes + incidents + medication + body map + wellbeing)
- Classify severity honestly: LOW (monitor), MEDIUM (review needed), HIGH (urgent review), CRITICAL (immediate action)
- Avoid false positives — only flag genuine patterns
- Use plain English that care home managers can act on

Categories you may identify:
- FALLS: Falling pattern, near-misses, post-fall care
- NUTRITION: Weight loss trend, poor appetite, refusal to eat, MUST score concerns
- BEHAVIOUR: Agitation, low mood, social withdrawal, distress patterns
- MEDICATION: Refusal pattern, missed doses, PRN overuse
- SKIN: Pressure ulcer development, wound deterioration
- CLINICAL: Deteriorating health trend, infection signs, pain indicators
- SOCIAL: Family contact decrease, activity withdrawal, safeguarding indicators

Output ONLY valid JSON — an array of pattern alerts. If no meaningful patterns found, return an empty array [].`

  const userPrompt = `Analyse the following resident data and identify clinical patterns. 
Return a JSON array of pattern alerts.

Resident data:
${JSON.stringify(contextSummary, null, 2)}

Required JSON format for each alert:
{
  "category": "FALLS|NUTRITION|BEHAVIOUR|MEDICATION|SKIN|CLINICAL|SOCIAL",
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "title": "concise alert title (max 60 chars)",
  "description": "2-3 sentence explanation of the pattern and why it's concerning",
  "evidence": [
    {"date": "YYYY-MM-DD", "source": "CareNote|Incident|BodyMap|Medication|Wellbeing", "detail": "brief evidence detail"}
  ],
  "recommendation": "specific recommended action (1-2 sentences)"
}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 2000,
  })

  const raw = response.choices[0].message.content || '{}'
  const parsed = JSON.parse(raw)
  const alerts: PatternAlertResult[] = Array.isArray(parsed)
    ? parsed
    : parsed.alerts || parsed.patterns || []

  return alerts
}

function countBy<T>(arr: T[], key: keyof T): Record<string, number> {
  return arr.reduce(
    (acc, item) => {
      const val = String(item[key])
      acc[val] = (acc[val] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
}

// ─────────────────────────────────────────────
// SERVER ACTIONS
// ─────────────────────────────────────────────

export async function runResidentPatternAnalysis(residentId: string) {
  const session = await getServerSession()
  if (!session) return { error: 'Unauthorised' }
  const user = session.user as any
  if (!['MANAGER', 'ADMIN'].includes(user.role)) return { error: 'Unauthorised' }

  const resident = await prisma.resident.findFirst({
    where: { id: residentId, organisationId: user.organisationId },
  })
  if (!resident) return { error: 'Resident not found' }

  const alerts = await analyseResidentPatterns(residentId, user.organisationId)

  const now = new Date()
  const d90 = subDays(now, 90)

  // Remove existing OPEN alerts for this resident before adding new ones
  await prisma.patternAlert.updateMany({
    where: { residentId, status: 'OPEN' },
    data: { status: 'CLOSED' },
  })

  for (const alert of alerts) {
    await prisma.patternAlert.create({
      data: {
        residentId,
        organisationId: user.organisationId,
        severity: alert.severity,
        category: alert.category,
        title: alert.title,
        description: alert.description,
        evidence: alert.evidence as any,
        recommendation: alert.recommendation,
        periodFrom: d90,
        periodTo: now,
      },
    })
  }

  await logAudit({
    organisationId: user.organisationId,
    userId: user.id,
    action: 'PATTERN_ANALYSIS_RUN',
    entityType: 'Resident',
    entityId: residentId,
    after: { alertCount: alerts.length },
  })

  revalidatePath(`/residents/${residentId}`)
  revalidatePath('/pattern-alerts')
  return { success: true, alertCount: alerts.length }
}

export async function runOrgPatternAnalysis(organisationId: string) {
  const residents = await prisma.resident.findMany({
    where: { organisationId, status: 'ADMITTED', deletedAt: null },
    select: { id: true },
  })

  let total = 0
  for (const r of residents) {
    const alerts = await analyseResidentPatterns(r.id, organisationId)
    const now = new Date()
    const d90 = subDays(now, 90)

    await prisma.patternAlert.updateMany({
      where: { residentId: r.id, status: 'OPEN' },
      data: { status: 'CLOSED' },
    })

    for (const alert of alerts) {
      await prisma.patternAlert.create({
        data: {
          residentId: r.id,
          organisationId,
          severity: alert.severity,
          category: alert.category,
          title: alert.title,
          description: alert.description,
          evidence: alert.evidence as any,
          recommendation: alert.recommendation,
          periodFrom: d90,
          periodTo: now,
        },
      })
      total++
    }
  }

  return { success: true, total }
}

export async function getPatternAlerts(filters?: {
  status?: string
  severity?: string
  category?: string
}) {
  const session = await getServerSession()
  if (!session) return { error: 'Unauthorised' }
  const user = session.user as any

  const where: Record<string, unknown> = {
    organisationId: user.organisationId,
  }
  if (filters?.status) where.status = filters.status
  if (filters?.severity) where.severity = filters.severity
  if (filters?.category) where.category = filters.category

  const alerts = await prisma.patternAlert.findMany({
    where,
    include: {
      resident: {
        select: { id: true, firstName: true, lastName: true, roomNumber: true, photoUrl: true },
      },
    },
    orderBy: [
      { severity: 'desc' },
      { createdAt: 'desc' },
    ],
  })

  return { alerts }
}

export async function getResidentPatternAlerts(residentId: string) {
  const session = await getServerSession()
  if (!session) return { error: 'Unauthorised' }
  const user = session.user as any

  const alerts = await prisma.patternAlert.findMany({
    where: {
      residentId,
      organisationId: user.organisationId,
    },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
  })

  return { alerts }
}

export async function acknowledgePatternAlert(data: z.infer<typeof acknowledgeSchema>) {
  const session = await getServerSession()
  if (!session) return { error: 'Unauthorised' }
  const user = session.user as any
  if (!['MANAGER', 'ADMIN', 'SENIOR_CARER'].includes(user.role)) return { error: 'Unauthorised' }

  const parsed = acknowledgeSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const alert = await prisma.patternAlert.findFirst({
    where: { id: parsed.data.alertId, organisationId: user.organisationId },
  })
  if (!alert) return { error: 'Alert not found' }

  await prisma.patternAlert.update({
    where: { id: parsed.data.alertId },
    data: {
      status: 'ACKNOWLEDGED',
      acknowledgedById: user.id,
      acknowledgedAt: new Date(),
      actionNote: parsed.data.note,
    },
  })

  await logAudit({
    organisationId: user.organisationId,
    userId: user.id,
    action: 'PATTERN_ALERT_ACKNOWLEDGED',
    entityType: 'PatternAlert',
    entityId: parsed.data.alertId,
  })

  revalidatePath('/pattern-alerts')
  revalidatePath(`/residents/${alert.residentId}`)
  return { success: true }
}

export async function addPatternAlertAction(data: z.infer<typeof actionSchema>) {
  const session = await getServerSession()
  if (!session) return { error: 'Unauthorised' }
  const user = session.user as any
  if (!['MANAGER', 'ADMIN', 'SENIOR_CARER'].includes(user.role)) return { error: 'Unauthorised' }

  const parsed = actionSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const alert = await prisma.patternAlert.findFirst({
    where: { id: parsed.data.alertId, organisationId: user.organisationId },
  })
  if (!alert) return { error: 'Alert not found' }

  await prisma.patternAlert.update({
    where: { id: parsed.data.alertId },
    data: {
      status: 'ACTION_TAKEN',
      actionNote: parsed.data.note,
    },
  })

  await logAudit({
    organisationId: user.organisationId,
    userId: user.id,
    action: 'PATTERN_ALERT_ACTION_TAKEN',
    entityType: 'PatternAlert',
    entityId: parsed.data.alertId,
    after: { note: parsed.data.note },
  })

  revalidatePath('/pattern-alerts')
  revalidatePath(`/residents/${alert.residentId}`)
  return { success: true }
}

export async function dismissPatternAlert(data: z.infer<typeof dismissSchema>) {
  const session = await getServerSession()
  if (!session) return { error: 'Unauthorised' }
  const user = session.user as any
  if (!['MANAGER', 'ADMIN'].includes(user.role)) return { error: 'Unauthorised' }

  const parsed = dismissSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const alert = await prisma.patternAlert.findFirst({
    where: { id: parsed.data.alertId, organisationId: user.organisationId },
  })
  if (!alert) return { error: 'Alert not found' }

  await prisma.patternAlert.update({
    where: { id: parsed.data.alertId },
    data: {
      status: 'DISMISSED',
      dismissReason: parsed.data.reason,
    },
  })

  await logAudit({
    organisationId: user.organisationId,
    userId: user.id,
    action: 'PATTERN_ALERT_DISMISSED',
    entityType: 'PatternAlert',
    entityId: parsed.data.alertId,
    after: { reason: parsed.data.reason },
  })

  revalidatePath('/pattern-alerts')
  revalidatePath(`/residents/${alert.residentId}`)
  return { success: true }
}
