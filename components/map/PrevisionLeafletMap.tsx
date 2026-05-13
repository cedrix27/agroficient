'use client'

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet'

export type ForecastZoneMapItem = {
  id: string
  nom: string
  latitude: number
  longitude: number
  categorie: 'bonne' | 'normale' | 'difficile'
  probabilite: number
}

function colorFor(c: ForecastZoneMapItem['categorie']) {
  if (c === 'bonne') return '#16a34a'
  if (c === 'normale') return '#f59e0b'
  return '#dc2626'
}

export default function PrevisionLeafletMap({
  zones,
  selectedId,
  onSelect
}: {
  zones: ForecastZoneMapItem[]
  selectedId?: string
  onSelect: (id: string) => void
}) {
  const center: LatLngExpression = [12.37, -1.52]
  const burkinaBounds: LatLngBoundsExpression = [
    [9.35, -5.6],
    [15.2, 2.6]
  ]

  return (
    <MapContainer center={center} zoom={6} className="leaflet-map" scrollWheelZoom maxBounds={burkinaBounds}>
      <TileLayer
        attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />

      {zones.map((zone) => {
        const selected = selectedId === zone.id
        return (
          <CircleMarker
            key={zone.id}
            center={[zone.latitude, zone.longitude]}
            radius={selected ? 12 : 9}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: colorFor(zone.categorie),
              fillOpacity: 0.95
            }}
            eventHandlers={{ click: () => onSelect(zone.id) }}
          >
            <Popup>
              <strong>{zone.nom}</strong>
              <br />
              Categorie: {zone.categorie}
              <br />
              Probabilite: {zone.probabilite}%
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
