'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Toast, { type ToastState } from '@/components/dashboard/Toast'
import ZoneForm from '@/components/forms/ZoneForm'

const BurkinaMap = dynamic(() => import('@/components/map/BurkinaMap'), { ssr: false })

type ZoneRow = {
  id: string
  nom: string
  agriculteurs: number
  langue: 'fr' | 'moore' | 'dioula' | 'fulfude'
  latitude?: number
  longitude?: number
  radiusKm?: number
  derniereAlerte: string | null
}

const languageLabel: Record<ZoneRow['langue'], string> = { fr: 'Francais', moore: 'Moore', dioula: 'Dioula', fulfude: 'Fulfude' }

export default function ZonesPage() {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<ZoneRow[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [adminLevel, setAdminLevel] = useState<'ADM1' | 'ADM2' | 'ADM3'>('ADM2')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNom, setEditNom] = useState('')
  const [editLangue, setEditLangue] = useState<ZoneRow['langue']>('fr')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>({ open: false, message: '', type: 'success' })

  async function loadZones() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/zones')
    if (!res.ok) throw new Error('load zones failed')
    const data = (await res.json()) as ZoneRow[]
    setRows(data)
    setSelectedId((prev) => prev || data[0]?.id || '')
    setLoading(false)
  }

  useEffect(() => {
    loadZones().catch(() => {
      setError('Impossible de charger les zones.')
      setRows([])
      setLoading(false)
    })
  }, [])

  const mapZones = useMemo(
    () => rows.map((r) => ({ id: r.id, nom: r.nom, latitude: r.latitude ?? 12.37, longitude: r.longitude ?? -1.52 })),
    [rows]
  )

  return (
    <section className='zones-page'>
      <Toast toast={toast} onClose={() => setToast((t) => ({ ...t, open: false }))} />
      <header className='zones-head'>
        <div>
          <h1 className='page-title'>Zones</h1>
          <p className='page-subtitle'>Gestion des zones agro-meteo et de leurs populations agricoles.</p>
        </div>
        <button className='btn btn-primary' type='button' onClick={() => setOpen(true)}>Creer une zone</button>
      </header>

      {loading ? <p className='ui-state'>Chargement des zones...</p> : null}
      {error ? <p className='ui-state error'>{error}</p> : null}

      {!loading && !error ? (
        <>
          <section className='panel'>
            <div className='panel-head'>
              <h2>Carte des localites</h2>
              <div className='map-controls'>
                <label className='locality-select'>
                  Niveau admin
                  <select value={adminLevel} onChange={(e) => setAdminLevel(e.target.value as 'ADM1' | 'ADM2' | 'ADM3')}>
                    <option value='ADM1'>Regions (ADM1)</option>
                    <option value='ADM2'>Provinces (ADM2)</option>
                    <option value='ADM3'>Communes (ADM3)</option>
                  </select>
                </label>
              </div>
            </div>
            <div className='leaflet-wrap compact zones-map'>
              <BurkinaMap zones={mapZones} selectedId={selectedId} onSelect={setSelectedId} showAdmin adminLevel={adminLevel} />
            </div>
          </section>

          <section className='panel'>
            {rows.length === 0 ? <p className='ui-state'>Aucune zone enregistree.</p> : null}
            <div className='table-wrap'>
              <table className='zones-table'>
                <thead><tr><th>Nom</th><th>Nb agriculteurs</th><th>Langue</th><th>Derniere alerte</th><th>Actions</th></tr></thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className={selectedId === row.id ? 'row-selected' : ''} onClick={() => setSelectedId(row.id)}>
                      <td>{editingId === row.id ? <input value={editNom} onChange={(e) => setEditNom(e.target.value)} /> : row.nom}</td>
                      <td>{row.agriculteurs}</td>
                      <td>{editingId === row.id ? <select value={editLangue} onChange={(e) => setEditLangue(e.target.value as ZoneRow['langue'])}><option value='fr'>Francais</option><option value='moore'>Moore</option><option value='dioula'>Dioula</option><option value='fulfude'>Fulfude</option></select> : languageLabel[row.langue] ?? row.langue}</td>
                      <td>{row.derniereAlerte ? new Date(row.derniereAlerte).toLocaleDateString('fr-FR') : 'Aucune'}</td>
                      <td><div className='row-actions'>
                        {editingId === row.id ? (<><button className='btn btn-secondary' type='button' onClick={async () => { const resp = await fetch(`/api/zones/${row.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom: editNom, langue: editLangue, radiusKm: row.radiusKm ?? 25, latitude: row.latitude ?? 12, longitude: row.longitude ?? -1, cultures: [] }) }); if (!resp.ok) { setError('Echec mise a jour zone.'); setToast({ open: true, type: 'error', message: 'Mise a jour zone echouee.' }); return } setEditingId(null); await loadZones(); setToast({ open: true, type: 'success', message: 'Zone mise a jour.' }) }}>Save</button><button className='btn btn-secondary' type='button' onClick={() => setEditingId(null)}>Cancel</button></>) : (<><button className='btn btn-secondary' type='button' onClick={(e) => { e.stopPropagation(); setEditingId(row.id); setEditNom(row.nom); setEditLangue(row.langue) }}>Edit</button><button className='btn btn-secondary' type='button' onClick={async (e) => { e.stopPropagation(); const resp = await fetch(`/api/zones/${row.id}`, { method: 'DELETE' }); if (!resp.ok) { setError('Echec suppression zone.'); setToast({ open: true, type: 'error', message: 'Suppression zone echouee.' }); return } await loadZones(); setToast({ open: true, type: 'success', message: 'Zone supprimee.' }) }}>Delete</button></>)}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      {open ? <div className='dialog-overlay' role='presentation' onClick={() => setOpen(false)}><div className='dialog' role='dialog' aria-modal='true' onClick={(e) => e.stopPropagation()}><div className='dialog-head'><h2>Creer une zone</h2><button className='icon-btn' type='button' onClick={() => setOpen(false)} aria-label='Fermer'>x</button></div><ZoneForm onCancel={() => setOpen(false)} onSubmit={async (data) => { const resp = await fetch('/api/zones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, cultures: data.cultures.split(',').map((c) => c.trim()).filter(Boolean) }) }); if (!resp.ok) { setError('Echec creation zone. Verifie les champs.'); setToast({ open: true, type: 'error', message: 'Creation zone echouee.' }); return } await loadZones(); setOpen(false); setToast({ open: true, type: 'success', message: 'Zone creee.' }) }} /></div></div> : null}
    </section>
  )
}
