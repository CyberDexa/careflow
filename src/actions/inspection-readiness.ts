'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'
import { openai } from '@/lib/openai'
import { subDays } from 'date-fns'

// ─────────────────────────────────────────────
// Private schemas
// ─────────────────────────────────────────────

const generateReportSchema = z.object({
  regulatoryBody: z.enum(['CQC', 'CARE_INSPECTORATE', 'CSSIW', 'RQIA']),
})

// ─────────────────────────────────────────────
// CQC KLOE STANDARDS (seeded if absent)
// ─────────────────────────────────────────────

const CQC_STANDARDS = [
  // SAFE
  {
    code: 'S1',
    domain: 'Safe',
    title: 'Safe systems, pathways and transitions',
    description: 'People receive safe care and treatment covering risks, incidents, and medication safety.',
    dataMapping: ['Incident', 'BodyMapEntry', 'Medication', 'MedicationAdministration', 'RiskProfile'],
    weight: 5,
  },
  {
    code: 'S2',
    domain: 'Safe',
    title: 'Safeguarding',
    description: 'People are protected from abuse and improper treatment.',
    dataMapping: ['Incident', 'CareNote', 'AuditLog'],
    weight: 5,
  },
  {
    code: 'S3',
    domain: 'Safe',
    title: 'Involving people to manage risks',
    description: 'Risk assessments involve residents and families; risks are managed proactively.',
    dataMapping: ['ResidentAssessment', 'RiskProfile', 'CarePlan'],
    weight: 4,
  },
  {
    code: 'S4',
    domain: 'Safe',
    title: 'Safe and effective staffing',
    description: 'Enough appropriately skilled staff are available at all times.',
    dataMapping: ['AuditLog', 'HandoverReport'],
    weight: 4,
  },
  // EFFECTIVE
  {
    code: 'E1',
    domain: 'Effective',
    title: 'Assessing needs',
    description: 'Peoples needs are assessed and regularly reviewed.',
    dataMapping: ['ResidentAssessment', 'AssessmentDomain'],
    weight: 5,
  },
  {
    code: 'E2',
    domain: 'Effective',
    title: 'Delivering evidence-based care',
    description: 'Care and treatment is delivered in line with best practice.',
    dataMapping: ['CarePlan', 'CarePlanVersion', 'GPCommunication'],
    weight: 5,
  },
  {
    code: 'E3',
    domain: 'Effective',
    title: 'How staff, teams and services work together',
    description: 'Staff work effectively with other services and professionals.',
    dataMapping: ['GPCommunication', 'HandoverReport', 'PrescriptionOrder'],
    weight: 4,
  },
  {
    code: 'E4',
    domain: 'Effective',
    title: 'Supporting people to live healthier lives',
    description: 'People are supported to make choices and understand their health.',
    dataMapping: ['CarePlan', 'CareNote', 'WellbeingUpdate'],
    weight: 3,
  },
  // CARING
  {
    code: 'C1',
    domain: 'Caring',
    title: 'Kindness, compassion and dignity',
    description: 'Staff treat people with kindness, respect dignity and privacy.',
    dataMapping: ['CareNote', 'WellbeingUpdate', 'FamilyMessage'],
    weight: 5,
  },
  {
    code: 'C2',
    domain: 'Caring',
    title: 'Treating people as individuals',
    description: 'Care considers people\'s personal preferences, needs and choices.',
    dataMapping: ['CarePlan', 'ResidentAssessment'],
    weight: 4,
  },
  {
    code: 'C3',
    domain: 'Caring',
    title: 'Independence, choice and control',
    description: 'People are supported to make decisions and have control over their lives.',
    dataMapping: ['CarePlan', 'CareNote'],
    weight: 4,
  },
  // RESPONSIVE
  {
    code: 'R1',
    domain: 'Responsive',
    title: 'Person-centred care',
    description: 'Care is tailored to individual needs, preferences, and goals.',
    dataMapping: ['CarePlan', 'ResidentAssessment', 'CareNote'],
    weight: 5,
  },
  {
    code: 'R2',
    domain: 'Responsive',
    title: 'Care provision, integration and continuity',
    description: 'People receive seamless, uninterrupted care across services.',
    dataMapping: ['HandoverReport', 'GPCommunication', 'CarePlan'],
    weight: 4,
  },
  {
    code: 'R3',
    domain: 'Responsive',
    title: 'Timely access to care and support',
    description: 'People can access care when they need it.',
    dataMapping: ['Incident', 'GPCommunication', 'CareNote'],
    weight: 4,
  },
  // WELL-LED
  {
    code: 'W1',
    domain: 'Well-led',
    title: 'Shared direction and culture',
    description: 'Leadership promotes a culture of openness and learning.',
    dataMapping: ['AuditLog', 'HandoverReport'],
    weight: 5,
  },
  {
    code: 'W2',
    domain: 'Well-led',
    title: 'Capable, compassionate and inclusive leaders',
    description: 'Leaders have the skills, knowledge and experience to lead effectively.',
    dataMapping: ['AuditLog'],
    weight: 4,
  },
  {
    code: 'W3',
    domain: 'Well-led',
    title: 'Freedom to speak up',
    description: 'People can speak up without fear of negative consequences.',
    dataMapping: ['AuditLog', 'Incident'],
    weight: 3,
  },
  {
    code: 'W4',
    domain: 'Well-led',
    title: 'Governance, management and sustainability',
    description: 'Systems for oversight, risk management, and improvement are robust.',
    dataMapping: ['AuditLog', 'Incident', 'RiskProfile', 'ComplianceEvidence'],
    weight: 5,
  },
]

