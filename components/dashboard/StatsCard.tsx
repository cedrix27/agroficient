type StatsCardProps = {
  title: string
  value: string
  hint: string
  trend?: 'up' | 'down' | 'neutral'
}

export default function StatsCard({ title, value, hint, trend = 'neutral' }: StatsCardProps) {
  return (
    <article className="stats-card">
      <p className="stats-title">{title}</p>
      <p className="stats-value">{value}</p>
      <p className={`stats-hint ${trend}`}>{hint}</p>
    </article>
  )
}
