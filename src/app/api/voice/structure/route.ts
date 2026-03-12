import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { openai } from '@/lib/openai'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { transcription } = await req.json()
  if (!transcription?.trim()) {
    return NextResponse.json({ error: 'No transcription provided' }, { status: 400 })
  }

  const systemPrompt = `You are an expert UK care note analyst. Your job is to structure a spoken care observation into a properly formatted care note.

Extract from the transcription:
1. The most appropriate care note category (one of: PERSONAL_CARE, FOOD_FLUID, MOBILITY, WELLBEING, BEHAVIOUR, HEALTH_CONCERN, SOCIAL, SLEEP, CONTINENCE, GENERAL)
2. A clean, professional written care note using care home language

Rules:
- Remove filler words and speech artifacts
- Write in third-person clinical style ("Resident was...", "Staff supported...")
- Correct any obvious mishearings in a clinical care context
- Keep all clinically relevant information
- Output valid JSON only.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Structure this spoken care observation into a care note:\n\n"${transcription}"`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 600,
  })

  const raw = response.choices[0].message.content || '{}'
  const structured = JSON.parse(raw)

  return NextResponse.json({
    category: structured.category || 'GENERAL',
    content: structured.content || transcription,
  })
}
