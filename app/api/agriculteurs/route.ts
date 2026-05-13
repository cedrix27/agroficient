import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { demoAgriculteurs, demoZones } from '@/lib/demo-data'
import { agriculteurSchema } from '@/lib/validation'

export async function GET(req: NextRequest) {
  const zone = req.nextUrl.searchParams.get('zone')
  const page = Number(req.nextUrl.searchParams.get('page') ?? '1')
  const pageSize = Number(req.nextUrl.searchParams.get('pageSize') ?? '10')
  const skip = (Math.max(1, page) - 1) * Math.max(1, pageSize)

  try {
    const where = zone && zone !== 'all' ? { zone: { nom: zone } } : {}

    const [rows, total] = await Promise.all([
      db.agriculteur.findMany({
        where,
        include: { zone: { select: { nom: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      db.agriculteur.count({ where })
    ])

    return NextResponse.json({
      data: rows.map((r) => ({
        id: r.id,
        nom: r.nom,
        telephone: r.telephone,
        zone: r.zone.nom,
        langue: r.langue,
        actif: r.actif
      })),
      total,
      page,
      pageSize
    })
  } catch {
    const joined = demoAgriculteurs.map((a) => ({
      ...a,
      zone: demoZones.find((z) => z.id === a.zoneId)?.nom ?? 'N/A'
    }))
    const filtered = zone && zone !== 'all' ? joined.filter((j) => j.zone === zone) : joined
    return NextResponse.json({
      data: filtered.slice(skip, skip + pageSize).map((r) => ({
        id: r.id,
        nom: r.nom,
        telephone: r.telephone,
        zone: r.zone,
        langue: r.langue,
        actif: r.actif
      })),
      total: filtered.length,
      page,
      pageSize
    })
  }
}

export async function POST(req: NextRequest) {
  const parsed = agriculteurSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Payload invalide', details: parsed.error.flatten() }, { status: 422 })
  }

  const body = parsed.data

  try {
    const zone = await db.zone.findFirst({ where: { nom: body.zone } })
    if (!zone) return NextResponse.json({ error: 'Zone introuvable' }, { status: 400 })

    const created = await db.agriculteur.create({
      data: {
        nom: body.nom,
        telephone: body.telephone,
        langue: body.langue,
        actif: body.actif,
        zoneId: zone.id
      }
    })

    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Database unavailable. Configure DATABASE_URL and run Prisma migrations.' }, { status: 503 })
  }
}
