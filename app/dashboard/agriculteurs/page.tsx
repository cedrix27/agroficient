'use client'

import { useEffect, useMemo, useState } from 'react'
import Toast, { type ToastState } from '@/components/dashboard/Toast'
import ImportCSV, { type ImportedFarmer } from '@/components/forms/ImportCSV'

type Farmer = { id: string; nom: string; telephone: string; zone: string; langue: 'fr' | 'moore' | 'dioula' | 'fulfude'; actif: boolean }

const languageLabel: Record<Farmer['langue'], string> = { fr: 'Francais', moore: 'Moore', dioula: 'Dioula', fulfude: 'Fulfude' }
const PAGE_SIZE = 6

export default function AgriculteursPage() {
  const [rows, setRows] = useState<Farmer[]>([])
  const [zoneFilter, setZoneFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNom, setEditNom] = useState('')
  const [editTelephone, setEditTelephone] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>({ open: false, message: '', type: 'success' })

  async function loadRows(targetPage: number, zone: string) {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ page: String(targetPage), pageSize: String(PAGE_SIZE), zone })
    const res = await fetch(`/api/agriculteurs?${params.toString()}`)
    if (!res.ok) throw new Error('load farmers failed')
    const payload = (await res.json()) as { data: Farmer[]; total: number }
    setRows(payload.data)
    setTotal(payload.total)
    setLoading(false)
  }

  useEffect(() => {
    loadRows(page, zoneFilter).catch(() => {
      setRows([])
      setTotal(0)
      setError('Impossible de charger les agriculteurs.')
      setLoading(false)
    })
  }, [page, zoneFilter])

  const zones = useMemo(() => Array.from(new Set(rows.map((r) => r.zone))).sort(), [rows])
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <section className="farmers-page">
      <Toast toast={toast} onClose={() => setToast((t) => ({ ...t, open: false }))} />
      <header className="zones-head"><div><h1 className="page-title">Agriculteurs</h1><p className="page-subtitle">Table paginee, import CSV et filtre par zone.</p></div></header>
      {loading ? <p className="ui-state">Chargement des agriculteurs...</p> : null}
      {error ? <p className="ui-state error">{error}</p> : null}

      {!loading && !error ? (
        <section className="panel">
          <div className="farmers-controls">
            <label className="filter-label">Filtrer par zone
              <select value={zoneFilter} onChange={(e) => { setZoneFilter(e.target.value); setPage(1) }}>
                <option value="all">Toutes les zones</option>
                {zones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
              </select>
            </label>

            <ImportCSV
              zones={zones}
              onImport={async (imported: ImportedFarmer[]) => {
                const results = await Promise.all(imported.map((item) => fetch('/api/agriculteurs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) })))
                if (results.some((r) => !r.ok)) {
                  setError('Certaines lignes CSV ont ete rejetees (validation ou zone).')
                  setToast({ open: true, type: 'error', message: 'Import partiel: certaines lignes rejetees.' })
                } else {
                  setToast({ open: true, type: 'success', message: 'Import CSV termine.' })
                }
                setPage(1)
                await loadRows(1, zoneFilter)
              }}
            />
          </div>

          {rows.length === 0 ? <p className="ui-state">Aucun agriculteur trouve.</p> : null}

          <div className="table-wrap">
            <table className="zones-table">
              <thead><tr><th>Nom</th><th>Telephone</th><th>Zone</th><th>Langue</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{editingId === row.id ? <input value={editNom} onChange={(e) => setEditNom(e.target.value)} /> : row.nom}</td>
                    <td>{editingId === row.id ? <input value={editTelephone} onChange={(e) => setEditTelephone(e.target.value)} /> : row.telephone}</td>
                    <td>{row.zone}</td>
                    <td>{languageLabel[row.langue] ?? row.langue}</td>
                    <td><span className={`status-chip ${row.actif ? 'on' : 'off'}`}>{row.actif ? 'Actif' : 'Inactif'}</span></td>
                    <td><div className="row-actions">
                      {editingId === row.id ? (<><button className="btn btn-secondary" type="button" onClick={async () => { const resp = await fetch(`/api/agriculteurs/${row.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom: editNom, telephone: editTelephone, zone: row.zone, langue: row.langue, actif: row.actif }) }); if (!resp.ok) { setError('Echec mise a jour agriculteur.'); setToast({ open: true, type: 'error', message: 'Mise a jour agriculteur echouee.' }); return } setEditingId(null); await loadRows(page, zoneFilter); setToast({ open: true, type: 'success', message: 'Agriculteur mis a jour.' }) }}>Save</button><button className="btn btn-secondary" type="button" onClick={() => setEditingId(null)}>Cancel</button></>) : (<><button className="btn btn-secondary" type="button" onClick={() => { setEditingId(row.id); setEditNom(row.nom); setEditTelephone(row.telephone) }}>Edit</button><button className="btn btn-secondary" type="button" onClick={async () => { const resp = await fetch(`/api/agriculteurs/${row.id}`, { method: 'DELETE' }); if (!resp.ok) { setError('Echec suppression agriculteur.'); setToast({ open: true, type: 'error', message: 'Suppression agriculteur echouee.' }); return } await loadRows(page, zoneFilter); setToast({ open: true, type: 'success', message: 'Agriculteur supprime.' }) }}>Delete</button></>)}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pager"><p>Page {page} / {totalPages} - {total} resultat(s)</p><div className="pager-actions"><button className="btn btn-secondary" type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Precedent</button><button className="btn btn-secondary" type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Suivant</button></div></div>
        </section>
      ) : null}
    </section>
  )
}
