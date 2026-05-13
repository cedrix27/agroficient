import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { demoZones } from '@/lib/demo-data'

type ZoneInput = { id: string; nom: string; latitude: number; longitude: number }

type OnsetResp = {
  onset_date: string | null
  confidence: number
  details?: { effective_year?: number }
}

async function getZone(zoneId: string): Promise<ZoneInput | null> {
  try {
    const z = await db.zone.findUnique({ where: { id: zoneId }, select: { id: true, nom: true, latitude: true, longitude: true } })
    if (z) return z
  } catch {
    // fallback below
  }

  const demo = demoZones.find((d) => d.id === zoneId)
  if (!demo) return null
  return { id: demo.id, nom: demo.nom, latitude: demo.latitude, longitude: demo.longitude }
}

export async function GET(req: NextRequest) {
  const zoneId = req.nextUrl.searchParams.get('zoneId')
  const years = Number(req.nextUrl.searchParams.get('years') ?? '5')

  if (!zoneId) return NextResponse.json({ error: 'zoneId requis' }, { status: 400 })

  const zone = await getZone(zoneId)
  if (!zone) return NextResponse.json({ error: 'zone introuvable' }, { status: 404 })

  const pythonBase = process.env.PYTHON_SERVICE_URL ?? 'http://127.0.0.1:8001'
  const currentYear = new Date().getFullYear()
  const list = Array.from({ length: Math.max(1, Math.min(10, years)) }, (_, i) => currentYear - i)

  const history = await Promise.all(
    list.map(async (year) => {
      // DB-first strict lookup
      try {
        const row = await db.prevision.findFirst({
          where: {
            zoneId: zone.id,
            type: 'debut_saison',
            periode: String(year)
          },
          orderBy: { createdAt: 'desc' }
        })

        if (row) {
          const det = (row.details as { onsetDate?: string | null; effectiveYear?: number; source?: string } | null) ?? null
          return {
            requestedYear: year,
            effectiveYear: det?.effectiveYear ?? year,
            onsetDate: det?.onsetDate ?? null,
            confidence: row.probabilite,
            source: det?.source ?? 'db-cache'
          }
        }
      } catch {
        // continue to live fallback
      }

      // Live compute fallback for missing year
      try {
        const res = await fetch(`${pythonBase}/previsions/debut-saison`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zone_id: zone.id,
            latitude: zone.latitude,
            longitude: zone.longitude,
            year
          }),
          cache: 'no-store'
        })

        if (!res.ok) throw new Error('python onset failed')
        const payload = (await res.json()) as OnsetResp

        const effectiveYear = payload.details?.effective_year ?? year

        try {
          await db.prevision.deleteMany({ where: { zoneId: zone.id, type: 'debut_saison', periode: String(year) } })
          await db.prevision.create({
            data: {
              zoneId: zone.id,
              type: 'debut_saison',
              periode: String(year),
              categorie: payload.onset_date ? 'detecte' : 'indetermine',
              probabilite: payload.confidence ?? 0,
              details: {
                onsetDate: payload.onset_date,
                effectiveYear,
                source: 'python-live'
              },
              source: 'python_backend'
            }
          })
        } catch {
          // best effort
        }

        return {
          requestedYear: year,
          effectiveYear,
          onsetDate: payload.onset_date,
          confidence: payload.confidence,
          source: 'python-live'
        }
      } catch {
        return {
          requestedYear: year,
          effectiveYear: year,
          onsetDate: null,
          confidence: 0,
          source: 'unavailable'
        }
      }
    })
  )

  return NextResponse.json({
    zone: { id: zone.id, nom: zone.nom },
    history
  })
}
