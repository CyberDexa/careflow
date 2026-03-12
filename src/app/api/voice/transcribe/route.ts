import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { openai } from '@/lib/openai'
import { toFile } from 'openai'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const formData = await req.formData()
  const audio = formData.get('audio') as Blob | null
  if (!audio) return NextResponse.json({ error: 'No audio provided' }, { status: 400 })

  const buffer = Buffer.from(await audio.arrayBuffer())
  const file = await toFile(buffer, 'recording.webm', { type: audio.type || 'audio/webm' })

  const response = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'en',
  })

  return NextResponse.json({ transcription: response.text })
}
