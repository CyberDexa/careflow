import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { openai, AI_MODELS } from "@/lib/openai"
import { prisma } from "@/lib/prisma"

const CARE_PLAN_CATEGORIES: Record<string, string> = {
  PERSONAL_CARE: "Personal Care & Hygiene",
  MOBILITY: "Mobility & Moving/Handling",
  NUTRITION: "Nutrition & Hydration",
  CONTINENCE: "Continence Management",
  MEDICATION: "Medication Management",
  COMMUNICATION: "Communication & Social Needs",
  SKIN_INTEGRITY: "Skin Integrity & Pressure Care",
  MENTAL_HEALTH: "Mental Health & Wellbeing",
  END_OF_LIFE: "Advance Care & End of Life",
  FALLS_PREVENTION: "Falls Prevention",
  CLINICAL: "Clinical Nursing Care",
  SOCIAL: "Social Engagement & Activities",
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const user = session?.user as any
    if (!user?.organisationId) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
    }

    const body = await req.json()
    const { residentId, category } = body

    if (!residentId || !category) {
      return NextResponse.json({ error: "residentId and category required" }, { status: 400 })
    }

    // Load resident and latest assessments
    const resident = await prisma.resident.findFirst({
      where: { id: residentId, organisationId: user.organisationId },
      include: {
        medicalHistory: true,
        contacts: { where: { isNextOfKin: true }, take: 1 },
        assessments: {
          where: { status: "APPROVED" },
          include: { domains: true },
          orderBy: { completedAt: "desc" },
          take: 10,
        },
      },
    })
    if (!resident) return NextResponse.json({ error: "Resident not found" }, { status: 404 })

    const categoryLabel = CARE_PLAN_CATEGORIES[category] ?? category

    // Build rich assessment context — include domain content for relevant domains
    const DOMAIN_RELEVANCE: Record<string, string[]> = {
      PERSONAL_CARE:    ["PERSONAL_HYGIENE", "CONTINENCE_ASSESSMENT", "MOBILITY_FUNCTION"],
      MOBILITY:         ["MOBILITY_FUNCTION", "FALLS_RISK", "MULTIFACTORIAL_FALLS"],
      NUTRITION:        ["MUST_NUTRITIONAL", "NUTRITIONAL_ASSESSMENT", "EATING_DRINKING_CHOKING"],
      CONTINENCE:       ["CONTINENCE_ASSESSMENT"],
      MEDICATION:       ["CLINICAL_FRAILTY_SCORE", "DEPENDENCY_RATING"],
      SKIN_INTEGRITY:   ["WATERLOW", "MATTRESS_CHECK", "BED_RAILS_ASSESSMENT"],
      MENTAL_HEALTH:    ["MENTAL_CAPACITY", "PAIN_ASSESSMENT", "INTERESTS_ACTIVITIES"],
      FALLS_PREVENTION: ["FALLS_RISK", "MULTIFACTORIAL_FALLS", "BED_RAILS_ASSESSMENT"],
      END_OF_LIFE:      ["ADVANCE_CARE_PLAN", "MENTAL_CAPACITY"],
      COMMUNICATION:    ["INTERESTS_ACTIVITIES", "MENTAL_CAPACITY"],
      SOCIAL:           ["INTERESTS_ACTIVITIES", "DEPENDENCY_RATING"],
      CLINICAL:         ["CLINICAL_FRAILTY_SCORE", "PAIN_ASSESSMENT", "PEEP"],
    }
    const relevantDomains = DOMAIN_RELEVANCE[category] ?? []

    const assessmentContext = resident.assessments.slice(0, 5).flatMap((a: any) =>
      a.domains.filter((d: any) => relevantDomains.includes(d.domainType) || relevantDomains.length === 0)
    ).slice(0, 8).map((d: any) => {
      const content = d.content as Record<string, any> ?? {}
      const keyPairs = Object.entries(content)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .slice(0, 12)
        .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
        .join("; ")
      return `${d.domainType.replace(/_/g, " ")} (score: ${d.score ?? "N/A"}): ${keyPairs}`
    }).join("\n")

    const medicalContext = resident.medicalHistory
      ? `Diagnoses: ${resident.medicalHistory.diagnoses?.join(", ") ?? "Unknown"}. Allergies: ${resident.medicalHistory.allergies?.join(", ") ?? "None"}. Mobility: ${resident.medicalHistory.mobilityLevel ?? "Unknown"}. Continence: ${resident.medicalHistory.continenceLevel ?? "Unknown"}. DNACPR: ${resident.dnacprInPlace ? "Yes" : "No"}.`
      : "No medical information available."

    const systemPrompt = `You are a specialist care plan author for a UK-registered care home.
Write person-centred, outcome-focused care plans that match the depth and style of real UK care home documentation.
Follow the CQC Key Lines of Enquiry (KLOE), person-centred values, and the "What Matters to Me" approach.

STYLE REQUIREMENTS:
- Care Needs must be DETAILED: 3–4 paragraphs covering the person's current functioning, history, specific risks, preferences, how their condition affects this area, what support looks like, and any cognitive/behavioural factors
- Goals must be SPECIFIC and MEASURABLE: 5–7 outcomes, each one concrete
- Actions must be COMPREHENSIVE: 10–14 numbered items. Complex steps should have 3–5 sub-bullet points. Reference specific equipment, staffing ratios, frequencies, de-escalation steps, escalation criteria
- Use the person's name (e.g. "Mr X") throughout
- Write in the third person for Care Needs, first person for Goals ("will...")
- Include specific clinical details: staffing ratios (e.g. "two staff"), equipment (e.g. "slide sheet", "Zimmer frame"), timing (e.g. "every 2 hours", "twice daily"), and escalation contacts
- Goals section should be labelled "Goals & Outcomes" and include measurable outcomes
- Actions must include: monitoring triggers, escalation pathways, de-escalation strategies, documentation requirements, and family/NOK involvement where relevant
Output must be structured JSON — no markdown, no extra text.`

    const userPrompt = `Write a comprehensive, clinically detailed care plan for the ${categoryLabel} domain.

RESIDENT:
Name: ${resident.firstName} ${resident.lastName}, Preferred: ${resident.preferredName ?? "As above"}
Age: ${resident.dateOfBirth ? Math.floor((Date.now() - new Date(resident.dateOfBirth).getTime()) / 3.15e10) : "Unknown"} years
${medicalContext}
Religion: ${resident.religion ?? "Not stated"}. Language: ${resident.language ?? "English"}
NOK/Welfare POA: ${resident.contacts?.[0] ? `${resident.contacts[0].firstName} ${resident.contacts[0].lastName} (${resident.contacts[0].relationship})` : "Not recorded"}

RECENT ASSESSMENT DATA:
${assessmentContext || "No assessment data recorded yet."}

Return ONLY a valid JSON object with these exact keys. DO NOT truncate — all sections must be fully written out:
{
  "needsAssessment": "3–4 detailed paragraphs describing: (1) the person's current needs and how their condition affects this domain, (2) their specific preferences, communication needs, and what matters to them, (3) risks and clinical considerations, (4) what effective support looks like for them. Written in person-centred, third-person narrative. Minimum 200 words.",
  "goals": [
    "Goals & Outcomes: [Name] will [specific measurable outcome] — include 5–7 items, each a concrete, person-centred goal"
  ],
  "interventions": [
    "1. [Action heading]: detailed instruction for staff including how, when, with what equipment/resources, staffing ratio — include 10–14 numbered items. For complex steps add sub-points as: '\\n  • sub-point'. Include monitoring, escalation, and documentation steps."
  ],
  "outcomes": [
    "Able to do themselves / With support: [Name] is able to [specific task] — include 3–5 items describing independence levels"
  ],
  "reviewDate": "ISO date string for recommended next review (3 months from today)",
  "riskFlags": ["specific risk alerts for this domain — empty array if none"]
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.CARE_PLAN,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 3500,
      response_format: { type: "json_object" },
    })

    const raw = response.choices[0]?.message?.content ?? "{}"
    let generated: any
    try {
      generated = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 })
    }

    return NextResponse.json({ generated })
  } catch (err: any) {
    console.error("Care plan AI error:", err)
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 })
  }
}
