export type AdminFeature = {
  id: string
  name: string
  level: 'region' | 'province'
  center: [number, number]
  polygon: [number, number][]
}

// Simplified educational boundaries for UI annotation.
// Replace with official Burkina Faso GeoJSON for production-grade admin layers.
export const burkinaAdminSimplified: AdminFeature[] = [
  {
    id: 'north-basin',
    name: 'Bassin Nord (Simplifie)',
    level: 'region',
    center: [14.0, -1.4],
    polygon: [
      [14.95, -4.9],
      [15.1, -2.6],
      [14.7, 0.2],
      [13.95, 0.9],
      [13.35, -0.8],
      [13.55, -3.7]
    ]
  },
  {
    id: 'central-plateau',
    name: 'Plateau Central (Simplifie)',
    level: 'region',
    center: [12.2, -1.5],
    polygon: [
      [13.55, -3.7],
      [13.35, -0.8],
      [12.35, 0.7],
      [11.2, 0.2],
      [10.85, -1.9],
      [11.3, -3.4],
      [12.4, -4.1]
    ]
  },
  {
    id: 'west-bobo',
    name: 'Bobo-Ouest (Simplifie)',
    level: 'province',
    center: [11.35, -4.2],
    polygon: [
      [12.4, -4.1],
      [11.3, -3.4],
      [10.85, -1.9],
      [9.95, -2.7],
      [10.05, -5.3],
      [11.35, -5.35]
    ]
  }
]
