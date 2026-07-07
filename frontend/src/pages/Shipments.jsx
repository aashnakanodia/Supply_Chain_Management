import { useState, useEffect, useCallback } from 'react'
import { Truck, Eye } from 'lucide-react'
import { getShipments, getShipmentById, updateShipmentStatus } from '../api/shipments'
import { getPurchaseOrderById } from '../api/purchaseOrders'
import { formatDate, formatINR } from '../utils/formatters'
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

  // Detail modal
  const [detailShipment, setDetailShipment] = useState(null)
  const [detailItems,    setDetailItems]    = useState(null)
  const [detailLoading,  setDetailLoading]  = useState(false)

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

  const openDetail = async (s) => {
    setDetailShipment(s)
    setDetailItems(null)
    setDetailLoading(true)
    try {
      const [shipRes, poRes] = await Promise.all([
        getShipmentById(s.id),
        getPurchaseOrderById(s.purchase_order_id),
      ])
      setDetailShipment(shipRes.data.data)
      setDetailItems(poRes.data.data?.items ?? [])
    } catch {
      toast.error('Failed to load shipment details')
    } finally {
      setDetailLoading(false)
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
                <th>Carrier</th><th>Status</th><th>Expected</th><th>Actions</th>
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
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Badge variant={STATUS_VARIANT[s.status] ?? 'neutral'} dot>
                        {s.status.replace('_', ' ')}
                      </Badge>
                      {(s.status === 'pending' || s.status === 'in_transit') &&
                        s.expected_arrival && new Date(s.expected_arrival) < new Date() && (
                        <Badge variant="danger">Delayed</Badge>
                      )}
                    </div>
                  </td>
                  <td className="page-td-muted">{formatDate(s.expected_arrival)}</td>
                  <td>
                    <div className="page-actions">
                      <button className="page-action-btn" onClick={() => openDetail(s)}>
                        <Eye size={13} /> View
                      </button>
                      {canUpdate && NEXT_STATUS[s.status] && (
                          <button className="page-action-btn" onClick={() => openStatus(s)}>
                            Update status
                          </button>
                        )}
                      {canUpdate && (s.status === 'pending' || s.status === 'in_transit') && (
                        <button className="page-action-btn page-action-btn--danger"
                          onClick={() => { setCancelModal(s); setCancelReason('') }}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
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

      {/* Detail modal */}
      <Modal open={!!detailShipment} onClose={() => setDetailShipment(null)}
        title={`Shipment — ${detailShipment?.shipment_number ?? ''}`} size="lg"
        footer={<button className="page-btn-ghost" onClick={() => setDetailShipment(null)}>Close</button>}
      >
        {detailLoading || !detailItems ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Delayed callout */}
            {(detailShipment.status === 'pending' || detailShipment.status === 'in_transit') &&
              detailShipment.expected_arrival && new Date(detailShipment.expected_arrival) < new Date() && (
              <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 'var(--r-md)', padding: '12px 16px', fontSize: 13, color: 'var(--text-1)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16 }}>🚨</span>
                <div>
                  <strong>Shipment Delayed</strong>
                  <p style={{ marginTop: 2, color: 'var(--text-2)' }}>Expected arrival was {formatDate(detailShipment.expected_arrival)}. Contact the supplier or carrier below to follow up.</p>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <p className="adj-label">Status</p>
                <p style={{ marginTop: 4 }}>
                  <Badge variant={STATUS_VARIANT[detailShipment.status] ?? 'neutral'} dot>
                    {detailShipment.status.replace('_', ' ')}
                  </Badge>
                </p>
              </div>
              <div>
                <p className="adj-label">Warehouse</p>
                <p style={{ marginTop: 4, fontSize: 13.5 }}>{detailShipment.warehouse_name}</p>
              </div>
              <div>
                <p className="adj-label">PO Reference</p>
                <p style={{ marginTop: 4, fontSize: 13.5 }}><code className="page-sku">{detailShipment.po_number}</code></p>
              </div>
              <div>
                <p className="adj-label">Carrier</p>
                <p style={{ marginTop: 4, fontSize: 13.5 }}>{detailShipment.carrier ?? '—'}</p>
              </div>
              <div>
                <p className="adj-label">Tracking Number</p>
                <p style={{ marginTop: 4, fontSize: 13.5 }}>{detailShipment.tracking_number ?? '—'}</p>
              </div>
              <div>
                <p className="adj-label">Expected Arrival</p>
                <p style={{ marginTop: 4, fontSize: 13.5 }}>{formatDate(detailShipment.expected_arrival)}</p>
              </div>
              {detailShipment.shipped_date && (
                <div>
                  <p className="adj-label">Shipped Date</p>
                  <p style={{ marginTop: 4, fontSize: 13.5 }}>{formatDate(detailShipment.shipped_date)}</p>
                </div>
              )}
              {detailShipment.actual_arrival && (
                <div>
                  <p className="adj-label">Actual Arrival</p>
                  <p style={{ marginTop: 4, fontSize: 13.5 }}>{formatDate(detailShipment.actual_arrival)}</p>
                </div>
              )}
            </div>
            {/* Contact details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
                <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Supplier Contact</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{detailShipment.supplier_name ?? '—'}</p>
                {detailShipment.supplier_contact && <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3 }}>👤 {detailShipment.supplier_contact}</p>}
                {detailShipment.supplier_email && <a href={`mailto:${detailShipment.supplier_email}`} style={{ fontSize: 12, color: 'var(--primary)', display: 'block', marginTop: 3, textDecoration: 'none' }}>✉️ {detailShipment.supplier_email}</a>}
                {detailShipment.supplier_phone && <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3 }}>📞 {detailShipment.supplier_phone}</p>}
                {!detailShipment.supplier_contact && !detailShipment.supplier_email && !detailShipment.supplier_phone && <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>No contact details on file</p>}
              </div>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
                <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Warehouse Manager</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{detailShipment.warehouse_name}</p>
                {detailShipment.warehouse_manager
                  ? <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3 }}>👤 {detailShipment.warehouse_manager}</p>
                  : <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>No manager assigned</p>
                }
              </div>
            </div>

            {detailShipment.notes && (
              <div>
                <p className="adj-label">Notes</p>
                <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-2)' }}>{detailShipment.notes}</p>
              </div>
            )}
            <div>
              <p className="adj-label" style={{ marginBottom: 10 }}>Items in Shipment</p>
              <table className="page-table">
                <thead>
                  <tr>
                    <th>SKU</th><th>Product</th><th>Unit</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Unit Price</th>
                    <th className="text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {detailItems.map((item) => (
                    <tr key={item.id}>
                      <td><code className="page-sku">{item.sku}</code></td>
                      <td><span className="page-product-name">{item.product_name}</span></td>
                      <td className="page-td-muted">{item.unit}</td>
                      <td className="text-right page-mono">{item.quantity}</td>
                      <td className="text-right page-mono">{formatINR(item.unit_price)}</td>
                      <td className="text-right page-mono">{formatINR(item.quantity * item.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

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
