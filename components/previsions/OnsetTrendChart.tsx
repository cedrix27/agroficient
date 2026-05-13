'use client'

type OnsetHistory = {
  requestedYear: number
  effectiveYear: number
  onsetDate: string | null
  confidence: number
}

function dayOfYear(dateStr: string) {
  const d = new Date(dateStr)
  const start = new Date(d.getFullYear(), 0, 0)
  const diff = d.getTime() - start.getTime()
  return Math.floor(diff / 86400000)
}

export default function OnsetTrendChart({ history }: { history: OnsetHistory[] }) {
  const points = history
    .filter((h) => h.onsetDate)
    .map((h) => ({ year: h.requestedYear, doy: dayOfYear(h.onsetDate as string), date: h.onsetDate as string }))
    .sort((a, b) => a.year - b.year)

  if (points.length < 2) {
    return <p className='chart-empty'>Pas assez de points pour afficher la tendance.</p>
  }

  const width = 520
  const height = 180
  const padX = 40
  const padY = 24

  const minYear = points[0].year
  const maxYear = points[points.length - 1].year
  const minDoy = Math.min(...points.map((p) => p.doy))
  const maxDoy = Math.max(...points.map((p) => p.doy))

  const x = (year: number) => {
    if (maxYear === minYear) return width / 2
    return padX + ((year - minYear) / (maxYear - minYear)) * (width - padX * 2)
  }

  const y = (doy: number) => {
    if (maxDoy === minDoy) return height / 2
    return height - padY - ((doy - minDoy) / (maxDoy - minDoy)) * (height - padY * 2)
  }

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.year).toFixed(2)} ${y(p.doy).toFixed(2)}`)
    .join(' ')

  return (
    <div className='onset-chart'>
      <svg viewBox={`0 0 ${width} ${height}`} role='img' aria-label='Tendance debut saison'>
        <rect x='0' y='0' width={width} height={height} rx='10' fill='#f8fafc' stroke='#e2e8f0' />

        <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke='#94a3b8' strokeWidth='1' />
        <line x1={padX} y1={padY} x2={padX} y2={height - padY} stroke='#94a3b8' strokeWidth='1' />

        <path d={path} fill='none' stroke='#2563eb' strokeWidth='2.5' />

        {points.map((p) => (
          <g key={p.year}>
            <circle cx={x(p.year)} cy={y(p.doy)} r='4' fill='#1d4ed8' />
            <text x={x(p.year)} y={height - 8} textAnchor='middle' fontSize='10' fill='#334155'>
              {p.year}
            </text>
          </g>
        ))}

        <text x={12} y={16} fontSize='10' fill='#475569'>Jour de l'annee</text>
      </svg>
    </div>
  )
}
