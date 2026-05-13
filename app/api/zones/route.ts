import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { demoOrganisationId, demoZones, demoAlertes, demoAgriculteurs } from '@/lib/demo-data'
import { zoneSchema } from '@/lib/validation'

export async function GET() {
  try {
    const zones = await db.zone.findMany({
      include: {
        _count: { select: { agriculteurs: true } },
        alertes: { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(
      zones.map((z) => ({
        id: z.id,
        nom: z.nom,
        langue: z.langue,
        latitude: z.latitude,
        longitude: z.longitude,
        radiusKm: z.radiusKm,
        agriculteurs: z._count.agriculteurs,
        derniereAlerte: z.alertes[0]?.createdAt ?? null
      }))
    )
  } catch {
    return NextResponse.json(
      demoZones.map((z) => ({
        id: z.id,
        nom: z.nom,
        langue: z.langue,
        latitude: z.latitude,
        longitude: z.longitude,
        radiusKm: z.radiusKm,
        agriculteurs: demoAgriculteurs.filter((a) => a.zoneId === z.id).length,
        derniereAlerte: demoAlertes.find((a) => a.zoneId === z.id)?.createdAt ?? null
      }))
    )
  }
}

export async function POST(req: NextRequest) {
  const parsed = zoneSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Payload invalide', details: parsed.error.flatten() }, { status: 422 })
  }

  const body = parsed.data

  try {
    const created = await db.zone.create({
      data: {
        nom: body.nom,
        langue: body.langue,
        radiusKm: body.radiusKm,
        latitude: body.latitude,
        longitude: body.longitude,
        cultures: body.cultures,
        organisationId: body.organisationId ?? demoOrganisationId
      }
    })

    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Database unavailable. Configure DATABASE_URL and run Prisma migrations.' }, { status: 503 })
  }
}
