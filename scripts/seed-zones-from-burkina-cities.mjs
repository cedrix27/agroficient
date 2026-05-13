#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function pickName(props) {
  return (
    props['ADM3_FR'] ||
    props['ADM3_EN'] ||
    props['shapeName'] ||
    props['name'] ||
    props['CITY_NAME'] ||
    props['town'] ||
    null
  )
}

function pickLang(name = '') {
  const n = name.toLowerCase()
  if (n.includes('dori') || n.includes('djibo')) return 'fulfude'
  if (n.includes('bobo') || n.includes('banfora')) return 'dioula'
  return 'fr'
}

async function main() {
  const capitalsPath = path.resolve('data/raw-hdx/bfa_admincapitals.geojson')
  const raw = await fs.readFile(capitalsPath, 'utf8')
  const gj = JSON.parse(raw)

  if (!Array.isArray(gj.features)) throw new Error('Invalid capitals geojson')

  const orgEmail = 'demo@sahelweather.bf'
  const org = await prisma.organisation.upsert({
    where: { email: orgEmail },
    create: { nom: 'Organisation Demo ONG', email: orgEmail, plan: 'free' },
    update: {}
  })

  let created = 0
  let updated = 0

  for (const feature of gj.features) {
    const coords = feature?.geometry?.coordinates
    const props = feature?.properties || {}
    if (!Array.isArray(coords) || coords.length < 2) continue

    const longitude = Number(coords[0])
    const latitude = Number(coords[1])
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue

    const name = pickName(props)
    if (!name) continue

    const zoneName = String(name).trim()
    if (!zoneName) continue

    const existing = await prisma.zone.findFirst({
      where: {
        organisationId: org.id,
        nom: zoneName
      }
    })

    const data = {
      nom: zoneName,
      description: `Zone auto-creee depuis localite Burkina (${zoneName})`,
      latitude,
      longitude,
      radiusKm: 20,
      langue: pickLang(zoneName),
      cultures: ['mil', 'sorgho', 'niebe'],
      organisationId: org.id
    }

    if (existing) {
      await prisma.zone.update({ where: { id: existing.id }, data })
      updated += 1
    } else {
      await prisma.zone.create({ data })
      created += 1
    }
  }

  console.log(JSON.stringify({ ok: true, created, updated, organisationId: org.id }, null, 2))
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
