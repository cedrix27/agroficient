import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function dayOfYear(dateStr: string) {
  const d = new Date(dateStr)
  const start = new Date(d.getFullYear(), 0, 0)
  const diff = d.getTime() - start.getTime()
  return Math.floor(diff / 86400000)
}

export async function GET(req: NextRequest) {
  const years = Number(req.nextUrl.searchParams.get('years') ?? '6')
  const cappedYears = Math.max(2, Math.min(20, years))
  const currentYear = new Date().getFullYear()
  const fromYear = currentYear - cappedYears + 1

  try {
    const onsetRows = await db.prevision.findMany({
      where: {
        type: 'debut_saison',
        periode: { gte: String(fromYear), lte: String(currentYear) }
      },
      select: {
        zoneId: true,
        periode: true,
        details: true
      },
      orderBy: { createdAt: 'desc' }
    })

    const seasonalRows = await db.prevision.findMany({
      where: {
        type: 'saisonniere'
      },
      select: {
        zoneId: true,
        periode: true,
        categorie: true,
        probabilite: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Keep latest onset per zone/year
    const onsetByZoneYear = new Map<string, { onsetDate: string | null; effectiveYear: number | null }>()
    for (const r of onsetRows) {
      const k = `${r.zoneId}:${r.periode}`
      if (onsetByZoneYear.has(k)) continue
      const det = (r.details as { onsetDate?: string | null; effectiveYear?: number } | null) ?? null
      onsetByZoneYear.set(k, {
        onsetDate: det?.onsetDate ?? null,
        effectiveYear: det?.effectiveYear ?? null
      })
    }

    // Pseudo-ground-truth baseline:
    // Compare each zone-year onset against median DOY across all available years for that zone.
    const zoneSeries = new Map<string, Array<{ year: number; doy: number }>>()
    for (const [k, v] of onsetByZoneYear.entries()) {
      if (!v.onsetDate) continue
      const [zoneId, yearStr] = k.split(':')
      const year = Number(yearStr)
      if (!Number.isFinite(year)) continue
      zoneSeries.set(zoneId, [...(zoneSeries.get(zoneId) ?? []), { year, doy: dayOfYear(v.onsetDate) }])
    }

    const absErrors: number[] = []
    for (const [, points] of zoneSeries.entries()) {
      if (points.length < 2) continue
      const sorted = points.map((p) => p.doy).sort((a, b) => a - b)
      const median = sorted[Math.floor(sorted.length / 2)]
      for (const p of points) absErrors.push(Math.abs(p.doy - median))
    }

    const mae = absErrors.length > 0 ? Number((absErrors.reduce((a, b) => a + b, 0) / absErrors.length).toFixed(2)) : null

    // Seasonal category distribution on latest snapshots per zone
    const latestSeasonalByZone = new Map<string, { categorie: string; probabilite: number }>()
    for (const r of seasonalRows) {
      if (latestSeasonalByZone.has(r.zoneId)) continue
      latestSeasonalByZone.set(r.zoneId, { categorie: r.categorie, probabilite: r.probabilite })
    }

    const dist = { bonne: 0, normale: 0, difficile: 0, other: 0 }
    let avgProb = 0
    for (const v of latestSeasonalByZone.values()) {
      if (v.categorie === 'bonne') dist.bonne += 1
      else if (v.categorie === 'normale') dist.normale += 1
      else if (v.categorie === 'difficile') dist.difficile += 1
      else dist.other += 1
      avgProb += v.probabilite
    }
    const n = latestSeasonalByZone.size
    const avgConfidence = n > 0 ? Number(((avgProb / n) * 100).toFixed(1)) : null

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      evalWindowYears: cappedYears,
      onsetEvaluation: {
        method: 'median_doy_baseline',
        samples: absErrors.length,
        maeDays: mae
      },
      seasonalDistribution: {
        zones: n,
        classes: dist,
        avgConfidencePct: avgConfidence
      }
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Eval unavailable', details: String(err) }, { status: 503 })
  }
}
