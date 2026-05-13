import fs from 'node:fs/promises'

const DATASET_ID = '2940ed80-4b69-4b98-abaf-af79088852c5'
const CKAN_URL = `https://data.humdata.org/api/3/action/package_show?id=${DATASET_ID}`

function pickResource(resources, levelNumber) {
  const lvl = String(levelNumber)
  const exact = resources.find((r) => {
    const n = String(r.name || '').toLowerCase()
    const f = String(r.format || '').toLowerCase()
    return (
      f.includes('geojson') &&
      (
        n.includes(`adm${lvl}`) ||
        n.includes(`admin ${lvl}`) ||
        n.includes(`admin${lvl}`) ||
        (n.includes('commune') && lvl === '3') ||
        (n.includes('province') && lvl === '2') ||
        (n.includes('region') && lvl === '1')
      )
    )
  })
  if (exact) return exact

  return resources.find((r) => String(r.format || '').toLowerCase().includes('geojson'))
}

function normalizeFeatureProps(f, level) {
  const p = f.properties || {}
  const g = (key) => p[key] ?? p[String(key).toUpperCase()] ?? p[String(key).toLowerCase()]
  const adm1 = g('ADM1_FR') ?? g('ADM1_EN') ?? g('shapeName') ?? g('shapeName_en') ?? null
  const adm2 = g('ADM2_FR') ?? g('ADM2_EN') ?? null
  const adm3 = g('ADM3_FR') ?? g('ADM3_EN') ?? null
  const id = g('shapeID') ?? g('shapeISO') ?? g('id') ?? `${level}-${Math.random().toString(36).slice(2, 10)}`
  const name = level === 1 ? adm1 : level === 2 ? (adm2 ?? adm1) : (adm3 ?? adm2 ?? adm1)
  f.properties = {
    id,
    level: `ADM${level}`,
    name: name ?? `ADM${level}`,
    adm1,
    adm2,
    adm3
  }
  return f
}

async function main() {
  const pkgRes = await fetch(CKAN_URL)
  if (!pkgRes.ok) throw new Error(`Failed HDX package_show: ${pkgRes.status}`)
  const pkg = await pkgRes.json()
  const resources = pkg?.result?.resources || []

  for (const level of [1, 2, 3]) {
    const resource = pickResource(resources, level)
    if (!resource?.url) throw new Error(`No resource URL for ADM${level}`)

    const geoRes = await fetch(resource.url)
    if (!geoRes.ok) throw new Error(`Failed ADM${level} download: ${geoRes.status}`)
    const geo = await geoRes.json()

    if (!geo.features || !Array.isArray(geo.features)) throw new Error(`ADM${level} not a FeatureCollection`)

    geo.features = geo.features.map((feat) => normalizeFeatureProps(feat, level))

    const out = `public/geo/bfa_adm${level}.geojson`
    await fs.writeFile(out, JSON.stringify(geo))
    console.log(`Saved normalized ADM${level} -> ${out} (${geo.features.length} features) from ${resource.name}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
