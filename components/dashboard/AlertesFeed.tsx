export type AlertItem = {
  id: string
  zone: string
  type: 'pluie_imminente' | 'secheresse' | 'bonne_saison' | 'debut_saison'
  langue: 'fr' | 'moore' | 'dioula' | 'fulfude'
  envoyes: number
  createdAt: string
}

const typeLabels: Record<AlertItem['type'], string> = {
  pluie_imminente: 'Pluie imminente',
  secheresse: 'Secheresse',
  bonne_saison: 'Bonne saison',
  debut_saison: 'Debut de saison'
}

const langLabels: Record<AlertItem['langue'], string> = {
  fr: 'Francais',
  moore: 'Moore',
  dioula: 'Dioula',
  fulfude: 'Fulfude'
}

export default function AlertesFeed({ items }: { items: AlertItem[] }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Dernieres alertes</h2>
      </div>

      <div className="alerts-list">
        {items.map((item) => (
          <article key={item.id} className="alert-row">
            <div>
              <p className="alert-main">{typeLabels[item.type]} - {item.zone}</p>
              <p className="alert-sub">{item.createdAt} - {langLabels[item.langue]}</p>
            </div>
            <span className="alert-badge">{item.envoyes} SMS</span>
          </article>
        ))}
      </div>
    </section>
  )
}