const CARE_INSPECTORATE_STANDARDS = [
  {
    code: 'CI-Q1',
    domain: 'Quality of Care and Support',
    title: 'People experience high quality care and support',
    description: 'Outcomes for people are maximised through excellent, person-centred support.',
    dataMapping: ['CarePlan', 'CareNote', 'ResidentAssessment'],
    weight: 5,
  },
  {
    code: 'CI-Q2',
    domain: 'Quality of Care and Support',
    title: 'People\'s health and wellbeing is improved',
    description: 'Health, nutrition, wellbeing and independence are actively promoted.',
    dataMapping: ['WellbeingUpdate', 'CarePlan', 'GPCommunication', 'Medication'],
    weight: 5,
  },
  {
    code: 'CI-Q3',
    domain: 'Quality of Care and Support',
    title: 'People\'s rights are upheld',
    description: 'Rights, choices and autonomy are respected at all times.',
    dataMapping: ['CarePlan', 'CareNote', 'ResidentAssessment'],
    weight: 4,
  },
  {
    code: 'CI-E1',
    domain: 'Quality of Environment',
    title: 'People experience a high quality environment',
    description: 'The environment supports people\'s wellbeing, safety and dignity.',
    dataMapping: ['BodyMapEntry', 'Incident', 'AuditLog'],
    weight: 4,
  },
  {
    code: 'CI-S1',
    domain: 'Quality of Staffing',
    title: 'People benefit from a skilled and motivated workforce',
    description: 'Staff are appropriately qualified, trained, and supported.',
    dataMapping: ['AuditLog', 'HandoverReport'],
    weight: 5,
  },
  {
    code: 'CI-M1',
    domain: 'Quality of Management and Leadership',
    title: 'Effectively led service',
    description: 'Leadership drives continuous improvement and accountability.',
    dataMapping: ['AuditLog', 'Incident', 'RiskProfile'],
    weight: 5,
  },
  {
    code: 'CI-S2',
    domain: 'Quality of Care and Support',
    title: 'People are safe from harm and abuse',
    description: 'Effective safeguards against abuse, harm and neglect are in place.',
    dataMapping: ['Incident', 'BodyMapEntry', 'AuditLog'],
    weight: 5,
  },
  {
    code: 'CI-M2',
    domain: 'Quality of Management and Leadership',
    title: 'Continuous improvement culture',
    description: 'Lessons are learned from incidents and near-misses to drive improvement.',
    dataMapping: ['Incident', 'AuditLog', 'RiskProfile'],
    weight: 4,
  },
]

async function seedStandardsIfNeeded(regulatoryBody: 'CQC' | 'CARE_INSPECTORATE') {
  const existing = await prisma.regulatoryStandard.count({
    where: { regulatoryBody },
  })
  if (existing > 0) return

  const standards = regulatoryBody === 'CQC' ? CQC_STANDARDS : CARE_INSPECTORATE_STANDARDS

  await prisma.regulatoryStandard.createMany({
    data: standards.map((s) => ({
      regulatoryBody,
      domain: s.domain,
      code: s.code,
      title: s.title,
      description: s.description,
      dataMapping: s.dataMapping,
      weight: s.weight,
    })),
    skipDuplicates: true,
  })
}

