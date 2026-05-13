'use client'

import { useEffect, useMemo, useState } from 'react'
import AlertesFeed, { type AlertItem } from '@/components/dashboard/AlertesFeed'
import StatsCard from '@/components/dashboard/StatsCard'
import ZoneMiniMap, { type ZoneMapItem } from '@/components/map/ZoneMiniMap'

type ZoneApi = { id: string; nom: string; latitude: number; longitude: number; agriculteurs: number }
type AlerteApi = { id: string; zone: string; type: AlertItem['type']; langue: AlertItem['langue']; envoyes: number; createdAt: string }

export default function DashboardHomePage() {
  const [zones, setZones] = useState<ZoneApi[]>([])
  const [alertes, setAlertes] = useState<AlerteApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([fetch('/api/zones'), fetch('/api/alertes')])
      .then(async ([z, a]) => {
        if (!z.ok || !a.ok) throw new Error('Erreur API dashboard')
        setZones((await z.json()) as ZoneApi[])
        setAlertes((await a.json()) as AlerteApi[])
      })
      .catch(() => setError('Impossible de charger les donnees du dashboard.'))
      .finally(() => setLoading(false))
  }, [])

  const smsMonth = useMemo(() => alertes.reduce((acc, cur) => acc + (Number.isFinite(cur.envoyes) ? cur.envoyes : 0), 0), [alertes])
  const farmersTotal = useMemo(() => zones.reduce((acc, cur) => acc + (cur.agriculteurs ?? 0), 0), [zones])

  const latestAlerts: AlertItem[] = alertes.slice(0, 5).map((a) => ({ ...a, createdAt: new Date(a.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) }))
  const mapZones: ZoneMapItem[] = zones.map((z, idx) => ({ id: z.id, nom: z.nom, latitude: z.latitude, longitude: z.longitude, niveau: (idx % 3 === 0 ? 'bonne' : idx % 3 === 1 ? 'normale' : 'difficile') as ZoneMapItem['niveau'] }))

  const stats = [
    { title: 'Zones actives', value: String(zones.length), hint: 'Zones suivies actuellement', trend: 'neutral' as const },
    { title: 'Agriculteurs inscrits', value: String(farmersTotal), hint: 'Total rattache aux zones', trend: 'up' as const },
    { title: 'SMS envoyes (recent)', value: String(smsMonth), hint: 'Somme des alertes chargees', trend: 'neutral' as const },
    { title: 'Prochaine alerte', value: 'Demain 06:00', hint: 'Routine quotidienne', trend: 'neutral' as const }
  ]

  return (
    <section className="dashboard-home">
      <header>
        <h1 className="page-title">Vue d'ensemble</h1>
        <p className="page-subtitle">Synthese operationnelle des zones, alertes SMS et risque agro-meteo.</p>
      </header>

      {loading ? <p className="ui-state">Chargement des donnees...</p> : null}
      {error ? <p className="ui-state error">{error}</p> : null}

      {!loading && !error ? (
        <>
          <div className="stats-grid">
            {stats.map((item) => (
              <StatsCard key={item.title} title={item.title} value={item.value} hint={item.hint} trend={item.trend} />
            ))}
          </div>

          {zones.length === 0 && alertes.length === 0 ? (
            <p className="ui-state">Aucune donnee disponible pour le moment.</p>
          ) : (
            <div className="home-grid">
              <AlertesFeed items={latestAlerts} />
              <ZoneMiniMap zones={mapZones} />
            </div>
          )}
        </>
      ) : null}
    </section>
  )
}
