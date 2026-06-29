import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Minus, SlidersHorizontal, AlertTriangle } from 'lucide-react'
import { getInventory, adjustInventory } from '../api/inventory'
import { getWarehouses } from '../api/warehouses'
import { formatTimeAgo } from '../utils/formatters'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import useSocket from '../hooks/useSocket'
import { useToast } from '../hooks/useToast'
import './AppPage.css'

function StockBar({ qty, reorder }) {
  if (!reorder) return <span className="page-mono">{qty}</span>
  const pct = Math.min(100, Math.round((qty / (reorder * 3)) * 100))
  const color = qty === 0 ? 'var(--danger)' : qty <= reorder ? 'var(--warning)' : 'var(--success)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, maxWidth: 80, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
      <span className="page-mono" style={{ color: qty === 0 ? 'var(--danger)' : qty <= reorder ? 'var(--warning)' : 'inherit' }}>
        {qty}
      </span>
    </div>
  )
}

function stockVariant(qty, reorder) {
  if (qty === 0) return 'danger'
  if (qty <= reorder) return 'warning'
  return 'success'
}

export default function Inventory() {
  const [items,     setItems]     = useState([])
  const [total,     setTotal]     = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [lowStock,  setLowStock]  = useState(false)
  const [warehouses, setWarehouses] = useState([])
  const [warehouseId, setWarehouseId] = useState('')
  const [page, setPage] = useState(1)

  // adjust modal
  const [adjItem,  setAdjItem]  = useState(null)
  const [adjDelta, setAdjDelta] = useState(0)
  const [adjReason, setAdjReason] = useState('')
  const [adjLoading, setAdjLoading] = useState(false)
  const { toast } = useToast()

  const load = useCallback(() => {
    setLoading(true)
    getInventory({ page, limit: 20, lowStock: lowStock || undefined, warehouseId: warehouseId || undefined })
      .then(({ data }) => {
        setItems(data.data?.inventory ?? [])
        setTotal(data.data?.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, lowStock, warehouseId])

  useEffect(() => { load() }, [load])
  useEffect(() => { getWarehouses().then(({ data }) => setWarehouses(data.data?.warehouses ?? [])).catch(() => {}) }, [])

  useSocket({ INVENTORY_CHANGED: () => load() })

  const openAdj = (item) => { setAdjItem(item); setAdjDelta(0); setAdjReason('') }
  const closeAdj = () => { setAdjItem(null); setAdjDelta(0); setAdjReason('') }

  const submitAdj = async () => {
    if (!adjDelta) return
    setAdjLoading(true)
    try {
      await adjustInventory(adjItem.id, { quantity: adjDelta, reason: adjReason || undefined })
      toast.success(`Stock updated: ${adjItem.product_name}`)
      closeAdj()
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to adjust stock')
    } finally {
      setAdjLoading(false)
    }
  }

  const filtered = items.filter((i) =>
    !search || i.product_name?.toLowerCase().includes(search.toLowerCase()) || i.sku?.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="page">
      {/* Toolbar */}
      <div className="page-toolbar">
        <div className="page-search-wrap">
          <Search size={14} className="page-search-icon" />
          <input
            className="page-search-input"
            placeholder="Search products or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="page-toolbar-right">
          <select
            className="page-select"
            value={warehouseId}
            onChange={(e) => { setWarehouseId(e.target.value); setPage(1) }}
          >
            <option value="">All warehouses</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <button
            className={`page-filter-btn ${lowStock ? 'page-filter-btn--on' : ''}`}
            onClick={() => { setLowStock((v) => !v); setPage(1) }}
          >
            <AlertTriangle size={14} />
            Low Stock Only
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="page-table-wrap">
        {loading && items.length === 0 ? (
          <div className="page-loading"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No inventory items found" description="Adjust your filters or add inventory items from the admin panel." />
        ) : (
          <table className="page-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Warehouse</th>
                <th>Quantity</th>
                <th>Reorder Point</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className={item.quantity <= item.reorder_point && item.reorder_point > 0 ? 'page-row--warn' : ''}>
                  <td>
                    <div className="page-product-cell">
                      <span className="page-product-name">{item.product_name}</span>
                      <code className="page-sku">{item.sku}</code>
                    </div>
                  </td>
                  <td className="page-td-muted">{item.warehouse_name}</td>
                  <td><StockBar qty={item.quantity} reorder={item.reorder_point} /></td>
                  <td className="page-mono">{item.reorder_point}</td>
                  <td>
                    <Badge variant={stockVariant(item.quantity, item.reorder_point)}>
                      {item.quantity === 0 ? 'Out of Stock' : item.quantity <= item.reorder_point ? 'Low Stock' : 'In Stock'}
                    </Badge>
                  </td>
                  <td className="page-td-muted">{formatTimeAgo(item.updated_at)}</td>
                  <td>
                    <button className="page-action-btn" onClick={() => openAdj(item)}>
                      Adjust
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="page-pagination">
          <button className="page-page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span className="page-page-info">Page {page} of {totalPages}</span>
          <button className="page-page-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}

      {/* Adjust modal */}
      <Modal
        open={!!adjItem}
        onClose={closeAdj}
        title={`Adjust Stock — ${adjItem?.product_name ?? ''}`}
        size="sm"
        footer={
          <>
            <button className="page-btn-ghost" onClick={closeAdj}>Cancel</button>
            <button className="page-btn-primary" onClick={submitAdj} disabled={adjLoading || !adjDelta}>
              {adjLoading ? <Spinner size={16} color="white" /> : 'Save adjustment'}
            </button>
          </>
        }
      >
        <div className="adj-modal">
          <div className="adj-current">
            <span>Current stock</span>
            <span className="adj-current-val">{adjItem?.quantity ?? 0} units</span>
          </div>

          <label className="adj-label">Adjustment</label>
          <div className="adj-counter">
            <button className="adj-counter-btn" onClick={() => setAdjDelta((v) => v - 1)}>
              <Minus size={16} />
            </button>
            <span className={`adj-counter-val ${adjDelta > 0 ? 'adj-pos' : adjDelta < 0 ? 'adj-neg' : ''}`}>
              {adjDelta > 0 ? '+' : ''}{adjDelta}
            </span>
            <button className="adj-counter-btn" onClick={() => setAdjDelta((v) => v + 1)}>
              <Plus size={16} />
            </button>
          </div>

          <div className="adj-new">
            New quantity: <strong>{(adjItem?.quantity ?? 0) + adjDelta}</strong>
          </div>

          <label className="adj-label">Reason (optional)</label>
          <textarea
            className="adj-reason"
            placeholder="e.g. Manual count correction, damaged goods..."
            value={adjReason}
            onChange={(e) => setAdjReason(e.target.value)}
            rows={3}
          />
        </div>
      </Modal>
    </div>
  )
}