// ─────────────────────────────────────────────
// AUTO-MAPPING ENGINE — maps CareFlow data → standards
// ─────────────────────────────────────────────

async function buildComplianceEvidence(
  organisationId: string,
  standards: { id: string; dataMapping: unknown }[]
) {
  const now = new Date()
  const d90 = subDays(now, 90)

  // Get org residents for models that lack organisationId
  const orgResidents = await prisma.resident.findMany({
    where: { organisationId, deletedAt: null },
    select: { id: true },
  })
  const orgResidentIds = orgResidents.map((r) => r.id)

  // Fetch raw evidence in parallel
  const [
    carePlans,
    careNotes,
    incidents,
    assessments,
    gpComms,
    bodyMapEntries,
    auditLogs,
    handovers,
    wellbeingUpdates,
    medications,
    riskProfiles,
  ] = await Promise.all([
    prisma.carePlan.findMany({
      where: { organisationId, status: 'ACTIVE', deletedAt: null },
      include: { resident: { select: { firstName: true, lastName: true } } },
      take: 100,
    }),
    prisma.careNote.findMany({
      where: { organisationId, createdAt: { gte: d90 } },
      include: { resident: { select: { firstName: true, lastName: true } } },
      take: 200,
    }),
    prisma.incident.findMany({
      where: { organisationId, occurredAt: { gte: d90 } },
      include: {
        resident: { select: { firstName: true, lastName: true } },
        followUps: true,
      },
      take: 100,
    }),
    prisma.residentAssessment.findMany({
      where: { residentId: { in: orgResidentIds }, status: 'APPROVED' },
      include: { resident: { select: { firstName: true, lastName: true } } },
      take: 100,
    }),
    prisma.gPCommunication.findMany({
      where: { organisationId, createdAt: { gte: d90 } },
      include: { resident: { select: { firstName: true, lastName: true } } },
      take: 50,
    }),
    prisma.bodyMapEntry.findMany({
      where: { residentId: { in: orgResidentIds }, createdAt: { gte: d90 }, deletedAt: null },
      include: { resident: { select: { firstName: true, lastName: true } } },
      take: 100,
    }),
    prisma.auditLog.findMany({
      where: { organisationId, createdAt: { gte: d90 } },
      take: 200,
    }),
    prisma.handoverReport.findMany({
      where: { organisationId, createdAt: { gte: d90 } },
      take: 50,
    }),
    prisma.wellbeingUpdate.findMany({
      where: { organisationId, createdAt: { gte: d90 } },
      include: { resident: { select: { firstName: true, lastName: true } } },
      take: 100,
    }),
    prisma.medication.findMany({
      where: { organisationId, isActive: true },
      include: { resident: { select: { firstName: true, lastName: true } } },
      take: 200,
    }),
    prisma.riskProfile.findMany({
      where: { organisationId, lastCalculatedAt: { gte: d90 } },
      include: { resident: { select: { firstName: true, lastName: true } } },
      take: 50,
    }),
  ])

  type EvidenceItem = { entityId: string; entityDate: Date; residentId: string | null; residentName: string | null; summary: string }

  // Build evidence map keyed by entity type
  const evidenceByType: Record<string, EvidenceItem[]> = {
    CarePlan: carePlans.map((r) => ({
      entityId: r.id,
      entityDate: r.createdAt,
      residentId: r.residentId,
      residentName: `${r.resident.firstName} ${r.resident.lastName}`,
      summary: `Active care plan (${r.category})`,
    })),
    CareNote: careNotes.map((r) => ({
      entityId: r.id,
      entityDate: r.createdAt,
      residentId: r.residentId,
      residentName: `${r.resident.firstName} ${r.resident.lastName}`,
      summary: `Care note (${r.category}): ${r.content.slice(0, 80)}`,
    })),
    Incident: incidents.map((r) => ({
      entityId: r.id,
      entityDate: r.occurredAt,
      residentId: r.residentId,
      residentName: `${r.resident.firstName} ${r.resident.lastName}`,
      summary: `Incident (${r.type}, ${r.severity}) — ${r.followUps.length} follow-up(s)`,
    })),
    ResidentAssessment: assessments.map((r) => ({
      entityId: r.id,
      entityDate: r.createdAt,
      residentId: r.residentId,
      residentName: `${r.resident.firstName} ${r.resident.lastName}`,
      summary: `Approved assessment: ${r.type}`,
    })),
    AssessmentDomain: assessments.map((r) => ({
      entityId: r.id,
      entityDate: r.createdAt,
      residentId: r.residentId,
      residentName: `${r.resident.firstName} ${r.resident.lastName}`,
      summary: `Assessment domain record — ${r.type}`,
    })),
    GPCommunication: gpComms.map((r) => ({
      entityId: r.id,
      entityDate: r.createdAt,
      residentId: r.residentId,
      residentName: `${r.resident.firstName} ${r.resident.lastName}`,
      summary: `GP communication (${r.type}): ${r.subject.slice(0, 80)}`,
    })),
    BodyMapEntry: bodyMapEntries.map((r) => ({
      entityId: r.id,
      entityDate: r.createdAt,
      residentId: r.residentId,
      residentName: `${r.resident.firstName} ${r.resident.lastName}`,
      summary: `Body map: ${r.bodyRegion} — ${r.type} (${r.severity})`,
    })),
    AuditLog: auditLogs.map((r) => ({
      entityId: r.id,
      entityDate: r.createdAt,
      residentId: null,
      residentName: null,
      summary: `Audit: ${r.action} on ${r.entityType}`,
    })),
    HandoverReport: handovers.map((r) => ({
      entityId: r.id,
      entityDate: r.createdAt,
      residentId: null,
      residentName: null,
      summary: `Handover report (${r.shift} shift)`,
    })),
    WellbeingUpdate: wellbeingUpdates.map((r) => ({
      entityId: r.id,
      entityDate: r.createdAt,
      residentId: r.residentId,
      residentName: `${r.resident.firstName} ${r.resident.lastName}`,
      summary: `Wellbeing: mood ${r.mood}, appetite ${r.appetite}`,
    })),
    Medication: medications.map((r) => ({
      entityId: r.id,
      entityDate: r.createdAt,
      residentId: r.residentId,
      residentName: `${r.resident.firstName} ${r.resident.lastName}`,
      summary: `Active medication: ${r.name}`,
    })),
    MedicationAdministration: medications.map((r) => ({
      entityId: r.id,
      entityDate: r.createdAt,
      residentId: r.residentId,
      residentName: `${r.resident.firstName} ${r.resident.lastName}`,
      summary: `MAR record for: ${r.name}`,
    })),
    RiskProfile: riskProfiles.map((r) => ({
      entityId: r.id,
      entityDate: r.lastCalculatedAt || r.createdAt,
      residentId: r.residentId,
      residentName: `${r.resident.firstName} ${r.resident.lastName}`,
      summary: `Risk profile: fall ${r.fallScore}/100, pressure ulcer ${r.pressureUlcerScore}/100`,
    })),
    CarePlanVersion: carePlans.map((r) => ({
      entityId: r.id,
      entityDate: r.updatedAt,
      residentId: r.residentId,
      residentName: `${r.resident.firstName} ${r.resident.lastName}`,
      summary: `Care plan version — ${r.category}`,
    })),
    PrescriptionOrder: [],
    ComplianceEvidence: [],
    FamilyMessage: [],
  }

  // Build evidence records for each standard, max 5 per entity type per standard
  const toCreate: {
    organisationId: string
    standardId: string
    entityType: string
    entityId: string
    entityDate: Date
    residentId: string | null
    residentName: string | null
    summary: string
    isRecent: boolean
  }[] = []

  for (const standard of standards) {
    const mappedTypes = (standard.dataMapping as string[]) || []
    for (const entityType of mappedTypes) {
      const items = (evidenceByType[entityType] || []).slice(0, 5)
      for (const item of items) {
        toCreate.push({
          organisationId,
          standardId: standard.id,
          entityType,
          entityId: item.entityId,
          entityDate: item.entityDate,
          residentId: item.residentId,
          residentName: item.residentName,
          summary: item.summary,
          isRecent: true,
        })
      }
    }
  }

  // Clear old evidence for this org and replace
  await prisma.complianceEvidence.deleteMany({ where: { organisationId } })
  if (toCreate.length > 0) {
    await prisma.complianceEvidence.createMany({ data: toCreate })
  }

  return toCreate.length
}

