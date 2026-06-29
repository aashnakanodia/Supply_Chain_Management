import { useState, useEffect, useCallback } from 'react'
import { getPurchaseOrders, approvePurchaseOrder, updatePOStatus } from '../api/purchaseOrders'
import { formatINR, formatDate, formatTimeAgo } from '../utils/formatters'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import useSocket from '../hooks/useSocket'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'
import { ShoppingCart } from 'lucide-react'
import './AppPage.css'

const TABS = [
  { label: 'All',      value: '' },
  { label: 'Pending',  value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Ordered',  value: 'ordered' },
  { label: 'Received', value: 'received' },
  { label: 'Cancelled',value: 'cancelled' },
]

const STATUS_VARIANT = {
  pending:   'warning',
  approved:  'success',
  ordered:   'info',
  received:  'purple',
  cancelled: 'neutral',
}

const NEXT_STATUS = {
  approved: 'ordered',
  ordered:  'received',
}

export default function PurchaseOrders() {
  const [orders,  setOrders]  = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('')
  const [page,    setPage]    = useState(1)
  const [actingId, setActingId] = useState(null)
  const { toast } = useToast()
  const { user }  = useAuth()

  const canApprove  = user?.role === 'admin' || user?.role === 'procurement_manager'
  const canAdvance  = canApprove

  const load = useCallback(() => {
    setLoading(true)
    getPurchaseOrders({ status: tab || undefined, page, limit: 20 })
      .then(({ data }) => {
        setOrders(data.data?.purchaseOrders ?? [])
        setTotal(data.data?.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tab, page])

  useEffect(() => { load() }, [load])
  useSocket({ PO_APPROVED: () => load(), PO_STATUS_CHANGED: () => load() })

  const approve = async (id) => {
    setActingId(id)
    try {
      await approvePurchaseOrder(id)
      toast.success('Purchase order approved')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to approve PO')
    } finally {
      setActingId(null)
    }
  }

  const advance = async (id, currentStatus) => {
    const next = NEXT_STATUS[currentStatus]
    if (!next) return
    setActingId(id)
    try {
      await updatePOStatus(id, next)
      toast.success(`PO status updated to ${next}`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to update status')
    } finally {
      setActingId(null)
    }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="page">
      {/* Status tabs */}
      <div className="page-tabs">
        {TABS.map(({ label, value }) => (
          <button
            key={value}
            className={`page-tab ${tab === value ? 'page-tab--on' : ''}`}
            onClick={() => { setTab(value); setPage(1) }}
          >
            {label}
          </button>
        ))}
        <span className="page-tabs-indicator" style={{ '--tab-idx': TABS.findIndex((t) => t.value === tab) }} />
      </div>

      <div className="page-table-wrap">
        {loading && orders.length === 0 ? (
          <div className="page-loading"><Spinner /></div>
        ) : orders.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No purchase orders" description="No POs match the selected filter." />
        ) : (
          <table className="page-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Warehouse</th>
                <th className="text-right">Total Value</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.id}>
                  <td><code className="page-sku">{po.po_number}</code></td>
                  <td className="page-product-name">{po.supplier_name}</td>
                  <td className="page-td-muted">{po.warehouse_name}</td>
                  <td className="text-right page-mono">{formatINR(po.total_amount)}</td>
                  <td>
                    <Badge variant={STATUS_VARIANT[po.status] ?? 'neutral'} dot>
                      {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="page-td-muted">{formatDate(po.order_date ?? po.created_at)}</td>
                  <td>
                    <div className="page-actions">
                      {canApprove && po.status === 'pending' && (
                        <button
                          className="page-action-btn page-action-btn--primary"
                          disabled={actingId === po.id}
                          onClick={() => approve(po.id)}
                        >
                          {actingId === po.id ? <Spinner size={13} color="white" /> : 'Approve'}
                        </button>
                      )}
                      {canAdvance && NEXT_STATUS[po.status] && (
                        <button
                          className="page-action-btn"
                          disabled={actingId === po.id}
                          onClick={() => advance(po.id, po.status)}
                        >
                          {actingId === po.id ? <Spinner size={13} /> : `→ ${NEXT_STATUS[po.status]}`}
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
    </div>
  )
}
