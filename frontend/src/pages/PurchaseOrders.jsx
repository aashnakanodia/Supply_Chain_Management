import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, Trash2, ShoppingCart, Truck } from 'lucide-react'
import { getPurchaseOrders, createPurchaseOrder, approvePurchaseOrder, updatePOStatus } from '../api/purchaseOrders'
import { createShipment } from '../api/shipments'
import { getSuppliers } from '../api/suppliers'
import { getWarehouses } from '../api/warehouses'
import { getProducts } from '../api/products'
import { formatINR, formatDate } from '../utils/formatters'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import useSocket from '../hooks/useSocket'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'
import './AppPage.css'
import './PurchaseOrders.css'

const TABS = [
  { label: 'All',       value: '' },
  { label: 'Pending',   value: 'pending' },
  { label: 'Approved',  value: 'approved' },
  { label: 'Ordered',   value: 'ordered' },
  { label: 'Received',  value: 'received' },
  { label: 'Cancelled', value: 'cancelled' },
]

const STATUS_VARIANT = {
  pending:   'warning',
  approved:  'success',
  ordered:   'info',
  received:  'purple',
  cancelled: 'neutral',
}

const EMPTY_ITEM = { productId: '', quantity: 1, unitPrice: 0 }

export default function PurchaseOrders() {
  const [orders,    setOrders]    = useState([])
  const [total,     setTotal]     = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('')
  const [page,      setPage]      = useState(1)
  const [actingId,  setActingId]  = useState(null)
  const { toast } = useToast()
  const { user }  = useAuth()

  // Reference data
  const [suppliers,  setSuppliers]  = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [products,   setProducts]   = useState([])

  // Create PO modal
  const [showCreatePO, setShowCreatePO] = useState(false)
  const [newPO, setNewPO] = useState({ supplierId: '', warehouseId: '', expectedDate: '', notes: '', items: [{ ...EMPTY_ITEM }] })
  const [poLoading, setPOLoading] = useState(false)

  // Create Shipment modal
  const [shipmentPO,  setShipmentPO]  = useState(null)
  const [newShipment, setNewShipment] = useState({ carrier: '', trackingNumber: '', expectedArrival: '', notes: '' })
  const [shpLoading,  setShpLoading]  = useState(false)

  // Cancel PO modal
  const [cancelPO,     setCancelPO]     = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)

  const location   = useLocation()
  const canWrite   = ['admin', 'procurement_manager'].includes(user?.role)
  const canApprove = user?.role === 'admin'
  const canCreateShipment = ['admin', 'procurement_manager'].includes(user?.role)

  const load = useCallback(() => {
    setLoading(true)
    getPurchaseOrders({ status: tab || undefined, page, limit: 20 })
      .then(({ data }) => { setOrders(data.data?.purchaseOrders ?? []); setTotal(data.data?.total ?? 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tab, page])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    getSuppliers().then(({ data }) => setSuppliers(data.data?.suppliers ?? [])).catch(() => {})
    getWarehouses().then(({ data }) => setWarehouses(data.data?.warehouses ?? [])).catch(() => {})
    getProducts({ limit: 200 }).then(({ data }) => setProducts(data.data?.products ?? [])).catch(() => {})
  }, [])

  // Auto-open Create PO modal when navigated from Dashboard/Alerts with state
  useEffect(() => {
    if (location.state?.openCreatePO) {
      openCreatePO(location.state.prefillProductId ?? null)
      window.history.replaceState({}, '') // clear state so re-render doesn't re-open
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]) // wait until products are loaded before opening

  useSocket({ PO_APPROVED: () => load(), PO_STATUS_CHANGED: () => load() })

  useEffect(() => {
    window.addEventListener('synapse:data-changed', load)
    return () => window.removeEventListener('synapse:data-changed', load)
  }, [load])

  // ── Create PO ──────────────────────────────────────────────────────────────
  const openCreatePO = (prefillProductId) => {
    const items = prefillProductId
      ? [{ productId: prefillProductId, quantity: 1, unitPrice: products.find((p) => p.id === prefillProductId)?.unit_price ?? 0 }]
      : [{ ...EMPTY_ITEM }]
    setNewPO({ supplierId: '', warehouseId: '', expectedDate: '', notes: '', items })
    setShowCreatePO(true)
  }

  const addItem = () => setNewPO((p) => ({ ...p, items: [...p.items, { ...EMPTY_ITEM }] }))
  const removeItem = (i) => setNewPO((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))
  const setItem = (i, field, val) => setNewPO((p) => {
    const items = [...p.items]
    items[i] = { ...items[i], [field]: val }
    if (field === 'productId') {
      const prod = products.find((pr) => pr.id === val)
      if (prod) items[i].unitPrice = prod.unit_price ?? 0
    }
    return { ...p, items }
  })

  const poTotal = newPO.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0)

  const submitCreatePO = async () => {
    if (!newPO.supplierId || !newPO.warehouseId) { toast.error('Select supplier and warehouse'); return }
    if (newPO.items.some((it) => !it.productId || !it.quantity)) { toast.error('Fill all line items'); return }
    setPOLoading(true)
    try {
      await createPurchaseOrder({
        supplierId:   newPO.supplierId,
        warehouseId:  newPO.warehouseId,
        expectedDate: newPO.expectedDate || undefined,
        notes:        newPO.notes || undefined,
        items: newPO.items.map((it) => ({ productId: it.productId, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice) })),
      })
      toast.success('Purchase order created')
      setShowCreatePO(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to create PO')
    } finally {
      setPOLoading(false)
    }
  }

  // ── Approve / Advance ─────────────────────────────────────────────────────
  const approve = async (id) => {
    setActingId(id)
    try { await approvePurchaseOrder(id); toast.success('PO approved'); load() }
    catch (err) { toast.error(err.response?.data?.error?.message ?? 'Failed') }
    finally { setActingId(null) }
  }

  // ── Create Shipment ───────────────────────────────────────────────────────
  const openShipment = (po) => { setShipmentPO(po); setNewShipment({ carrier: '', trackingNumber: '', expectedArrival: '', notes: '' }) }

  const submitShipment = async () => {
    if (!newShipment.expectedArrival) { toast.error('Expected arrival date is required'); return }
    setShpLoading(true)
    try {
      await createShipment({
        purchaseOrderId: shipmentPO.id,
        warehouseId:     shipmentPO.warehouse_id,
        carrier:         newShipment.carrier || undefined,
        trackingNumber:  newShipment.trackingNumber || undefined,
        expectedArrival: newShipment.expectedArrival,
        notes:           newShipment.notes || undefined,
      })
      toast.success(`Shipment created for ${shipmentPO.po_number}`)
      setShipmentPO(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to create shipment')
    } finally {
      setShpLoading(false)
    }
  }

  // ── Cancel PO ─────────────────────────────────────────────────────────────
  const submitCancel = async () => {
    if (!cancelReason.trim()) { toast.error('Reason is required'); return }
    setCancelLoading(true)
    try {
      await updatePOStatus(cancelPO.id, 'cancelled', cancelReason)
      toast.success(`PO ${cancelPO.po_number} cancelled`)
      setCancelPO(null); setCancelReason('')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to cancel')
    } finally {
      setCancelLoading(false)
    }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="page">
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div className="page-tabs">
          {TABS.map(({ label, value }) => (
            <button key={value} className={`page-tab ${tab === value ? 'page-tab--on' : ''}`}
              onClick={() => { setTab(value); setPage(1) }}>{label}</button>
          ))}
        </div>
        {canWrite && (
          <button className="page-btn-primary" onClick={() => openCreatePO()}>
            <Plus size={15} /> New Purchase Order
          </button>
        )}
      </div>

      {/* Table */}
      <div className="page-table-wrap">
        {loading && orders.length === 0 ? <div className="page-loading"><Spinner /></div>
          : orders.length === 0 ? <EmptyState icon={ShoppingCart} title="No purchase orders" description="No POs match the selected filter." />
          : (
            <table className="page-table">
              <thead><tr>
                <th>PO Number</th><th>Supplier</th><th>Warehouse</th>
                <th className="text-right">Total</th><th>Status</th>
                <th>Date</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {orders.map((po) => (
                  <tr key={po.id}>
                    <td><code className="page-sku">{po.po_number}</code></td>
                    <td className="page-product-name">{po.supplier_name}</td>
                    <td className="page-td-muted">{po.warehouse_name}</td>
                    <td className="text-right page-mono">{formatINR(po.total_amount)}</td>
                    <td><Badge variant={STATUS_VARIANT[po.status] ?? 'neutral'} dot>
                      {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                    </Badge></td>
                    <td className="page-td-muted">{formatDate(po.order_date ?? po.created_at)}</td>
                    <td>
                      <div className="page-actions">
                        {canApprove && po.status === 'pending' && (
                          <button className="page-action-btn page-action-btn--primary"
                            disabled={actingId === po.id} onClick={() => approve(po.id)}>
                            {actingId === po.id ? <Spinner size={13} color="white" /> : 'Approve'}
                          </button>
                        )}
                        {canCreateShipment && (po.status === 'approved' || po.status === 'ordered') && (
                          <button className="page-action-btn" onClick={() => openShipment(po)}>
                            <Truck size={13} /> Shipment
                          </button>
                        )}
                        {canWrite && po.status === 'pending' && (
                          <button className="page-action-btn page-action-btn--danger"
                            onClick={() => { setCancelPO(po); setCancelReason('') }}>
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

      {/* ── Create PO Modal ── */}
      <Modal open={showCreatePO} onClose={() => setShowCreatePO(false)} title="New Purchase Order" size="lg"
        footer={<>
          <button className="page-btn-ghost" onClick={() => setShowCreatePO(false)}>Cancel</button>
          <button className="page-btn-primary" onClick={submitCreatePO} disabled={poLoading}>
            {poLoading ? <Spinner size={16} color="white" /> : 'Create PO'}
          </button>
        </>}>
        <div className="po-form">
          <div className="po-form-row">
            <div className="po-form-field">
              <label className="adj-label">Supplier *</label>
              <select className="page-select" style={{ width: '100%' }} value={newPO.supplierId}
                onChange={(e) => setNewPO((p) => ({ ...p, supplierId: e.target.value }))}>
                <option value="">Select supplier…</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="po-form-field">
              <label className="adj-label">Warehouse *</label>
              <select className="page-select" style={{ width: '100%' }} value={newPO.warehouseId}
                onChange={(e) => setNewPO((p) => ({ ...p, warehouseId: e.target.value }))}>
                <option value="">Select warehouse…</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>
          <div className="po-form-row">
            <div className="po-form-field">
              <label className="adj-label">Expected delivery date</label>
              <input type="date" className="page-select" style={{ width: '100%' }} value={newPO.expectedDate}
                onChange={(e) => setNewPO((p) => ({ ...p, expectedDate: e.target.value }))} />
            </div>
            <div className="po-form-field">
              <label className="adj-label">Notes</label>
              <input type="text" className="page-select" style={{ width: '100%' }} placeholder="Optional…"
                value={newPO.notes} onChange={(e) => setNewPO((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>

          {/* Line items */}
          <div className="po-items-head">
            <span className="adj-label">Line Items</span>
            <button className="page-action-btn" onClick={addItem}><Plus size={13} /> Add item</button>
          </div>
          <div className="po-items">
            <div className="po-items-header">
              <span>Product</span><span>Qty</span><span>Unit Price (₹)</span><span>Subtotal</span><span></span>
            </div>
            {newPO.items.map((item, i) => (
              <div key={i} className="po-item-row">
                <select className="page-select" value={item.productId}
                  onChange={(e) => setItem(i, 'productId', e.target.value)}>
                  <option value="">Select product…</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
                <input type="number" className="page-select" min={1} value={item.quantity}
                  onChange={(e) => setItem(i, 'quantity', e.target.value)} style={{ width: 80 }} />
                <input type="number" className="page-select" min={0} step="0.01" value={item.unitPrice}
                  onChange={(e) => setItem(i, 'unitPrice', e.target.value)} style={{ width: 110 }} />
                <span className="po-item-subtotal">
                  {formatINR((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}
                </span>
                <button className="po-remove-btn" onClick={() => removeItem(i)} disabled={newPO.items.length === 1}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="po-total-row">
              <span>Total</span>
              <span className="po-total-val">{formatINR(poTotal)}</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Create Shipment Modal ── */}
      <Modal open={!!shipmentPO} onClose={() => setShipmentPO(null)}
        title={`Create Shipment — ${shipmentPO?.po_number ?? ''}`} size="sm"
        footer={<>
          <button className="page-btn-ghost" onClick={() => setShipmentPO(null)}>Cancel</button>
          <button className="page-btn-primary" onClick={submitShipment} disabled={shpLoading}>
            {shpLoading ? <Spinner size={16} color="white" /> : 'Create Shipment'}
          </button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="po-form-row">
            <div className="po-form-field">
              <label className="adj-label">Carrier</label>
              <input className="page-select" style={{ width: '100%' }} placeholder="e.g. Blue Dart"
                value={newShipment.carrier} onChange={(e) => setNewShipment((s) => ({ ...s, carrier: e.target.value }))} />
            </div>
            <div className="po-form-field">
              <label className="adj-label">Tracking number</label>
              <input className="page-select" style={{ width: '100%' }} placeholder="Optional"
                value={newShipment.trackingNumber} onChange={(e) => setNewShipment((s) => ({ ...s, trackingNumber: e.target.value }))} />
            </div>
          </div>
          <div className="po-form-field">
            <label className="adj-label">Expected arrival *</label>
            <input type="date" className="page-select" style={{ width: '100%' }}
              value={newShipment.expectedArrival} onChange={(e) => setNewShipment((s) => ({ ...s, expectedArrival: e.target.value }))} />
          </div>
          <div className="po-form-field">
            <label className="adj-label">Notes</label>
            <textarea className="adj-reason" rows={2} placeholder="Optional…"
              value={newShipment.notes} onChange={(e) => setNewShipment((s) => ({ ...s, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* ── Cancel PO Modal ── */}
      <Modal open={!!cancelPO} onClose={() => setCancelPO(null)}
        title={`Cancel PO — ${cancelPO?.po_number ?? ''}`} size="sm"
        footer={<>
          <button className="page-btn-ghost" onClick={() => setCancelPO(null)}>Keep PO</button>
          <button className="page-btn-primary" style={{ background: 'var(--danger)' }}
            onClick={submitCancel} disabled={cancelLoading || !cancelReason.trim()}>
            {cancelLoading ? <Spinner size={16} color="white" /> : 'Cancel PO'}
          </button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6 }}>
            This will permanently cancel <strong>{cancelPO?.po_number}</strong>. This action cannot be undone.
          </p>
          <div>
            <label className="adj-label">Reason for cancellation *</label>
            <textarea className="adj-reason" style={{ marginTop: 6 }} rows={3}
              placeholder="e.g. Supplier unavailable, budget cut, duplicate order…"
              value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
