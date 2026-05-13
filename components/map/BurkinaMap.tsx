'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, Polygon, GeoJSON } from 'react-leaflet'
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet'
import type { FeatureCollection, Geometry } from 'geojson'

export type BurkinaZone = {
  id: string
  nom: string
  latitude: number
  longitude: number
  categorie?: 'bonne' | 'normale' | 'difficile'
  probabilite?: number
  pluieMm?: number
}

const cityLabels = [
  { name: 'Ouagadougou', lat: 12.3714, lon: -1.5197 },
  { name: 'Bobo-Dioulasso', lat: 11.1771, lon: -4.2979 },
  { name: 'Dori', lat: 14.0349, lon: -0.0345 },
  { name: 'Kaya', lat: 13.0917, lon: -1.0844 }
]

const burkinaApprox: [number, number][] = [
  [14.6, -5.4],
  [15.1, -2.8],
  [14.7, 1.7],
  [13.6, 2.2],
  [11.1, 1.9],
  [9.8, -2.0],
  [10.0, -5.3],
  [12.9, -5.5]
]

function colorFor(c?: BurkinaZone['categorie']) {
  if (c === 'bonne') return '#16a34a'
  if (c === 'normale') return '#f59e0b'
  if (c === 'difficile') return '#dc2626'
  return '#0ea5e9'
}

function geoStyle(adminLevel: 'ADM1' | 'ADM2' | 'ADM3') {
  if (adminLevel === 'ADM1') return { color: '#f8fafc', weight: 2, fillOpacity: 0.03 }
  if (adminLevel === 'ADM2') return { color: '#cbd5e1', weight: 1.3, fillOpacity: 0.02 }
  return { color: '#94a3b8', weight: 0.8, fillOpacity: 0.01, dashArray: '5 4' }
}

export default function BurkinaMap({
  zones,
  selectedId,
  onSelect,
  compact = false,
  showAdmin = true,
  adminLevel = 'ADM2'
}: {
  zones: BurkinaZone[]
  selectedId?: string
  onSelect?: (id: string) => void
  compact?: boolean
  showAdmin?: boolean
  adminLevel?: 'ADM1' | 'ADM2' | 'ADM3'
}) {
  const center: LatLngExpression = [12.37, -1.52]
  const bounds: LatLngBoundsExpression = [
    [9.3, -5.8],
    [15.3, 2.8]
  ]
  const [adminGeoJson, setAdminGeoJson] = useState<FeatureCollection<Geometry> | null>(null)

  useEffect(() => {
    if (!showAdmin) {
      setAdminGeoJson(null)
      return
    }

    const file = `/geo/bfa_${adminLevel.toLowerCase()}.geojson`
    fetch(file)
      .then((r) => r.json())
      .then((json: FeatureCollection<Geometry>) => setAdminGeoJson(json))
      .catch(() => setAdminGeoJson(null))
  }, [adminLevel, showAdmin])

  return (
    <MapContainer center={center} zoom={compact ? 5 : 6} className={compact ? 'leaflet-map compact' : 'leaflet-map'} scrollWheelZoom={!compact} maxBounds={bounds}>
      <TileLayer
        attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
        url='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      />

      <Polygon positions={burkinaApprox} pathOptions={{ color: '#22c55e', weight: 2, fillColor: '#22c55e', fillOpacity: 0.05 }} />

      {adminGeoJson ? (
        <GeoJSON
          data={adminGeoJson}
          style={() => geoStyle(adminLevel)}
          onEachFeature={(feature, layer) => {
            const props = feature.properties as Record<string, unknown> | null
            const name =
              (props?.shapeName as string | undefined) ??
              (props?.ADM1_FR as string | undefined) ??
              (props?.ADM2_FR as string | undefined) ??
              (props?.ADM3_FR as string | undefined) ??
              (props?.shapeName_en as string | undefined) ??
              'Subdivision'
            layer.bindTooltip(name, { sticky: true, opacity: 0.9, className: 'admin-label' })
          }}
        />
      ) : null}

      {cityLabels.map((c) => (
        <CircleMarker key={c.name} center={[c.lat, c.lon]} radius={2} pathOptions={{ color: '#e2e8f0', fillColor: '#e2e8f0', fillOpacity: 0.8 }}>
          <Tooltip direction='top' offset={[0, -6]} opacity={0.9} permanent={!compact}>
            {c.name}
          </Tooltip>
        </CircleMarker>
      ))}

      {zones.map((z) => {
        const selected = selectedId === z.id
        return (
          <CircleMarker
            key={z.id}
            center={[z.latitude, z.longitude]}
            radius={selected ? 11 : compact ? 7 : 9}
            pathOptions={{ color: '#fff', weight: 2, fillColor: colorFor(z.categorie), fillOpacity: 0.95 }}
            eventHandlers={{ click: () => onSelect?.(z.id) }}
          >
            <Tooltip direction='top' offset={[0, -8]}>
              <div>
                <strong>{z.nom}</strong>
                {z.categorie ? <div>Categorie: {z.categorie}</div> : null}
                {typeof z.probabilite === 'number' ? <div>Probabilite: {z.probabilite}%</div> : null}
                {typeof z.pluieMm === 'number' ? <div>Pluie: {z.pluieMm} mm</div> : null}
              </div>
            </Tooltip>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
