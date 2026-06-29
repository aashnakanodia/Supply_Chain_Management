import { useState, useEffect } from 'react'
import {
  Package, AlertTriangle, ShoppingCart, Truck, Warehouse,
  TrendingDown, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { getDashboard } from '../api/dashboard'
import { formatINR, formatTimeAgo } from '../utils/formatters'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import useSocket from '../hooks/useSocket'
import './Dashboard.css'

const SEVERITY_COLORS = {
  critical: '#dc2626',
  high:     '#d97706',
  medium:   '#2563eb',
  low:      '#64748b',
}

function KpiCard({ icon: Icon, label, value, sub, variant = 'default', loading }) {
  const variants = {
    default: { bg: 'var(--surface)', border: 'var(--border)',         icon: 'var(--primary-light)',   iconColor: 'var(--primary)' },
    warning: { bg: '#fffdf5',        border: 'var(--warning-border)',  icon: 'var(--warning-bg)',      iconColor: 'var(--warning)' },
    danger:  { bg: '#fff8f8',        border: 'var(--danger-border)',   icon: 'var(--danger-bg)',       iconColor: 'var(--danger)'  },
    success: { bg: '#f5fef9',        border: 'var(--success-border)',  icon: 'var(--success-bg)',      iconColor: 'var(--success)' },
    navy:    { bg: 'var(--surface)', border: 'var(--border)',          icon: 'rgba(13,31,60,0.07)',    iconColor: 'var(--navy)'    },
  }
  const v = variants[variant]

  return (
    <div className="kpi-card" style={{ background: v.bg, borderColor: v.border }}>
      <div className="kpi-card__icon" style={{ background: v.icon, color: v.iconColor }}>
        <Icon size={18} />
      </div>
      <div className="kpi-card__body">
        <p className="kpi-card__label">{label}</p>
        {loading
          ? <div className="skeleton" style={{ height: 28, width: 80, borderRadius: 6, marginTop: 4 }} />
          : <p className="kpi-card__value">{value}</p>
        }
        {sub && !loading && <p className="kpi-card__sub">{sub}</p>}
      </div>
    </div>
  )
}

const MOVE_TYPE_COLOR = { IN: 'success', OUT: 'danger', ADJUSTMENT: 'info' }

export default function Dashboard() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    getDashboard()
      .then(({ data: r }) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useSocket({
    INVENTORY_CHANGED:       () => load(),
    NEW_ALERT:               () => load(),
    ALERT_RESOLVED:          () => load(),
    PO_APPROVED:             () => load(),
    PO_STATUS_CHANGED:       () => load(),
    SHIPMENT_STATUS_CHANGED: () => load(),
  })

  const alerts = data?.openAlerts ?? {}
  const pieData = ['critical','high','medium','low']
    .filter((k) => alerts[k] > 0)
    .map((k) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: alerts[k], color: SEVERITY_COLORS[k] }))

  const movements = data?.recentMovements ?? []
  const barData = movements.slice(0, 7).map((m) => ({
    name: m.product_name?.split(' ').slice(0,2).join(' ') ?? '—',
    qty:  Math.abs(m.quantity ?? 0),
    type: m.movement_type,
  }))

  return (
    <div className="dashboard">
      {/* KPI row */}
      <div className="dashboard__kpis">
        <KpiCard loading={loading} icon={Package}        label="Total Products"     value={data?.totalProducts ?? 0}              variant="default" />
        <KpiCard loading={loading} icon={TrendingDown}   label="Low Stock Items"    value={data?.lowStockItems ?? 0}              variant={data?.lowStockItems > 0 ? 'warning' : 'default'} sub={data?.lowStockItems > 0 ? 'Need restocking' : 'All levels healthy'} />
        <KpiCard loading={loading} icon={ShoppingCart}   label="Pending POs"        value={data?.pendingPOs?.count ?? 0}          sub={formatINR(data?.pendingPOs?.totalValue)} variant="default" />
        <KpiCard loading={loading} icon={AlertTriangle}  label="Open Alerts"        value={data?.openAlerts?.total ?? 0}          variant={data?.openAlerts?.total > 0 ? 'danger' : 'default'} sub={data?.openAlerts?.critical > 0 ? `${data.openAlerts.critical} critical` : undefined} />
        <KpiCard loading={loading} icon={Truck}          label="In Transit"         value={data?.shipmentsInTransit ?? 0}         variant="navy" sub="Shipments active" />
        <KpiCard loading={loading} icon={Warehouse}      label="Warehouses"         value={data?.totalWarehouses ?? 0}            variant="success" />
      </div>

      {/* Charts + table row */}
      <div className="dashboard__grid">
        {/* Recent movements */}
        <div className="dash-card dash-card--wide">
          <div className="dash-card__head">
            <h2 className="dash-card__title">Recent Stock Movements</h2>
            {loading && <Spinner size={16} />}
          </div>
          {movements.length === 0 && !loading ? (
            <p className="dash-empty">No recent movements found.</p>
          ) : (
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Warehouse</th>
                  <th>Type</th>
                  <th className="text-right">Quantity</th>
                  <th className="text-right">When</th>
                </tr>
              </thead>
              <tbody>
                {movements.slice(0, 8).map((m, i) => (
                  <tr key={i}>
                    <td className="dash-td-product">{m.product_name ?? '—'}</td>
                    <td className="dash-td-muted">{m.warehouse_name ?? '—'}</td>
                    <td>
                      <Badge variant={MOVE_TYPE_COLOR[m.movement_type] ?? 'neutral'} size="sm">
                        {m.movement_type}
                      </Badge>
                    </td>
                    <td className="text-right">
                      <span className={`dash-qty ${m.movement_type === 'IN' ? 'dash-qty--in' : m.movement_type === 'OUT' ? 'dash-qty--out' : ''}`}>
                        {m.movement_type === 'IN' ? '+' : m.movement_type === 'OUT' ? '−' : ''}{Math.abs(m.quantity)}
                      </span>
                    </td>
                    <td className="text-right dash-td-muted">{formatTimeAgo(m.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Alert donut */}
        <div className="dash-card">
          <div className="dash-card__head">
            <h2 className="dash-card__title">Alert Summary</h2>
          </div>
          {alerts.total === 0 ? (
            <div className="dash-card__center">
              <div className="dash-all-clear">
                <ArrowUpRight size={24} color="var(--success)" />
                <p className="dash-all-clear-text">All clear!</p>
                <p className="dash-all-clear-sub">No open alerts right now.</p>
              </div>
            </div>
          ) : loading ? (
            <div className="dash-card__center"><Spinner /></div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72}
                    paddingAngle={3} dataKey="value">
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="dash-legend">
                {pieData.map((d) => (
                  <div key={d.name} className="dash-legend-item">
                    <span className="dash-legend-dot" style={{ background: d.color }} />
                    <span className="dash-legend-name">{d.name}</span>
                    <span className="dash-legend-val">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bar chart */}
        {barData.length > 0 && (
          <div className="dash-card dash-card--wide">
            <div className="dash-card__head">
              <h2 className="dash-card__title">Movement Quantities (Recent)</h2>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 24, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-3)' }} angle={-30} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }} />
                <Bar dataKey="qty" fill="var(--primary)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
