import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { updateAgriculteurSchema } from '@/lib/validation'

type Ctx = { params: { id: string } }

export async function PUT(req: NextRequest, { params }: Ctx) {
  const parsed = updateAgriculteurSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Payload invalide', details: parsed.error.flatten() }, { status: 422 })
  }

  const body = parsed.data

  try {
    let zoneId: string | undefined
    if (body.zone) {
      const zone = await db.zone.findFirst({ where: { nom: body.zone } })
      if (!zone) return NextResponse.json({ error: 'Zone introuvable' }, { status: 400 })
      zoneId = zone.id
    }

    const updated = await db.agriculteur.update({
      where: { id: params.id },
      data: {
        nom: body.nom,
        telephone: body.telephone,
        langue: body.langue,
        actif: body.actif,
        zoneId
      }
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 503 })
  }
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    await db.agriculteur.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 503 })
  }
}
