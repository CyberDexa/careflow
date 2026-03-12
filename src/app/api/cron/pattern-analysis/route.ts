import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runOrgPatternAnalysis } from '@/actions/pattern-recognition'

export const maxDuration = 300

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const organisations = await prisma.organisation.findMany({
    select: { id: true, name: true },
  })

  const results: { orgId: string; total: number }[] = []
  for (const org of organisations) {
    const result = await runOrgPatternAnalysis(org.id)
    if ('total' in result) {
      results.push({ orgId: org.id, total: result.total })
    }
  }

  return NextResponse.json({
    success: true,
    orgsProcessed: organisations.length,
    totalAlerts: results.reduce((s, r) => s + r.total, 0),
    timestamp: new Date().toISOString(),
  })
}
