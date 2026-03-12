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
Write person-centred, outcome-focused care plans using the "What Matters to Me" approach.
Follow the CQC Key Lines of Enquiry (KLOE) and personalisation principles.
Each care plan section must use the exact UK care home documentation standard format.
Output must be structured JSON — no markdown, no extra text.`

    const userPrompt = `Write a care plan for the ${categoryLabel} domain.

RESIDENT:
Name: ${resident.firstName} ${resident.lastName}, Preferred: ${resident.preferredName ?? "As above"}
Age: ${resident.dateOfBirth ? Math.floor((Date.now() - new Date(resident.dateOfBirth).getTime()) / 3.15e10) : "Unknown"} years
${medicalContext}
Religion: ${resident.religion ?? "Not stated"}. Language: ${resident.language ?? "English"}

RECENT ASSESSMENT DATA:
${assessmentContext || "No assessment data recorded yet."}

Return a valid JSON object (no extra text) with these exact keys:
{
  "needsAssessment": "Care needs: 2–3 sentences describing the individual's current care needs in this domain, written in a person-centred way that describes what support is required and why",
  "goals": ["Outcome/goal: each item is a specific, measurable, person-centred goal — e.g. 'Outcome/goal: [Name] will maintain skin integrity with no new pressure damage developing'"],
  "interventions": ["Description of care actions: each item is a specific action staff must take — how, when, with what equipment or approach — e.g. 'Description of care actions: Two staff to assist with repositioning every 2 hours using a slide sheet, recording in the turning chart'"],
  "outcomes": ["Able to do themselves: each item describes something the resident can do independently or with minimal prompting — e.g. 'Able to do themselves: [Name] is able to wash their own face and hands with verbal prompting'"],
  "reviewDate": "ISO date string for recommended next review (typically 3 months from now)",
  "riskFlags": ["any specific risk alerts for this domain — empty array if none"]
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.CARE_PLAN,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1200,
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
