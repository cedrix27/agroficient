'use client'

import { useEffect, useMemo, useState } from 'react'

type StatusPayload = {
  ok: boolean
  generatedAt?: string
  healthLevel?: 'good' | 'warning' | 'critical'
  healthFlags?: {
    staleDataOver36h: boolean
    noEntriesLast24h: boolean
    lowCoverage: boolean
  }
  dataFreshness?: {
    lastPrevisionAt: string | null
    stalenessHours: number | null
    entriesLast24h: number
  }
  coverage?: {
    zonesTotal: number
    zonesWithSeasonalData: number
    coverageRatio: number
  }
  cron?: {
    lastRunAt: string | null
    lastSuccessAt: string | null
    lastFailureAt: string | null
    lastOutcome: 'success' | 'failure' | 'never'
    lastError: string | null
  }
  volumesByType?: { type: string; count: number }[]
  evaluation?: {
    onsetEvaluation?: { method: string; samples: number; maeDays: number | null }
    seasonalDistribution?: { zones: number; classes: { bonne: number; normale: number; difficile: number; other: number }; avgConfidencePct: number | null }
  }
  error?: string
  details?: string
}

function toneToLabel(level?: 'good' | 'warning' | 'critical') {
  if (level === 'critical') return { label: 'Critique', cls: 'critical' }
  if (level === 'warning') return { label: 'Alerte', cls: 'warning' }
  return { label: 'Sain', cls: 'good' }
}

export default function PipelinePage() {
  const [data, setData] = useState<StatusPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [statusRes, evalRes] = await Promise.all([
        fetch('/api/cron/status', { cache: 'no-store' }),
        fetch('/api/previsions/eval?years=6', { cache: 'no-store' })
      ])
      const payload = (await statusRes.json()) as StatusPayload
      const evalPayload = await evalRes.json()
      if (!statusRes.ok || !payload.ok) throw new Error(payload.error || 'status failed')
      payload.evaluation = {
        onsetEvaluation: evalPayload?.onsetEvaluation,
        seasonalDistribution: evalPayload?.seasonalDistribution
      }
      setData(payload)
    } catch (e) {
      setError(String(e))
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const tone = useMemo(() => toneToLabel(data?.healthLevel), [data?.healthLevel])

  return (
    <section className='pipeline-page'>
      <header className='zones-head'>
        <div>
          <h1 className='page-title'>Sante pipeline</h1>
          <p className='page-subtitle'>Surveillance quotidienne des calculs previsionnels avant couche ML.</p>
        </div>
        <button className='btn btn-secondary' type='button' onClick={load}>Rafraichir</button>
      </header>

      {loading ? <p className='ui-state'>Chargement statut pipeline...</p> : null}
      {error ? <p className='ui-state error'>Erreur: {error}</p> : null}

      {!loading && !error && data ? (
        <>
          <section className='panel pipeline-health'>
            <div>
              <p className='pipeline-label'>Etat global</p>
              <h2 className={`pipeline-state ${tone.cls}`}>{tone.label}</h2>
            </div>
            <p className='page-subtitle'>Genere le {data.generatedAt ? new Date(data.generatedAt).toLocaleString('fr-FR') : 'N/A'}</p>
          </section>

          <div className='stats-grid'>
            <article className='stats-card'>
              <p className='stats-title'>Derniere prevision</p>
              <p className='stats-value small'>{data.dataFreshness?.lastPrevisionAt ? new Date(data.dataFreshness.lastPrevisionAt).toLocaleString('fr-FR') : 'N/A'}</p>
              <p className='stats-hint'>Anciennete: {data.dataFreshness?.stalenessHours ?? 'N/A'} h</p>
            </article>
            <article className='stats-card'>
              <p className='stats-title'>Entrees 24h</p>
              <p className='stats-value'>{data.dataFreshness?.entriesLast24h ?? 0}</p>
            </article>
            <article className='stats-card'>
              <p className='stats-title'>Zones couvertes</p>
              <p className='stats-value'>{data.coverage?.zonesWithSeasonalData ?? 0}/{data.coverage?.zonesTotal ?? 0}</p>
              <p className='stats-hint'>Couverture: {Math.round((data.coverage?.coverageRatio ?? 0) * 100)}%</p>
            </article>
            <article className='stats-card'>
              <p className='stats-title'>Dernier cron</p>
              <p className={`stats-value small ${data.cron?.lastOutcome === 'failure' ? 'cron-fail' : data.cron?.lastOutcome === 'success' ? 'cron-ok' : ''}`}>
                {data.cron?.lastOutcome ?? 'never'}
              </p>
              <p className='stats-hint'>Run: {data.cron?.lastRunAt ? new Date(data.cron.lastRunAt).toLocaleString('fr-FR') : 'N/A'}</p>
            </article>
          </div>

          <section className='panel'>
            <div className='panel-head'><h2>Seuils d'alerte</h2></div>
            <div className='alerts-grid'>
              <p className={data.healthFlags?.staleDataOver36h ? 'flag-on' : 'flag-off'}>
                Donnees &gt; 36h: {data.healthFlags?.staleDataOver36h ? 'OUI' : 'NON'}
              </p>
              <p className={data.healthFlags?.noEntriesLast24h ? 'flag-on' : 'flag-off'}>
                Aucune entree 24h: {data.healthFlags?.noEntriesLast24h ? 'OUI' : 'NON'}
              </p>
              <p className={data.healthFlags?.lowCoverage ? 'flag-on' : 'flag-off'}>
                Couverture faible (&lt;80%): {data.healthFlags?.lowCoverage ? 'OUI' : 'NON'}
              </p>
            </div>
            {data.cron?.lastOutcome === 'failure' && data.cron?.lastError ? (
              <p className='ui-state error'>Derniere erreur cron: {data.cron.lastError}</p>
            ) : null}
          </section>

          <section className='panel'>
            <div className='panel-head'><h2>Baseline evaluation (pre-ML)</h2></div>
            <div className='stats-grid'>
              <article className='stats-card'>
                <p className='stats-title'>Onset MAE (jours)</p>
                <p className='stats-value'>{data.evaluation?.onsetEvaluation?.maeDays ?? 'N/A'}</p>
                <p className='stats-hint'>Samples: {data.evaluation?.onsetEvaluation?.samples ?? 0}</p>
              </article>
              <article className='stats-card'>
                <p className='stats-title'>Confiance saisonniere moyenne</p>
                <p className='stats-value'>{data.evaluation?.seasonalDistribution?.avgConfidencePct ?? 'N/A'}%</p>
                <p className='stats-hint'>Zones: {data.evaluation?.seasonalDistribution?.zones ?? 0}</p>
              </article>
              <article className='stats-card'>
                <p className='stats-title'>Classes (bonne/normale/difficile)</p>
                <p className='stats-value small'>
                  {data.evaluation?.seasonalDistribution?.classes.bonne ?? 0} / {data.evaluation?.seasonalDistribution?.classes.normale ?? 0} / {data.evaluation?.seasonalDistribution?.classes.difficile ?? 0}
                </p>
              </article>
            </div>
          </section>

          <section className='panel'>
            <div className='panel-head'><h2>Volumes par type</h2></div>
            <div className='table-wrap'>
              <table className='zones-table'>
                <thead><tr><th>Type</th><th>Volume</th></tr></thead>
                <tbody>
                  {(data.volumesByType ?? []).map((row) => (
                    <tr key={row.type}><td>{row.type}</td><td>{row.count}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </section>
  )
}
