import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { openai, AI_MODELS } from "@/lib/openai"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const user = session?.user as any
    if (!user?.organisationId) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
    }

    const body = await req.json()
    const { shift, shiftDate, residents, careNotes, incidents } = body

    if (!shift || !shiftDate) {
      return NextResponse.json({ error: "shift and shiftDate required" }, { status: 400 })
    }

    // Build a structured prompt from care data
    const shiftLabel = shift === "MORNING" ? "Morning (07:00–15:00)"
      : shift === "AFTERNOON" ? "Afternoon (15:00–23:00)"
      : "Night (23:00–07:00)"

    const residentsSection = residents?.length
      ? residents.map((r: any) => `- Room ${r.room ?? "?"}: ${r.name}${r.dnacpr ? " [DNACPR]" : ""}${r.diagnosis ? ` — ${r.diagnosis}` : ""}`).join("\n")
      : "No resident data provided."

    const notesSection = careNotes?.length
      ? careNotes.map((n: any) => `[${n.category ?? "GENERAL"} – ${n.resident?.firstName ?? ""} ${n.resident?.lastName ?? ""} Rm ${n.resident?.roomNumber ?? "?"}] ${n.content}`).join("\n")
      : "No care notes recorded for this shift."

    const incidentsSection = incidents?.length
      ? incidents.map((i: any) => `- ${i.resident?.firstName ?? ""} ${i.resident?.lastName ?? ""}: ${i.title ?? i.description ?? "Incident"} (${i.severity ?? "unknown severity"})`).join("\n")
      : "No incidents recorded."

    const systemPrompt = `You are a clinical documentation assistant for a UK care home. 
Your task is to produce a professional, structured end-of-shift handover report.
Write clearly for the oncoming shift team. Use plain UK English. Be factual and objective.
Highlight any residents who need close monitoring or follow-up.`

    const userPrompt = `Write a handover report for the ${shiftLabel} shift on ${shiftDate}.

RESIDENTS ON CURRENT CASELOAD:
${residentsSection}

CARE NOTES FROM THIS SHIFT:
${notesSection}

INCIDENTS/CONCERNS THIS SHIFT:
${incidentsSection}

Please structure the report with:
1. Shift Overview (brief summary)
2. Resident-by-resident highlights (focus on significant changes, concerns, achievements)
3. Outstanding Actions / Handover Points for the next shift
4. Any DNACPR / End-of-Life notes
Keep it under 600 words and professional.`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.HANDOVER,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 900,
    })

    const content = response.choices[0]?.message?.content ?? ""
    return NextResponse.json({ content })
  } catch (err: any) {
    console.error("Handover AI error:", err)
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 })
  }
}
