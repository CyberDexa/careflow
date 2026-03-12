import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runOrgRiskAnalysis } from '@/actions/risk-analytics'

export const maxDuration = 300 // 5-minute timeout for Vercel Pro

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get('authorization')
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const organisations = await prisma.organisation.findMany({
      select: { id: true, name: true },
    })

    const results = []
    for (const org of organisations) {
      const result = await runOrgRiskAnalysis(org.id)
      results.push({ organisationId: org.id, name: org.name, ...result })
    }

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('[cron/risk-analysis]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
