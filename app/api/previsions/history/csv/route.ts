import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const zoneId = req.nextUrl.searchParams.get('zoneId')
  const years = req.nextUrl.searchParams.get('years') ?? '6'

  if (!zoneId) {
    return NextResponse.json({ error: 'zoneId requis' }, { status: 400 })
  }

  const origin = new URL(req.url).origin
  const upstream = await fetch(`${origin}/api/previsions/history?zoneId=${encodeURIComponent(zoneId)}&years=${encodeURIComponent(years)}`, {
    cache: 'no-store'
  })

  if (!upstream.ok) {
    const body = await upstream.text()
    return NextResponse.json({ error: 'history fetch failed', details: body }, { status: 502 })
  }

  const payload = (await upstream.json()) as {
    zone: { id: string; nom: string }
    history: Array<{
      requestedYear: number
      effectiveYear: number
      onsetDate: string | null
      confidence: number
      source: string
    }>
  }

  const header = ['zone_id', 'zone_nom', 'requested_year', 'effective_year', 'onset_date', 'confidence', 'source']
  const rows = payload.history.map((h) => [
    payload.zone.id,
    payload.zone.nom,
    String(h.requestedYear),
    String(h.effectiveYear),
    h.onsetDate ?? '',
    String(h.confidence ?? 0),
    h.source ?? ''
  ])

  const csv = [header, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="onset-history-${payload.zone.id}.csv"`
    }
  })
}
