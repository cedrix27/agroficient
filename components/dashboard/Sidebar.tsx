'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/dashboard', label: "Vue d'ensemble" },
  { href: '/dashboard/zones', label: 'Zones' },
  { href: '/dashboard/agriculteurs', label: 'Agriculteurs' },
  { href: '/dashboard/alertes', label: 'Alertes' },
  { href: '/dashboard/previsions', label: 'Previsions' },
  { href: '/dashboard/pipeline', label: 'Sante pipeline' }
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" />
        <div>
          <strong>SahelWeather</strong>
          <div className="brand-sub">Organisation Demo ONG</div>
        </div>
      </div>

      <nav className="nav">
        {links.map((link) => {
          const active = pathname === link.href
          return (
            <Link key={link.href} href={link.href} className={`nav-link${active ? ' active' : ''}`}>
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <span className="plan-chip">Plan actuel: free</span>
        <button className="settings-btn" type="button">
          Parametres
        </button>
      </div>
    </aside>
  )
}
