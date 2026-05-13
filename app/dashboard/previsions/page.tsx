'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import OnsetTrendChart from '@/components/previsions/OnsetTrendChart'

const BurkinaMap = dynamic(() => import('@/components/map/BurkinaMap'), { ssr: false })

type ForecastZone = {
  id: string
  nom: string
  latitude: number
  longitude: number
  categorie: 'bonne' | 'normale' | 'difficile'
  probabilite: number
  periode: string
  pluieMm: number
  recommandation: string
  dateDebutSaison: string | null
}

type OnsetHistory = {
  requestedYear: number
  effectiveYear: number
  onsetDate: string | null
  confidence: number
  source: 'db-cache' | 'python-live' | 'unavailable' | string
}

const categoryLabel: Record<ForecastZone['categorie'], string> = {
  bonne: 'Bonne saison',
  normale: 'Saison normale',
  difficile: 'Saison difficile'
}

export default function PrevisionsPage() {
  const [zones, setZones] = useState<ForecastZone[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [adminLevel, setAdminLevel] = useState<'ADM1' | 'ADM2' | 'ADM3'>('ADM2')
  const [history, setHistory] = useState<OnsetHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch('/api/previsions')
      .then(async (res) => {
        if (!res.ok) throw new Error('previsions failed')
        const data = (await res.json()) as ForecastZone[]
        setZones(data)
        if (data[0]) setSelectedId(data[0].id)
      })
      .catch(() => setError('Impossible de charger les previsions.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setHistory([])
      return
    }
    setHistoryLoading(true)
    fetch(`/api/previsions/history?zoneId=${selectedId}&years=6`)
      .then(async (res) => {
        if (!res.ok) throw new Error('history failed')
        const payload = (await res.json()) as { history: OnsetHistory[] }
        setHistory(payload.history ?? [])
      })
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [selectedId])

  const selected = useMemo(() => zones.find((z) => z.id === selectedId) ?? zones[0], [selectedId, zones])

  return (
    <section className='previsions-v2'>
      <header className='previsions-v2-head'>
        <div>
          <h1 className='page-title'>Previsions Agro-Meteo</h1>
          <p className='page-subtitle'>Fond satellite, subdivisions officielles et analyse localisee par zone.</p>
        </div>

        <div className='map-controls'>
          <label className='locality-select'>
            Localite
            <select value={selected?.id ?? ''} onChange={(e) => setSelectedId(e.target.value)} disabled={zones.length === 0}>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.nom}</option>
              ))}
            </select>
          </label>

          <label className='locality-select'>
            Niveau admin
            <select value={adminLevel} onChange={(e) => setAdminLevel(e.target.value as 'ADM1' | 'ADM2' | 'ADM3')}>
              <option value='ADM1'>Regions (ADM1)</option>
              <option value='ADM2'>Provinces (ADM2)</option>
              <option value='ADM3'>Communes (ADM3)</option>
            </select>
          </label>
        </div>
      </header>

      {loading ? <p className='ui-state'>Chargement des previsions...</p> : null}
      {error ? <p className='ui-state error'>{error}</p> : null}

      {!loading && !error ? zones.length === 0 ? <p className='ui-state'>Aucune prevision disponible.</p> : (
        <div className='previsions-v2-grid'>
          <section className='panel map-panel-v2'>
            <div className='panel-head'>
              <h2>Carte Burkina Faso</h2>
              <p>Clique une zone pour voir son analyse</p>
            </div>
            <div className='leaflet-wrap'>
              <BurkinaMap zones={zones} selectedId={selected?.id} onSelect={setSelectedId} showAdmin adminLevel={adminLevel} />
            </div>
            <div className='legend'>
              <span><i className='dot bonne' /> Bonne</span>
              <span><i className='dot normale' /> Normale</span>
              <span><i className='dot difficile' /> Difficile</span>
            </div>
          </section>

          {selected ? (
            <aside className='panel details-v2'>
              <div className='details-title-row'>
                <h2>{selected.nom}</h2>
                <span className={`forecast-chip ${selected.categorie}`}>{categoryLabel[selected.categorie]}</span>
              </div>
              <div className='details-kpis'>
                <article><p>Periode</p><strong>{selected.periode}</strong></article>
                <article><p>Probabilite</p><strong>{selected.probabilite}%</strong></article>
                <article><p>Pluie estimee</p><strong>{selected.pluieMm} mm</strong></article>
                <article><p>Coordonnees</p><strong>{selected.latitude}, {selected.longitude}</strong></article>
                <article><p>Debut saison (est.)</p><strong>{selected.dateDebutSaison ? new Date(selected.dateDebutSaison).toLocaleDateString('fr-FR') : 'N/A'}</strong></article>
              </div>
              <section className='recommendation'>
                <h3>Recommandation operationnelle</h3>
                <p>{selected.recommandation}</p>
              </section>


              <section className='recommendation'>
                <h3>Historique debut de saison</h3>
                {selected ? (
                  <a
                    className='btn btn-secondary export-btn'
                    href={`/api/previsions/history/csv?zoneId=${selected.id}&years=6`}
                  >
                    Export CSV historique
                  </a>
                ) : null}
                <OnsetTrendChart history={history} />
                {historyLoading ? <p>Chargement historique...</p> : null}
                {!historyLoading ? (
                  <div className='table-wrap'>
                    <table className='zones-table onset-history'>
                      <thead>
                        <tr>
                          <th>Annee demandee</th>
                          <th>Annee effective</th>
                          <th>Date estimee</th>
                          <th>Confiance</th>
                          <th>Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((h) => (
                          <tr key={`${h.requestedYear}-${h.effectiveYear}`}>
                            <td>{h.requestedYear}</td>
                            <td>{h.effectiveYear}</td>
                            <td>{h.onsetDate ? new Date(h.onsetDate).toLocaleDateString('fr-FR') : 'N/A'}</td>
                            <td>{Math.round((h.confidence ?? 0) * 100)}%</td>
                            <td><span className={`history-source ${h.source}`}>{h.source}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </section>
            </aside>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
