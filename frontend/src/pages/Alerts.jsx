import { useState, useEffect, useCallback } from 'react'
import { Bell, CheckCircle, Eye } from 'lucide-react'
import { getAlerts, resolveAlert, markAlertRead } from '../api/alerts'
import { formatTimeAgo } from '../utils/formatters'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import useSocket from '../hooks/useSocket'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'
import { useOutletContext } from 'react-router-dom'
import './Alerts.css'
import './AppPage.css'

const SEV_COLORS = {
  critical: { border: '#dc2626', bg: '#fff5f5', badge: 'danger'  },
  high:     { border: '#d97706', bg: '#fffdf5', badge: 'warning' },
  medium:   { border: '#2563eb', bg: '#f5f9ff', badge: 'info'    },
  low:      { border: '#64748b', bg: '#f8fafc', badge: 'neutral' },
}

const TABS = [
  { label: 'All',      value: 'all' },
  { label: 'Active',   value: 'active' },
  { label: 'Resolved', value: 'resolved' },
]

export default function Alerts() {
  const [alerts,  setAlerts]  = useState([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('active')
  const [acting,  setActing]  = useState(null)
  const { toast } = useToast()
  const { user }  = useAuth()
  const ctx       = useOutletContext()

  const canResolve = ['admin', 'procurement_manager', 'warehouse_staff'].includes(user?.role)

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (tab === 'active')   params.isResolved = false
    if (tab === 'resolved') params.isResolved = true
    getAlerts({ ...params, limit: 50 })
      .then(({ data }) => {
        setAlerts(data.data?.alerts ?? [])
        if (tab === 'active' && ctx?.setAlertCount) {
          ctx.setAlertCount(data.data?.total ?? 0)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tab, ctx])

  useEffect(() => { load() }, [load])

  useSocket({
    NEW_ALERT:      () => load(),
    ALERT_RESOLVED: () => load(),
  })

  const markRead = async (id) => {
    try {
      await markAlertRead(id)
      setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, is_read: true } : a))
    } catch {}
  }

  const resolve = async (id) => {
    setActing(id)
    try {
      await resolveAlert(id)
      toast.success('Alert resolved')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to resolve alert')
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="page">
      <div className="page-tabs">
        {TABS.map(({ label, value }) => (
          <button
            key={value}
            className={`page-tab ${tab === value ? 'page-tab--on' : ''}`}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loading"><Spinner /></div>
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={tab === 'active' ? 'No active alerts' : 'No alerts found'}
          description={tab === 'active' ? 'Your supply chain is running smoothly. No active alerts right now.' : 'No alerts match this filter.'}
        />
      ) : (
        <div className="alerts-grid">
          {alerts.map((a) => {
            const sev = SEV_COLORS[a.severity] ?? SEV_COLORS.low
            return (
              <div
                key={a.id}
                className={`alert-card ${!a.is_read ? 'alert-card--unread' : ''}`}
                style={{ borderLeftColor: sev.border, background: a.is_read ? 'var(--surface)' : sev.bg }}
                onClick={() => !a.is_read && markRead(a.id)}
              >
                <div className="alert-card__head">
                  <div className="alert-card__badges">
                    <Badge variant={sev.badge} size="sm" dot>{a.severity}</Badge>
                    {a.type && <Badge variant="neutral" size="sm">{a.type.replace('_', ' ')}</Badge>}
                    {!a.is_read && <span className="alert-unread-dot" />}
                  </div>
                  <span className="alert-card__time">{formatTimeAgo(a.created_at)}</span>
                </div>

                <h3 className="alert-card__title">{a.title}</h3>
                <p className="alert-card__message">{a.message}</p>

                <div className="alert-card__meta">
                  {a.warehouse_name && <span className="alert-meta-tag">📍 {a.warehouse_name}</span>}
                  {a.product_name   && <span className="alert-meta-tag">📦 {a.product_name}</span>}
                </div>

                {canResolve && !a.is_resolved && (
                  <div className="alert-card__actions">
                    {!a.is_read && (
                      <button className="page-action-btn" onClick={(e) => { e.stopPropagation(); markRead(a.id) }}>
                        <Eye size={13} /> Mark read
                      </button>
                    )}
                    <button
                      className="page-action-btn page-action-btn--primary"
                      disabled={acting === a.id}
                      onClick={(e) => { e.stopPropagation(); resolve(a.id) }}
                    >
                      {acting === a.id ? <Spinner size={13} color="white" /> : <><CheckCircle size={13} /> Resolve</>}
                    </button>
                  </div>
                )}

                {a.is_resolved && (
                  <div style={{ marginTop: 8 }}>
                    <Badge variant="success" size="sm" dot>Resolved</Badge>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
