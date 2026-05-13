'use client'

import { useRef, useState } from 'react'

export type ImportedFarmer = {
  nom: string
  telephone: string
  zone: string
  langue: 'fr' | 'moore' | 'dioula' | 'fulfude'
  actif: boolean
}

type ImportCSVProps = {
  zones: string[]
  onImport: (rows: ImportedFarmer[]) => void
}

const allowedLangues = new Set(['fr', 'moore', 'dioula', 'fulfude'])

function parseBool(value: string) {
  const v = value.trim().toLowerCase()
  return !(v === 'false' || v === '0' || v === 'non' || v === 'inactive')
}

export default function ImportCSV({ zones, onImport }: ImportCSVProps) {
  const [status, setStatus] = useState<string>('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  return (
    <div className="csv-import">
      <p className="csv-help">CSV attendu: nom,telephone,zone,langue,actif</p>
      <div className="csv-actions">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return

            const text = await file.text()
            const lines = text
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter(Boolean)

            if (lines.length <= 1) {
              setStatus('Import annule: fichier vide ou sans lignes de donnees.')
              return
            }

            const result: ImportedFarmer[] = []
            let rejected = 0

            for (const line of lines.slice(1)) {
              const cols = line.split(',').map((v) => v.trim())
              if (cols.length < 5) {
                rejected += 1
                continue
              }

              const [nom, telephone, zone, langueRaw, actifRaw] = cols
              const langue = langueRaw.toLowerCase() as ImportedFarmer['langue']

              if (!nom || !telephone || !zones.includes(zone) || !allowedLangues.has(langue)) {
                rejected += 1
                continue
              }

              result.push({
                nom,
                telephone,
                zone,
                langue,
                actif: parseBool(actifRaw)
              })
            }

            if (result.length > 0) {
              onImport(result)
            }

            setStatus(`Import termine: ${result.length} ajoutes, ${rejected} rejetes.`)
            if (inputRef.current) inputRef.current.value = ''
          }}
        />
      </div>
      {status ? <p className="csv-status">{status}</p> : null}
    </div>
  )
}
