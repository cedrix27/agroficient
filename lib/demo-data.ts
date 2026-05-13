export const demoOrganisationId = 'demo-org-1'

export const demoZones = [
  { id: 'z1', nom: 'Ouahigouya Nord', latitude: 13.58, longitude: -2.42, radiusKm: 25, langue: 'moore', cultures: ['mil', 'sorgho'], organisationId: demoOrganisationId },
  { id: 'z2', nom: 'Dori Est', latitude: 14.03, longitude: -0.03, radiusKm: 25, langue: 'fr', cultures: ['mil'], organisationId: demoOrganisationId },
  { id: 'z3', nom: 'Kaya Centre', latitude: 13.09, longitude: -1.08, radiusKm: 30, langue: 'dioula', cultures: ['sorgho', 'niebe'], organisationId: demoOrganisationId },
  { id: 'z4', nom: 'Djibo Sud', latitude: 14.1, longitude: -1.63, radiusKm: 20, langue: 'fulfude', cultures: ['mil'], organisationId: demoOrganisationId }
]

export const demoAgriculteurs = [
  { id: 'f1', nom: 'Sawadogo Adama', telephone: '+22670112233', zoneId: 'z1', langue: 'moore', actif: true },
  { id: 'f2', nom: 'Kone Ibrahim', telephone: '+22676004411', zoneId: 'z3', langue: 'dioula', actif: true },
  { id: 'f3', nom: 'Zongo Awa', telephone: '+22665558877', zoneId: 'z2', langue: 'fr', actif: false },
  { id: 'f4', nom: 'Bance Oumar', telephone: '+22651002211', zoneId: 'z4', langue: 'fulfude', actif: true }
]

export const demoAlertes = [
  { id: 'a1', zoneId: 'z1', type: 'pluie_imminente', langue: 'moore', envoyes: 148, createdAt: '2026-04-29T06:04:00.000Z' },
  { id: 'a2', zoneId: 'z2', type: 'secheresse', langue: 'fr', envoyes: 212, createdAt: '2026-04-28T06:02:00.000Z' },
  { id: 'a3', zoneId: 'z3', type: 'pluie_imminente', langue: 'dioula', envoyes: 96, createdAt: '2026-04-27T06:08:00.000Z' },
  { id: 'a4', zoneId: 'z4', type: 'bonne_saison', langue: 'fr', envoyes: 175, createdAt: '2026-04-26T06:01:00.000Z' },
  { id: 'a5', zoneId: 'z1', type: 'debut_saison', langue: 'moore', envoyes: 131, createdAt: '2026-04-25T06:03:00.000Z' }
]

export const demoPrevisions = [
  { id: 'p1', zoneId: 'z1', categorie: 'bonne', probabilite: 72, periode: 'JAS-2026', pluieMm: 690, recommandation: 'Favoriser semis precoces.' },
  { id: 'p2', zoneId: 'z2', categorie: 'difficile', probabilite: 66, periode: 'JAS-2026', pluieMm: 410, recommandation: 'Prioriser varietes resistantes.' },
  { id: 'p3', zoneId: 'z3', categorie: 'normale', probabilite: 58, periode: 'JAS-2026', pluieMm: 540, recommandation: 'Maintenir calendrier standard.' },
  { id: 'p4', zoneId: 'z4', categorie: 'normale', probabilite: 55, periode: 'JAS-2026', pluieMm: 500, recommandation: 'Semis progressif.' }
]
