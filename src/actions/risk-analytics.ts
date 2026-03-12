'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'
import { openai } from '@/lib/openai'
import { createNotification } from '@/actions/notifications'
import { subDays, startOfMonth } from 'date-fns'
import {
  scoreFallRisk,
  scorePressureUlcerRisk,
  scoreMedicationRisk,
  scoreSafeguardingRisk,
  calculateCombinedScore,
  type ResidentRiskData,
} from '@/lib/risk/scoring-engine'

// ─────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────

const acknowledgeRiskSchema = z.object({
  residentId: z.string().min(1),
  domain: z.enum(['FALLS', 'PRESSURE_ULCER', 'MEDICATION', 'SAFEGUARDING']),
  notes: z.string().min(5, 'Please provide a reason for acknowledging this risk'),
})

// ─────────────────────────────────────────────
// DATA GATHERING (18.3)
// ─────────────────────────────────────────────

async function gatherResidentRiskData(
  residentId: string,
  organisationId: string
): Promise<ResidentRiskData> {
  const now = new Date()
  const d30 = subDays(now, 30)
  const d7 = subDays(now, 7)
  const d90 = subDays(now, 90)
  const prevMonthStart = startOfMonth(subDays(now, 30))
  const thisMonthStart = startOfMonth(now)

  const [
    resident,
    fallIncidents30,
    fallIncidents7,
    safeguardingIncidents90,
    unwitnessedIncidents30,
    bodyMapEntries,
    latestAssessment,
    medications,
    administrations30,
    incidentsThisMonth,
    incidentsPrevMonth,
  ] = await Promise.all([
    prisma.resident.findUnique({
      where: { id: residentId },
      include: { medicalHistory: true },
    }),
    prisma.incident.count({
      where: { residentId, organisationId, type: 'FALL', occurredAt: { gte: d30 }, deletedAt: null },
    }),
    prisma.incident.count({
      where: { residentId, organisationId, type: 'FALL', occurredAt: { gte: d7 }, deletedAt: null },
    }),
    prisma.incident.count({
      where: { residentId, organisationId, type: 'SAFEGUARDING', occurredAt: { gte: d90 }, deletedAt: null },
    }),
    prisma.incident.count({
      where: {
        residentId, organisationId,
        occurredAt: { gte: d30 },
        witnesses: null,
        deletedAt: null,
      },
    }),
    prisma.bodyMapEntry.findMany({
      where: { residentId, isResolved: false, deletedAt: null },
    }),
    prisma.residentAssessment.findFirst({
      where: { residentId, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      include: {
        domains: true,
      },
    }),
    prisma.medication.findMany({
      where: { residentId, organisationId, isActive: true, deletedAt: null },
    }),
    prisma.medicationAdministration.findMany({
      where: { residentId, organisationId, scheduledTime: { gte: d30 } },
      select: { status: true },
    }),
    prisma.incident.count({
      where: { residentId, organisationId, occurredAt: { gte: thisMonthStart }, deletedAt: null },
    }),
    prisma.incident.count({
      where: {
        residentId, organisationId,
        occurredAt: { gte: prevMonthStart, lt: thisMonthStart },
        deletedAt: null,
      },
    }),
  ])

  // Extract assessment scores from domains JSON content
  let waterlowScore = 0
  let waterlowMobilityScore = 0
  let mustScore = 0

  if (latestAssessment) {
    const waterlowDomain = latestAssessment.domains.find(d => d.domainType === 'WATERLOW')
    const mustDomain = latestAssessment.domains.find(d => d.domainType === 'MUST_NUTRITIONAL')

    if (waterlowDomain?.content) {
      const content = waterlowDomain.content as Record<string, unknown>
      waterlowScore = Number(content.totalScore ?? 0)
      waterlowMobilityScore = Number(content.mobility ?? 0)
    }
    if (mustDomain?.content) {
      const content = mustDomain.content as Record<string, unknown>
      mustScore = Number(content.totalScore ?? 0)
    }
  }

  // Medication stats
  const activeCount = medications.length
  const controlledCount = medications.filter(m => m.isControlled).length
  const hasSedativePRN = medications.some(
    m => m.isPRN && (
      m.name.toLowerCase().includes('lorazepam') ||
      m.name.toLowerCase().includes('diazepam') ||
      m.name.toLowerCase().includes('zopiclone') ||
      m.name.toLowerCase().includes('haloperidol') ||
      m.name.toLowerCase().includes('quetiapine') ||
      m.prnIndication?.toLowerCase().includes('anxiety') ||
      m.prnIndication?.toLowerCase().includes('agitation') ||
      m.prnIndication?.toLowerCase().includes('sleep')
    )
  )

  const missedDoses = administrations30.filter(a => a.status === 'OMITTED' || a.status === 'NOT_AVAILABLE').length
  const totalDoses = administrations30.length

  // Body map analysis
  const unexplainedEntries = bodyMapEntries.filter(b =>
    b.type === 'BRUISE' || b.type === 'NEW_MARK'
  ).length

  const hasSkinConcerns = bodyMapEntries.some(
    b => b.type === 'PRESSURE_DAMAGE' || b.type === 'WOUND' || b.type === 'SKIN_TEAR'
  )

  return {
    fallIncidents30Days: fallIncidents30,
    fallIncidents7Days: fallIncidents7,
    mobilityLevel: resident?.medicalHistory?.mobilityLevel ?? 'INDEPENDENT',
    waterlowMobilityScore,
    hasSedativePRN,
    environmentRiskNotes: '',
    waterlowOverallScore: waterlowScore,
    mustScore,
    continenceLevel: resident?.medicalHistory?.continenceLevel ?? 'CONTINENT',
    activeBodyMapEntries: bodyMapEntries.filter(
      b => b.type === 'PRESSURE_DAMAGE' || b.type === 'SKIN_TEAR' || b.type === 'WOUND'
    ).length,
    hasSkinIntegrityConcerns: hasSkinConcerns,
    activeMedicationCount: activeCount,
    missedDosesLast30Days: missedDoses,
    totalDosesLast30Days: totalDoses,
    controlledDrugCount: controlledCount,
    unexplainedBodyMapEntries: unexplainedEntries,
    unwitnessedIncidents30Days: unwitnessedIncidents30,
    safeguardingIncidents90Days: safeguardingIncidents90,
    incidentFrequencyRising: incidentsThisMonth > incidentsPrevMonth + 1,
  }
}

// ─────────────────────────────────────────────
// AI RECOMMENDATIONS (18.8)
// ─────────────────────────────────────────────

async function generateAIRecommendations(
  residentName: string,
  riskData: ResidentRiskData,
  fallScore: number,
  pressureScore: number,
  medicationScore: number,
  safeguardingScore: number
): Promise<string> {
  const activeFactors: string[] = []

  if (fallScore >= 34) activeFactors.push(`Falls risk score: ${fallScore}/100`)
  if (pressureScore >= 34) activeFactors.push(`Pressure ulcer risk score: ${pressureScore}/100`)
  if (medicationScore >= 34) activeFactors.push(`Medication risk score: ${medicationScore}/100`)
  if (safeguardingScore >= 34) activeFactors.push(`Safeguarding risk score: ${safeguardingScore}/100`)

  if (riskData.fallIncidents30Days > 0) activeFactors.push(`${riskData.fallIncidents30Days} falls in past 30 days`)
  if (riskData.activeMedicationCount >= 5) activeFactors.push(`Polypharmacy: ${riskData.activeMedicationCount} medications`)
  if (riskData.activeBodyMapEntries > 0) activeFactors.push(`${riskData.activeBodyMapEntries} active pressure/skin concern(s)`)
  if (riskData.safeguardingIncidents90Days > 0) activeFactors.push(`${riskData.safeguardingIncidents90Days} safeguarding incident(s) in 90 days`)

  if (activeFactors.length === 0) {
    return 'No significant risk factors identified at this time. Continue routine monitoring.'
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a senior care quality advisor in a UK registered care home. 
Based on active risk factors, provide 3–5 specific, actionable recommendations to reduce identified risks.
Requirements:
- Plain language understandable to care staff
- Each recommendation should be concrete and implementable immediately
- Reference CQC Safe domain requirements where relevant
- Do NOT speculate beyond the data provided
- Format as a numbered list only — no markdown headers`,
        },
        {
          role: 'user',
          content: `Resident: ${residentName}\n\nActive risk factors:\n${activeFactors.map(f => `- ${f}`).join('\n')}\n\nProvide 3–5 specific risk reduction recommendations.`,
        },
      ],
      temperature: 0.4,
      max_tokens: 400,
    })
    return completion.choices[0].message.content ?? 'Unable to generate recommendations at this time.'
  } catch {
    // OpenAI unavailable — return a rule-based summary instead
    return activeFactors.map((f, i) => `${i + 1}. Review and address: ${f}`).join('\n')
  }
}

// ─────────────────────────────────────────────
// CALCULATE RISK FOR ONE RESIDENT (18.9)
// ─────────────────────────────────────────────

export async function calculateResidentRisk(residentId: string, organisationId: string) {
  const resident = await prisma.resident.findFirst({
    where: { id: residentId, organisationId },
    select: { id: true, firstName: true, lastName: true },
  })
  if (!resident) throw new Error('Resident not found')

  const riskData = await gatherResidentRiskData(residentId, organisationId)

  const fallResult = scoreFallRisk(riskData)
  const pressureResult = scorePressureUlcerRisk(riskData)
  const medicationResult = scoreMedicationRisk(riskData)
  const safeguardingResult = scoreSafeguardingRisk(riskData)
  const { combinedScore, level: overallLevel } = calculateCombinedScore(
    fallResult.score,
    pressureResult.score,
    medicationResult.score,
    safeguardingResult.score
  )

  const aiRecommendations = await generateAIRecommendations(
    `${resident.firstName} ${resident.lastName}`,
    riskData,
    fallResult.score,
    pressureResult.score,
    medicationResult.score,
    safeguardingResult.score
  )

  // Upsert risk profile
  const riskProfile = await prisma.riskProfile.upsert({
    where: { residentId },
    create: {
      residentId,
      organisationId,
      fallScore: fallResult.score,
      pressureUlcerScore: pressureResult.score,
      medicationScore: medicationResult.score,
      safeguardingScore: safeguardingResult.score,
      combinedScore,
      fallRiskLevel: fallResult.level,
      pressureUlcerRiskLevel: pressureResult.level,
      medicationRiskLevel: medicationResult.level,
      safeguardingRiskLevel: safeguardingResult.level,
      overallRiskLevel: overallLevel,
      aiRecommendations,
      lastCalculatedAt: new Date(),
    },
    update: {
      fallScore: fallResult.score,
      pressureUlcerScore: pressureResult.score,
      medicationScore: medicationResult.score,
      safeguardingScore: safeguardingResult.score,
      combinedScore,
      fallRiskLevel: fallResult.level,
      pressureUlcerRiskLevel: pressureResult.level,
      medicationRiskLevel: medicationResult.level,
      safeguardingRiskLevel: safeguardingResult.level,
      overallRiskLevel: overallLevel,
      aiRecommendations,
      lastCalculatedAt: new Date(),
    },
  })

  // Delete and recreate risk factors
  await prisma.riskFactor.deleteMany({ where: { riskProfileId: riskProfile.id } })

  const allFactors = [
    ...fallResult.factors,
    ...pressureResult.factors,
    ...medicationResult.factors,
    ...safeguardingResult.factors,
  ]

  if (allFactors.length > 0) {
    await prisma.riskFactor.createMany({
      data: allFactors.map(f => ({
        riskProfileId: riskProfile.id,
        domain: f.domain,
        description: f.description,
        weight: f.weight,
      })),
    })
  }

  // 18.12 — Alert managers if HIGH risk
  if (['HIGH', 'VERY_HIGH'].includes(overallLevel)) {
    await createNotification({
      organisationId,
      type: 'HIGH_RISK_SCORE',
      title: `High Risk Alert — ${resident.firstName} ${resident.lastName}`,
      body: `Risk score: ${combinedScore}/100 (${overallLevel}). Immediate review recommended.`,
      entityType: 'RiskProfile',
      entityId: riskProfile.id,
    })
  }

  return riskProfile
}

// ─────────────────────────────────────────────
// ORG-WIDE RISK DASHBOARD (18.10)
// ─────────────────────────────────────────────

export async function getOrgRiskDashboard() {
  const session = await getServerSession()
  const user = session.user as any
  if (!['MANAGER', 'ADMIN'].includes(user.role)) throw new Error('Manager access required')

  return prisma.riskProfile.findMany({
    where: { organisationId: user.organisationId },
    include: {
      resident: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          roomNumber: true,
          status: true,
        },
      },
      factors: { where: { isResolved: false }, orderBy: { weight: 'desc' } },
    },
    orderBy: { combinedScore: 'desc' },
  })
}

export async function getResidentRiskProfile(residentId: string) {
  const session = await getServerSession()
  const user = session.user as any

  const profile = await prisma.riskProfile.findFirst({
    where: { residentId, organisationId: user.organisationId },
    include: {
      factors: { where: { isResolved: false }, orderBy: { weight: 'desc' } },
      resident: { select: { firstName: true, lastName: true } },
    },
  })

  // Auto-calculate if no profile yet
  if (!profile) {
    return calculateResidentRisk(residentId, user.organisationId)
  }

  return profile
}

// ─────────────────────────────────────────────
// ACKNOWLEDGE RISK (18.13, 18.14)
// ─────────────────────────────────────────────

export async function acknowledgeRisk(data: z.infer<typeof acknowledgeRiskSchema>) {
  const session = await getServerSession()
  const user = session.user as any

  const validated = acknowledgeRiskSchema.parse(data)

  await prisma.riskAcknowledgement.create({
    data: {
      residentId: validated.residentId,
      organisationId: user.organisationId,
      acknowledgedById: user.id,
      domain: validated.domain,
      notes: validated.notes,
    },
  })

  await logAudit({
    organisationId: user.organisationId,
    userId: user.id,
    action: 'CREATE',
    entityType: 'RiskAcknowledgement',
    entityId: validated.residentId,
    after: { domain: validated.domain, notes: validated.notes },
  })

  revalidatePath(`/residents/${validated.residentId}`)
  revalidatePath('/risk-analytics')
  return { success: true }
}

// ─────────────────────────────────────────────
// CRON JOB HANDLER (18.9) — called by /api/cron/risk-analysis
// ─────────────────────────────────────────────

export async function runOrgRiskAnalysis(organisationId: string) {
  const residents = await prisma.resident.findMany({
    where: { organisationId, status: 'ADMITTED', deletedAt: null },
    select: { id: true },
  })

  const results = []
  for (const resident of residents) {
    try {
      const profile = await calculateResidentRisk(resident.id, organisationId)
      results.push({ residentId: resident.id, success: true, score: profile.combinedScore })
    } catch (err) {
      results.push({ residentId: resident.id, success: false, error: String(err) })
    }
  }

  return results
}

// ─────────────────────────────────────────────
// TRIGGER RISK CALCULATION FROM UI
// ─────────────────────────────────────────────

export async function triggerAllRiskCalculations() {
  const session = await getServerSession()
  const user = session.user as any
  if (!['MANAGER', 'ADMIN'].includes(user.role)) throw new Error('Manager access required')

  return runOrgRiskAnalysis(user.organisationId)
}
