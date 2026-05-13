'use client'

import { useEffect, useMemo, useState } from 'react'

type Alerte = { id: string; zone: string; type: string; langue: string; envoyes: number; createdAt: string }

export default function AlertesPage() {
  const [rows, setRows] = useState<Alerte[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch('/api/alertes')
      .then(async (res) => {
        if (!res.ok) throw new Error('alertes failed')
        setRows((await res.json()) as Alerte[])
      })
      .catch(() => setError('Impossible de charger les alertes.'))
      .finally(() => setLoading(false))
  }, [])

  const totals = useMemo(() => rows.reduce((acc, cur) => acc + (cur.envoyes ?? 0), 0), [rows])

  return (
    <section className="farmers-page">
      <header className="zones-head"><div><h1 className="page-title">Alertes</h1><p className="page-subtitle">Historique des alertes generees et volumes SMS.</p></div></header>
      {loading ? <p className="ui-state">Chargement des alertes...</p> : null}
      {error ? <p className="ui-state error">{error}</p> : null}
      {!loading && !error ? (
        <section className="panel">
          <p className="page-subtitle">{rows.length} alerte(s) chargee(s), {totals} SMS cumules.</p>
          {rows.length === 0 ? <p className="ui-state">Aucune alerte disponible.</p> : null}
          <div className="table-wrap"><table className="zones-table"><thead><tr><th>Date</th><th>Zone</th><th>Type</th><th>Langue</th><th>SMS envoyes</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{new Date(row.createdAt).toLocaleString('fr-FR')}</td><td>{row.zone}</td><td>{row.type}</td><td>{row.langue}</td><td>{row.envoyes}</td></tr>)}</tbody></table></div>
        </section>
      ) : null}
    </section>
  )
}
