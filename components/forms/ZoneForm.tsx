'use client'

import { useMemo, useState } from 'react'

type ZoneFormValues = {
  nom: string
  langue: 'fr' | 'moore' | 'dioula' | 'fulfude'
  radiusKm: number
  latitude: number
  longitude: number
  cultures: string
}

type ZoneFormProps = {
  onCancel: () => void
  onSubmit: (data: ZoneFormValues) => void
}

const defaultValues: ZoneFormValues = {
  nom: '',
  langue: 'fr',
  radiusKm: 25,
  latitude: 12.37,
  longitude: -1.52,
  cultures: 'mil, sorgho'
}

function projectToLatLon(xPct: number, yPct: number) {
  const lon = (xPct / 100) * 11 - 6
  const lat = 16 - (yPct / 100) * 6
  return { lat, lon }
}

function projectToCanvas(lat: number, lon: number) {
  const x = ((lon + 6) / 11) * 100
  const y = ((16 - lat) / 6) * 100
  return { x, y }
}

export default function ZoneForm({ onCancel, onSubmit }: ZoneFormProps) {
  const [values, setValues] = useState<ZoneFormValues>(defaultValues)

  const pin = useMemo(() => projectToCanvas(values.latitude, values.longitude), [values.latitude, values.longitude])

  return (
    <form
      className="zone-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(values)
      }}
    >
      <div className="form-grid">
        <label>
          Nom de la zone
          <input
            value={values.nom}
            onChange={(e) => setValues((v) => ({ ...v, nom: e.target.value }))}
            placeholder="Ex: Kaya Centre"
            required
          />
        </label>

        <label>
          Langue principale
          <select
            value={values.langue}
            onChange={(e) => setValues((v) => ({ ...v, langue: e.target.value as ZoneFormValues['langue'] }))}
          >
            <option value="fr">Francais</option>
            <option value="moore">Moore</option>
            <option value="dioula">Dioula</option>
            <option value="fulfude">Fulfude</option>
          </select>
        </label>

        <label>
          Rayon (km)
          <input
            type="number"
            min={1}
            max={150}
            value={values.radiusKm}
            onChange={(e) => setValues((v) => ({ ...v, radiusKm: Number(e.target.value) }))}
            required
          />
        </label>

        <label>
          Cultures
          <input
            value={values.cultures}
            onChange={(e) => setValues((v) => ({ ...v, cultures: e.target.value }))}
            placeholder="mil, sorgho, niebe"
            required
          />
        </label>
      </div>

      <div>
        <p className="map-help">Cliquez la carte pour definir la position de la zone.</p>
        <div
          className="zone-picker-map"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const xPct = ((e.clientX - rect.left) / rect.width) * 100
            const yPct = ((e.clientY - rect.top) / rect.height) * 100
            const { lat, lon } = projectToLatLon(xPct, yPct)
            setValues((v) => ({ ...v, latitude: Number(lat.toFixed(4)), longitude: Number(lon.toFixed(4)) }))
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return
            e.preventDefault()
          }}
        >
          <span className="zone-dot normale" style={{ left: `${pin.x}%`, top: `${pin.y}%` }} />
        </div>
      </div>

      <div className="coord-row">
        <label>
          Latitude
          <input
            type="number"
            step="0.0001"
            value={values.latitude}
            onChange={(e) => setValues((v) => ({ ...v, latitude: Number(e.target.value) }))}
            required
          />
        </label>

        <label>
          Longitude
          <input
            type="number"
            step="0.0001"
            value={values.longitude}
            onChange={(e) => setValues((v) => ({ ...v, longitude: Number(e.target.value) }))}
            required
          />
        </label>
      </div>

      <div className="dialog-actions">
        <button className="btn btn-secondary" type="button" onClick={onCancel}>
          Annuler
        </button>
        <button className="btn btn-primary" type="submit">
          Creer la zone
        </button>
      </div>
    </form>
  )
}
