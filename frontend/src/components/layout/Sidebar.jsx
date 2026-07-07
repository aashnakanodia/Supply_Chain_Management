import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, BoxesIcon, ShoppingCart, Truck, Bell,
  Users, LogOut, ChevronLeft, ChevronRight, Building2, Warehouse,
} from 'lucide-react'
import HexLogo from '../ui/HexLogo'
import { useAuth } from '../../context/AuthContext'
import { roleLabel } from '../../utils/formatters'
import { disconnectSocket } from '../../hooks/useSocket'
import './Sidebar.css'

const NAV = [
  { to: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard',       roles: ['admin','procurement_manager','warehouse_staff','viewer'] },
  { to: '/inventory',       icon: Package,         label: 'Inventory',       roles: ['admin','procurement_manager','warehouse_staff','viewer'] },
  { to: '/products',        icon: BoxesIcon,       label: 'Products',        roles: ['admin','procurement_manager','viewer'] },
  { to: '/purchase-orders', icon: ShoppingCart,    label: 'Purchase Orders', roles: ['admin','procurement_manager','warehouse_staff','supplier','viewer'] },
  { to: '/shipments',       icon: Truck,           label: 'Shipments',       roles: null },
  { to: '/alerts',          icon: Bell,            label: 'Alerts',          roles: ['admin','procurement_manager','warehouse_staff','viewer'], alert: true },
  { to: '/suppliers',       icon: Building2,       label: 'Suppliers',       roles: ['admin','procurement_manager','viewer'] },
  { to: '/warehouses',      icon: Warehouse,       label: 'Warehouses',      roles: ['admin','procurement_manager','warehouse_staff','viewer'] },
  { to: '/users',           icon: Users,           label: 'Users',           roles: ['admin','procurement_manager'] },
]

export default function Sidebar({ collapsed, onToggle, alertCount }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    disconnectSocket()
    logout()
    navigate('/', { replace: true })
  }

  const visible = NAV.filter((item) =>
    !item.roles || item.roles.includes(user?.role),
  )

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?'

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon"><HexLogo size={38} /></div>
        {!collapsed && <span className="sidebar__logo-text"><strong>Synapse</strong></span>}
      </div>

      {/* Nav */}
      <nav className="sidebar__nav">
        {visible.map(({ to, icon: Icon, label, alert: isAlert }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar__item ${isActive ? 'sidebar__item--active' : ''}`
            }
          >
            <span className="sidebar__item-icon">
              <Icon size={18} />
              {isAlert && alertCount > 0 && (
                <span className="sidebar__alert-dot" />
              )}
            </span>
            {!collapsed && (
              <span className="sidebar__item-label">
                {label}
                {isAlert && alertCount > 0 && (
                  <span className="sidebar__badge">{alertCount > 99 ? '99+' : alertCount}</span>
                )}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="sidebar__bottom">
        <button className="sidebar__collapse-btn" onClick={onToggle}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span>Collapse</span>}
        </button>

        <div className="sidebar__user">
          <div className="sidebar__avatar">{initials}</div>
          {!collapsed && (
            <div className="sidebar__user-info">
              <p className="sidebar__user-name">{user?.firstName} {user?.lastName}</p>
              <p className="sidebar__user-role">{roleLabel(user?.role)}</p>
            </div>
          )}
          <button className="sidebar__logout" onClick={handleLogout} title="Log out">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
