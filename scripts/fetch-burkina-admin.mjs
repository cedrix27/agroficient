import fs from 'node:fs/promises'

const levels = ['ADM1', 'ADM2', 'ADM3']

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`)
  return res.json()
}

for (const level of levels) {
  const metaUrl = `https://www.geoboundaries.org/api/current/gbOpen/BFA/${level}/`
  const meta = await fetchJson(metaUrl)
  const gjUrl = meta.gjDownloadURL || meta.simplifiedGeometryGeoJSON
  if (!gjUrl) throw new Error(`No GeoJSON URL for ${level}`)

  const res = await fetch(gjUrl)
  if (!res.ok) throw new Error(`GeoJSON download failed ${level}: ${res.status}`)
  const text = await res.text()

  const out = `public/geo/bfa_${level.toLowerCase()}.geojson`
  await fs.writeFile(out, text)
  console.log(`Saved ${level} -> ${out}`)
}