// ─────────────────────────────────────────────
// SERVER ACTIONS
// ─────────────────────────────────────────────

export async function getComplianceOverview(regulatoryBody?: string) {
  const session = await getServerSession()
  if (!session) return { error: 'Unauthorised' }
  const user = session.user as any

  const body = (regulatoryBody ||
    (await prisma.organisation.findUnique({
      where: { id: user.organisationId },
      select: { regulatoryBody: true },
    }).then((o) => o?.regulatoryBody || 'CQC'))) as 'CQC' | 'CARE_INSPECTORATE'

  // Seed if needed
  await seedStandardsIfNeeded(body)

  const standards = await prisma.regulatoryStandard.findMany({
    where: { regulatoryBody: body, isActive: true },
    include: {
      evidence: {
        where: { organisationId: user.organisationId },
        orderBy: { entityDate: 'desc' },
      },
    },
    orderBy: [{ domain: 'asc' }, { code: 'asc' }],
  })

  // Compute RAG per standard
  const standardsWithRAG = standards.map((s) => {
    const evidenceCount = s.evidence.length
    const recentCount = s.evidence.filter((e) => e.isRecent).length
    let rag: 'GREEN' | 'AMBER' | 'RED' = 'RED'
    if (evidenceCount >= 3) rag = 'GREEN'
    else if (evidenceCount >= 1) rag = 'AMBER'
    return { ...s, evidenceCount, recentCount, rag }
  })

  const domainGroups = standardsWithRAG.reduce(
    (acc, s) => {
      if (!acc[s.domain]) acc[s.domain] = []
      acc[s.domain].push(s)
      return acc
    },
    {} as Record<string, typeof standardsWithRAG>
  )

  return { domainGroups, body, totalStandards: standards.length }
}

