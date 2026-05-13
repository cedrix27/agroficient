import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { demoAlertes, demoZones } from '@/lib/demo-data'

export async function GET() {
  try {
    const rows = await db.alerte.findMany({
      include: { zone: { select: { nom: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    return NextResponse.json(
      rows.map((a) => ({
        id: a.id,
        zone: a.zone.nom,
        type: a.type,
        langue: a.langue,
        envoyes: a.envoyes,
        createdAt: a.createdAt
      }))
    )
  } catch {
    return NextResponse.json(
      demoAlertes.map((a) => ({
        ...a,
        zone: demoZones.find((z) => z.id === a.zoneId)?.nom ?? 'N/A'
      }))
    )
  }
}
