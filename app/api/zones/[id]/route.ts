import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { updateZoneSchema } from '@/lib/validation'

type Ctx = { params: { id: string } }

export async function PUT(req: NextRequest, { params }: Ctx) {
  const parsed = updateZoneSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Payload invalide', details: parsed.error.flatten() }, { status: 422 })
  }

  const body = parsed.data

  try {
    const updated = await db.zone.update({
      where: { id: params.id },
      data: {
        nom: body.nom,
        langue: body.langue,
        radiusKm: body.radiusKm,
        latitude: body.latitude,
        longitude: body.longitude,
        cultures: body.cultures
      }
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 503 })
  }
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    await db.zone.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 503 })
  }
}
