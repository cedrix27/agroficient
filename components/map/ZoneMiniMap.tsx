'use client'

import dynamic from 'next/dynamic'
import type { BurkinaZone } from '@/components/map/BurkinaMap'

const BurkinaMap = dynamic(() => import('@/components/map/BurkinaMap'), { ssr: false })

export type ZoneMapItem = {
  id: string
  nom: string
  latitude: number
  longitude: number
  niveau: 'bonne' | 'normale' | 'difficile'
}

export default function ZoneMiniMap({ zones }: { zones: ZoneMapItem[] }) {
  const mapped: BurkinaZone[] = zones.map((z) => ({
    id: z.id,
    nom: z.nom,
    latitude: z.latitude,
    longitude: z.longitude,
    categorie: z.niveau
  }))

  return (
    <section className='panel'>
      <div className='panel-head'>
        <h2>Carte des zones</h2>
        <p>Satellite + repères Burkina</p>
      </div>
      <div className='leaflet-wrap compact'>
        <BurkinaMap zones={mapped} compact />
      </div>
      <div className='legend'>
        <span><i className='dot bonne' /> Bonne</span>
        <span><i className='dot normale' /> Normale</span>
        <span><i className='dot difficile' /> Difficile</span>
      </div>
    </section>
  )
}
