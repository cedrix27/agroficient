import fs from 'node:fs/promises'

const files = [
  { in: 'data/raw-hdx/bfa_admin1.geojson', out: 'public/geo/bfa_adm1.geojson', level: 'ADM1' },
  { in: 'data/raw-hdx/bfa_admin2.geojson', out: 'public/geo/bfa_adm2.geojson', level: 'ADM2' },
  { in: 'data/raw-hdx/bfa_admin3.geojson', out: 'public/geo/bfa_adm3.geojson', level: 'ADM3' }
]

function normalizeFeature(feature, level) {
  const p = feature.properties || {}
  const adm1 = p.ADM1_FR || p.ADM1_EN || null
  const adm2 = p.ADM2_FR || p.ADM2_EN || null
  const adm3 = p.ADM3_FR || p.ADM3_EN || null

  let name = 'Subdivision'
  if (level === 'ADM1') name = adm1 || p.ADM1_PCODE || 'Region'
  if (level === 'ADM2') name = adm2 || p.ADM2_PCODE || adm1 || 'Province'
  if (level === 'ADM3') name = adm3 || p.ADM3_PCODE || adm2 || 'Commune'

  const id = p.SHAPE_Leng ? `${level}-${name}-${String(p.SHAPE_Leng).slice(0, 6)}` : `${level}-${name}`

  feature.properties = {
    id,
    level,
    name,
    adm1,
    adm2,
    adm3,
    adm1_pcode: p.ADM1_PCODE || null,
    adm2_pcode: p.ADM2_PCODE || null,
    adm3_pcode: p.ADM3_PCODE || null
  }

  return feature
}

for (const f of files) {
  const raw = await fs.readFile(f.in, 'utf8')
  const geo = JSON.parse(raw)

  if (!geo.features || !Array.isArray(geo.features)) {
    throw new Error(`Invalid feature collection: ${f.in}`)
  }

  geo.features = geo.features.map((feat) => normalizeFeature(feat, f.level))

  await fs.writeFile(f.out, JSON.stringify(geo))
  console.log(`Wrote ${f.out} (${geo.features.length} features)`)
}
