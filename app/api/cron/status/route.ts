import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPipelineRunSummary } from '@/lib/pipeline-run'

export async function GET() {
  try {
    const [zonesCount, latest, last24Count, byType, cronSummary] = await Promise.all([
      db.zone.count(),
      db.prevision.findFirst({ orderBy: { createdAt: 'desc' } }),
      db.prevision.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      db.prevision.groupBy({ by: ['type'], _count: { _all: true } }),
      getPipelineRunSummary('previsions-refresh')
    ])

    const seasonalNow = await db.prevision.groupBy({
      by: ['zoneId'],
      where: { type: 'saisonniere' },
      _count: { _all: true }
    })

    const now = Date.now()
    const lastTs = latest?.createdAt ? new Date(latest.createdAt).getTime() : null
    const stalenessHours = lastTs ? Number(((now - lastTs) / 3600000).toFixed(1)) : null

    const zonesCovered = seasonalNow.length
    const coverageRatio = zonesCount > 0 ? zonesCovered / zonesCount : 0

    const healthFlags = {
      staleDataOver36h: stalenessHours !== null ? stalenessHours > 36 : true,
      noEntriesLast24h: last24Count === 0,
      lowCoverage: zonesCount > 0 ? coverageRatio < 0.8 : true
    }

    let healthLevel: 'good' | 'warning' | 'critical' = 'good'
    if (healthFlags.staleDataOver36h || healthFlags.noEntriesLast24h) {
      healthLevel = 'critical'
    } else if (healthFlags.lowCoverage) {
      healthLevel = 'warning'
    }

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      healthLevel,
      healthFlags,
      dataFreshness: {
        lastPrevisionAt: latest?.createdAt ?? null,
        stalenessHours,
        entriesLast24h: last24Count
      },
      coverage: {
        zonesTotal: zonesCount,
        zonesWithSeasonalData: zonesCovered,
        coverageRatio
      },
      cron: {
        lastRunAt: cronSummary.latest?.createdAt ?? null,
        lastSuccessAt: cronSummary.lastSuccessAt,
        lastFailureAt: cronSummary.lastFailureAt,
        lastOutcome: cronSummary.latest?.outcome ?? 'never',
        lastError: cronSummary.latest?.error ?? null,
        lastRefreshedCount: cronSummary.latest?.refreshedCount ?? 0,
        totalRuns: cronSummary.totalRuns
      },
      volumesByType: byType.map((r) => ({ type: r.type, count: r._count._all }))
    })
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Status unavailable (likely DB not configured)',
        details: String(err)
      },
      { status: 503 }
    )
  }
}
