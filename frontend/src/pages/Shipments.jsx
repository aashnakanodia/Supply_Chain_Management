import { useState, useEffect, useCallback } from 'react'
import { Truck } from 'lucide-react'
import { getShipments, updateShipmentStatus } from '../api/shipments'
import { formatDate } from '../utils/formatters'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import useSocket from '../hooks/useSocket'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'
import './AppPage.css'

const TABS = [
  { label: 'All',        value: '' },
  { label: 'Pending',    value: 'pending' },
  { label: 'In Transit', value: 'in_transit' },
  { label: 'Delivered',  value: 'delivered' },
  { label: 'Cancelled',  value: 'cancelled' },
]

const STATUS_VARIANT = {
  pending:    'warning',
  in_transit: 'info',
  delivered:  'success',
  cancelled:  'neutral',
}

const NEXT_STATUS = {
  pending:    'in_transit',
  in_transit: 'delivered',
}

export default function Shipments() {
  const [shipments,   setShipments]   = useState([])
  const [total,       setTotal]       = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState('')
  const [page,        setPage]        = useState(1)
  const [actingId,    setActingId]    = useState(null)

  // Advance status modal
  const [statusModal, setStatusModal] = useState(null)
  const [newStatus,   setNewStatus]   = useState('')

  // Cancel with reason modal
  const [cancelModal,  setCancelModal]  = useState(null)
  const [cancelReason, setCancelReason] = useState('')

  const { toast } = useToast()
  const { user }  = useAuth()

  const canUpdate = ['admin', 'procurement_manager', 'warehouse_staff'].includes(user?.role)

  const load = useCallback(() => {
    setLoading(true)
    getShipments({ status: tab || undefined, page, limit: 20 })
      .then(({ data }) => {
        setShipments(data.data?.shipments ?? [])
        setTotal(data.data?.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tab, page])

  useEffect(() => { load() }, [load])
  useSocket({ SHIPMENT_STATUS_CHANGED: () => load() })

  useEffect(() => {
    window.addEventListener('synapse:data-changed', load)
    return () => window.removeEventListener('synapse:data-changed', load)
  }, [load])

  const openStatus = (shipment) => {
    setStatusModal(shipment)
    setNewStatus(NEXT_STATUS[shipment.status] ?? '')
  }

  const submitStatus = async () => {
    if (!newStatus || !statusModal) return
    setActingId(statusModal.id)
    try {
      await updateShipmentStatus(statusModal.id, { status: newStatus })
      toast.success(`Shipment status updated to ${newStatus.replace('_', ' ')}`)
      setStatusModal(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to update status')
    } finally {
      setActingId(null)
    }
  }

  const submitCancel = async () => {
    if (!cancelReason.trim()) { toast.error('Reason is required'); return }
    setActingId(cancelModal.id)
    try {
      await updateShipmentStatus(cancelModal.id, { status: 'cancelled', notes: cancelReason })
      toast.success(`Shipment ${cancelModal.shipment_number} cancelled`)
      setCancelModal(null); setCancelReason('')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to cancel')
    } finally {
      setActingId(null)
    }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="page">
      <div className="page-tabs">
        {TABS.map(({ label, value }) => (
          <button key={value} className={`page-tab ${tab === value ? 'page-tab--on' : ''}`}
            onClick={() => { setTab(value); setPage(1) }}>
            {label}
          </button>
        ))}
      </div>

      <div className="page-table-wrap">
        {loading && shipments.length === 0 ? (
          <div className="page-loading"><Spinner /></div>
        ) : shipments.length === 0 ? (
          <EmptyState icon={Truck} title="No shipments found" description="No shipments match the selected filter." />
        ) : (
          <table className="page-table">
            <thead>
              <tr>
                <th>Shipment #</th><th>PO Reference</th><th>Warehouse</th>
                <th>Carrier</th><th>Status</th><th>Expected</th>
                {canUpdate && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id}>
                  <td><code className="page-sku">{s.shipment_number}</code></td>
                  <td className="page-td-muted page-mono">{s.po_number ?? '—'}</td>
                  <td className="page-td-muted">{s.warehouse_name}</td>
                  <td className="page-td-muted">{s.carrier ?? '—'}</td>
                  <td>
                    <Badge variant={STATUS_VARIANT[s.status] ?? 'neutral'} dot>
                      {s.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="page-td-muted">{formatDate(s.expected_arrival)}</td>
                  {canUpdate && (
                    <td>
                      <div className="page-actions">
                        {NEXT_STATUS[s.status] && (
                          <button className="page-action-btn" onClick={() => openStatus(s)}>
                            Update status
                          </button>
                        )}
                        {(s.status === 'pending' || s.status === 'in_transit') && (
                          <button className="page-action-btn page-action-btn--danger"
                            onClick={() => { setCancelModal(s); setCancelReason('') }}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="page-pagination">
          <button className="page-page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span className="page-page-info">Page {page} of {totalPages}</span>
          <button className="page-page-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}

      {/* Advance status modal */}
      <Modal open={!!statusModal} onClose={() => setStatusModal(null)}
        title="Update Shipment Status" size="sm"
        footer={<>
          <button className="page-btn-ghost" onClick={() => setStatusModal(null)}>Cancel</button>
          <button className="page-btn-primary" onClick={submitStatus} disabled={!!actingId || !newStatus}>
            {actingId ? <Spinner size={16} color="white" /> : 'Update status'}
          </button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13.5, color: 'var(--text-2)' }}>
            Shipment <strong>{statusModal?.shipment_number}</strong> · Current:{' '}
            <Badge variant={STATUS_VARIANT[statusModal?.status]}>{statusModal?.status?.replace('_',' ')}</Badge>
          </p>
          <div>
            <label className="adj-label">New status</label>
            <select className="page-select" style={{ width: '100%', marginTop: 6 }}
              value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              <option value="">Select status…</option>
              {statusModal && NEXT_STATUS[statusModal.status] && (
                <option value={NEXT_STATUS[statusModal.status]}>
                  {NEXT_STATUS[statusModal.status].replace('_', ' ')}
                </option>
              )}
            </select>
          </div>
        </div>
      </Modal>

      {/* Cancel with reason modal */}
      <Modal open={!!cancelModal} onClose={() => setCancelModal(null)}
        title={`Cancel Shipment — ${cancelModal?.shipment_number ?? ''}`} size="sm"
        footer={<>
          <button className="page-btn-ghost" onClick={() => setCancelModal(null)}>Keep</button>
          <button className="page-btn-primary" style={{ background: 'var(--danger)' }}
            onClick={submitCancel} disabled={!!actingId || !cancelReason.trim()}>
            {actingId ? <Spinner size={16} color="white" /> : 'Cancel Shipment'}
          </button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6 }}>
            This will cancel shipment <strong>{cancelModal?.shipment_number}</strong>. This cannot be undone.
          </p>
          <div>
            <label className="adj-label">Reason for cancellation *</label>
            <textarea className="adj-reason" style={{ marginTop: 6 }} rows={3}
              placeholder="e.g. Carrier unavailable, damaged goods, supplier cancelled…"
              value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
