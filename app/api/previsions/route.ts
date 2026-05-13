import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { demoPrevisions, demoZones } from '@/lib/demo-data'

type ZoneInput = {
  id: string
  nom: string
  latitude: number
  longitude: number
}

type PythonSeasonal = {
  categorie: 'bonne' | 'normale' | 'difficile'
  probabilite: number
  details?: { periode?: string }
}

type PythonShortTerm = {
  daily?: {
    precipitation_sum?: number[]
  }
}

type PythonOnset = {
  onset_date: string | null
  confidence?: number
  details?: { effective_year?: number }
}

type ZoneForecast = {
  id: string
  nom: string
  latitude: number
  longitude: number
  categorie: 'bonne' | 'normale' | 'difficile'
  probabilite: number
  periode: string
  pluieMm: number
  dateDebutSaison: string | null
  recommandation: string
  onsetConfidence: number
}

async function getZonesFromDbOrDemo(): Promise<ZoneInput[]> {
  try {
    const zones = await db.zone.findMany({
      select: { id: true, nom: true, latitude: true, longitude: true },
      orderBy: { createdAt: 'desc' }
    })
    if (zones.length > 0) return zones
  } catch {
    // fallback below
  }

  return demoZones.map((z) => ({
    id: z.id,
    nom: z.nom,
    latitude: z.latitude,
    longitude: z.longitude
  }))
}

async function getPrevisionsFromPython(zones: ZoneInput[]) {
  const pythonBase = process.env.PYTHON_SERVICE_URL ?? 'http://127.0.0.1:8001'
  const year = new Date().getFullYear()
  const period = `JAS-${year}`

  const results = await Promise.all(
    zones.map(async (zone): Promise<ZoneForecast> => {
      const [seasonalRes, shortRes, onsetRes] = await Promise.all([
        fetch(`${pythonBase}/previsions/saisonniere`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zone_id: zone.id,
            latitude: zone.latitude,
            longitude: zone.longitude,
            periode: period
          }),
          cache: 'no-store'
        }),
        fetch(`${pythonBase}/previsions/court-terme`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: zone.latitude,
            longitude: zone.longitude,
            days: 7
          }),
          cache: 'no-store'
        }),
        fetch(`${pythonBase}/previsions/debut-saison`, {
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
      ])

      if (!seasonalRes.ok) throw new Error(`Python saisonniere failed for zone ${zone.id}`)

      const seasonal = (await seasonalRes.json()) as PythonSeasonal
      const shortTerm = shortRes.ok ? ((await shortRes.json()) as PythonShortTerm) : undefined
      const onset = onsetRes.ok ? ((await onsetRes.json()) as PythonOnset) : { onset_date: null, confidence: 0 }
      const pluieMm = shortTerm?.daily?.precipitation_sum?.reduce((a, b) => a + b, 0) ?? 0

      return {
        id: zone.id,
        nom: zone.nom,
        latitude: zone.latitude,
        longitude: zone.longitude,
        categorie: seasonal.categorie,
        probabilite: Math.round((seasonal.probabilite ?? 0) * 100),
        periode: seasonal.details?.periode ?? period,
        pluieMm: Math.round(pluieMm),
        dateDebutSaison: onset.onset_date,
        onsetConfidence: onset.confidence ?? 0,
        recommandation:
          seasonal.categorie === 'bonne'
            ? 'Conditions favorables. Preparer semis et intrants.'
            : seasonal.categorie === 'normale'
              ? 'Saison standard probable. Suivi hebdomadaire recommande.'
              : 'Risque eleve. Prioriser varietes resilientes et gestion hydrique.'
      }
    })
  )

  return results
}

async function persistForecasts(rows: ZoneForecast[]) {
  await Promise.all(
    rows.map(async (r) => {
      try {
        // saisonniere snapshot
        await db.prevision.deleteMany({ where: { zoneId: r.id, type: 'saisonniere', periode: r.periode } })
        await db.prevision.create({
          data: {
            zoneId: r.id,
            type: 'saisonniere',
            periode: r.periode,
            categorie: r.categorie,
            probabilite: r.probabilite / 100,
            details: {
              pluieMm: r.pluieMm,
              dateDebutSaison: r.dateDebutSaison,
              onsetConfidence: r.onsetConfidence,
              recommandation: r.recommandation
            },
            source: 'python_backend'
          }
        })

        // onset snapshot
        const onsetYear = new Date().getFullYear()
        await db.prevision.deleteMany({ where: { zoneId: r.id, type: 'debut_saison', periode: String(onsetYear) } })
        await db.prevision.create({
          data: {
            zoneId: r.id,
            type: 'debut_saison',
            periode: String(onsetYear),
            categorie: r.dateDebutSaison ? 'detecte' : 'indetermine',
            probabilite: r.onsetConfidence,
            details: {
              onsetDate: r.dateDebutSaison
            },
            source: 'python_backend'
          }
        })
      } catch {
        // best effort persistence
      }
    })
  )
}

async function getLatestFromDb() {
  const seasonal = await db.prevision.findMany({
    where: { type: 'saisonniere' },
    include: { zone: { select: { id: true, nom: true, latitude: true, longitude: true } } },
    orderBy: { createdAt: 'desc' }
  })

  if (seasonal.length === 0) return []

  return seasonal.map((p) => ({
    id: p.zone.id,
    nom: p.zone.nom,
    latitude: p.zone.latitude,
    longitude: p.zone.longitude,
    categorie: p.categorie as 'bonne' | 'normale' | 'difficile',
    probabilite: Math.round(p.probabilite * 100),
    periode: p.periode,
    pluieMm: (p.details as { pluieMm?: number })?.pluieMm ?? 0,
    dateDebutSaison: (p.details as { dateDebutSaison?: string | null })?.dateDebutSaison ?? null,
    onsetConfidence: (p.details as { onsetConfidence?: number })?.onsetConfidence ?? 0,
    recommandation: (p.details as { recommandation?: string })?.recommandation ?? ''
  }))
}

function getPrevisionsFromDemo() {
  return demoPrevisions.map((p) => {
    const zone = demoZones.find((z) => z.id === p.zoneId)
    return {
      id: p.id,
      nom: zone?.nom ?? 'N/A',
      latitude: zone?.latitude ?? 0,
      longitude: zone?.longitude ?? 0,
      categorie: p.categorie,
      probabilite: p.probabilite,
      periode: p.periode,
      pluieMm: p.pluieMm,
      dateDebutSaison: null,
      onsetConfidence: 0,
      recommandation: p.recommandation
    }
  })
}

export async function GET() {
  try {
    const zones = await getZonesFromDbOrDemo()
    if (zones.length === 0) return NextResponse.json([])

    try {
      const live = await getPrevisionsFromPython(zones)
      await persistForecasts(live)
      return NextResponse.json(live)
    } catch {
      try {
        const rows = await getLatestFromDb()
        if (rows.length > 0) return NextResponse.json(rows)
      } catch {
        // ignore and fallback demo
      }
      return NextResponse.json(getPrevisionsFromDemo())
    }
  } catch {
    return NextResponse.json(getPrevisionsFromDemo())
  }
}