export async function refreshComplianceEvidence() {
  const session = await getServerSession()
  if (!session) return { error: 'Unauthorised' }
  const user = session.user as any
  if (!['MANAGER', 'ADMIN'].includes(user.role)) return { error: 'Unauthorised' }

  const org = await prisma.organisation.findUnique({
    where: { id: user.organisationId },
    select: { regulatoryBody: true },
  })

  const body = (org?.regulatoryBody || 'CQC') as 'CQC' | 'CARE_INSPECTORATE'
  await seedStandardsIfNeeded(body)

  const standards = await prisma.regulatoryStandard.findMany({
    where: { regulatoryBody: body, isActive: true },
    select: { id: true, dataMapping: true },
  })

  const count = await buildComplianceEvidence(user.organisationId, standards)

  await logAudit({
    organisationId: user.organisationId,
    userId: user.id,
    action: 'COMPLIANCE_EVIDENCE_REFRESHED',
    entityType: 'Organisation',
    entityId: user.organisationId,
    after: { evidenceCount: count },
  })

  revalidatePath('/inspection')
  return { success: true, evidenceCount: count }
}

export async function generateMockInspectionReport(
  data: z.infer<typeof generateReportSchema>
) {
  const session = await getServerSession()
  if (!session) return { error: 'Unauthorised' }
  const user = session.user as any
  if (!['MANAGER', 'ADMIN'].includes(user.role)) return { error: 'Unauthorised' }

  const parsed = generateReportSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const regulatoryBody = parsed.data.regulatoryBody

  await seedStandardsIfNeeded(regulatoryBody as 'CQC' | 'CARE_INSPECTORATE')

  const standards = await prisma.regulatoryStandard.findMany({
    where: { regulatoryBody, isActive: true },
    include: {
      evidence: {
        where: { organisationId: user.organisationId },
        orderBy: { entityDate: 'desc' },
        take: 5,
      },
    },
    orderBy: [{ domain: 'asc' }, { code: 'asc' }],
  })

  // Build evidence snapshot
  const evidenceSnapshot: Record<string, { count: number; gaps: string[] }> = {}
  const domains = [...new Set(standards.map((s) => s.domain))]
  for (const domain of domains) {
    const domainStandards = standards.filter((s) => s.domain === domain)
    const gapStandards = domainStandards.filter((s) => s.evidence.length === 0)
    evidenceSnapshot[domain] = {
      count: domainStandards.reduce((s, st) => s + st.evidence.length, 0),
      gaps: gapStandards.map((s) => s.title),
    }
  }

  // Prepare prompt context
  const org = await prisma.organisation.findUnique({
    where: { id: user.organisationId },
    select: { name: true, type: true },
  })

  const residentCount = await prisma.resident.count({
    where: { organisationId: user.organisationId, status: 'ADMITTED', deletedAt: null },
  })

  const systemPrompt = `You are an expert ${regulatoryBody === 'CQC' ? 'CQC' : 'Care Inspectorate'} inspector conducting a mock inspection of a UK care home.

Your role is to produce a realistic, balanced mock inspection report based on the evidence provided.
Write in the style of an official ${regulatoryBody === 'CQC' ? 'CQC' : 'Care Inspectorate'} inspection report.
Be specific about evidence, identify genuine strengths and areas for improvement.
Rate each domain fairly: Outstanding / Good / Requires Improvement / Inadequate.
Calculate an overall rating based on domain ratings.

${regulatoryBody === 'CQC' ? 'Domains: Safe, Effective, Caring, Responsive, Well-led' : 'Domains: Quality of Care and Support, Quality of Environment, Quality of Staffing, Quality of Management and Leadership'}

Output valid JSON only.`

  const userPrompt = `Produce a mock inspection report for:
- Provider: ${org?.name || 'Care Home'}
- Type: ${org?.type || 'Residential care home'}
- Residents admitted: ${residentCount}
- Regulatory framework: ${regulatoryBody}

Evidence summary per domain:
${JSON.stringify(evidenceSnapshot, null, 2)}

Standards assessed:
${standards.map((s) => `${s.code} (${s.domain}): ${s.title} — ${s.evidence.length} evidence records`).join('\n')}

Required JSON format:
{
  "overallRating": "OUTSTANDING|GOOD|REQUIRES_IMPROVEMENT|INADEQUATE",
  "domainRatings": {"Domain Name": "GOOD", ...},
  "strengthsSummary": "2-3 sentence summary of main strengths",
  "gapsSummary": "2-3 sentence summary of areas for improvement",
  "reportContent": "Full 600-800 word inspection narrative in official style",
  "actionPlan": [
    {"priority": "HIGH|MEDIUM|LOW", "domain": "Domain Name", "action": "Specific required action", "timeframe": "timeframe"}
  ]
}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.4,
    max_tokens: 2500,
  })

  const raw = response.choices[0].message.content || '{}'
  const parsed2 = JSON.parse(raw)

  const report = await prisma.mockInspectionReport.create({
    data: {
      organisationId: user.organisationId,
      regulatoryBody,
      overallRating: parsed2.overallRating,
      domainRatings: parsed2.domainRatings || {},
      reportContent: parsed2.reportContent || '',
      strengthsSummary: parsed2.strengthsSummary,
      gapsSummary: parsed2.gapsSummary,
      actionPlan: parsed2.actionPlan || [],
      evidenceSnapshot,
      generatedById: user.id,
    },
  })

  await logAudit({
    organisationId: user.organisationId,
    userId: user.id,
    action: 'MOCK_INSPECTION_GENERATED',
    entityType: 'MockInspectionReport',
    entityId: report.id,
    after: { overallRating: parsed2.overallRating },
  })

  revalidatePath('/inspection')
  return { success: true, report }
}

export async function getMockInspectionReports() {
  const session = await getServerSession()
  if (!session) return { error: 'Unauthorised' }
  const user = session.user as any

  const reports = await prisma.mockInspectionReport.findMany({
    where: { organisationId: user.organisationId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return { reports }
}

export async function setRegulatorySwitchBody(regulatoryBody: string) {
  const session = await getServerSession()
  if (!session) return { error: 'Unauthorised' }
  const user = session.user as any
  if (user.role !== 'MANAGER') return { error: 'Unauthorised' }

  await prisma.organisation.update({
    where: { id: user.organisationId },
    data: { regulatoryBody: regulatoryBody as 'CQC' | 'CARE_INSPECTORATE' | 'CSSIW' | 'RQIA' },
  })

  revalidatePath('/inspection')
  return { success: true }
}
