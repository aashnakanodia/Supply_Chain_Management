import { Bell, Search } from 'lucide-react'
import { useLocation, Link } from 'react-router-dom'
import './TopBar.css'

const TITLES = {
  '/dashboard':       'Dashboard',
  '/inventory':       'Inventory',
  '/purchase-orders': 'Purchase Orders',
  '/shipments':       'Shipments',
  '/alerts':          'Alerts',
  '/users':           'User Management',
}

export default function TopBar({ alertCount }) {
  const { pathname } = useLocation()
  const title = TITLES[pathname] ?? 'TechVolt SCM'

  return (
    <header className="topbar">
      <div className="topbar__left">
        <h1 className="topbar__title">{title}</h1>
      </div>

      <div className="topbar__right">
        <div className="topbar__search">
          <Search size={14} className="topbar__search-icon" />
          <input placeholder="Search…" className="topbar__search-input" />
        </div>

        <Link to="/alerts" className="topbar__bell">
          <Bell size={18} />
          {alertCount > 0 && (
            <span className="topbar__bell-badge">
              {alertCount > 99 ? '99+' : alertCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}
