import { NextRequest, NextResponse } from 'next/server'
import { recordPipelineRun } from '@/lib/pipeline-run'

function authOk(req: NextRequest) {
  const configured = process.env.CRON_SECRET
  if (!configured) return true
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${configured}`
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    await recordPipelineRun({ jobName: 'previsions-refresh', outcome: 'failure', error: 'Unauthorized' })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
    const origin = baseUrl
      ? (baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`)
      : new URL(req.url).origin

    const res = await fetch(`${origin}/api/previsions`, { cache: 'no-store' })
    if (!res.ok) {
      const body = await res.text()
      await recordPipelineRun({ jobName: 'previsions-refresh', outcome: 'failure', error: `Refresh failed: ${body}` })
      return NextResponse.json({ error: 'Refresh failed', details: body }, { status: 502 })
    }

    const data = await res.json()
    const refreshed = Array.isArray(data) ? data.length : 0
    await recordPipelineRun({ jobName: 'previsions-refresh', outcome: 'success', refreshedCount: refreshed })

    return NextResponse.json({ ok: true, refreshed })
  } catch (err) {
    await recordPipelineRun({ jobName: 'previsions-refresh', outcome: 'failure', error: String(err) })
    return NextResponse.json({ error: 'Unexpected cron error', details: String(err) }, { status: 500 })
  }
}
