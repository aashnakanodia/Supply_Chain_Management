import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Package, PowerOff, RefreshCw } from 'lucide-react'
import { getProducts, createProduct, deactivateProduct, reactivateProduct } from '../api/products'
import { formatINR } from '../utils/formatters'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'
import './AppPage.css'

const EMPTY_FORM = {
  sku: '', name: '', description: '', category: '',
  unit: 'piece', unitPrice: '', reorderLevel: '', leadTimeDays: '',
}

export default function Products() {
  const [products, setProducts] = useState([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [page,     setPage]     = useState(1)

  // add modal
  const [modalOpen, setModalOpen] = useState(false)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)

  // inactive toggle
  const [showInactive, setShowInactive] = useState(false)

  // deactivate confirm
  const [deactivating, setDeactivating] = useState(null)
  const [deactLoading, setDeactLoading] = useState(false)

  // reactivate confirm
  const [reactivating, setReactivating] = useState(null)
  const [reactLoading, setReactLoading] = useState(false)

  const { toast } = useToast()
  const { user }  = useAuth()
  const canWrite    = ['admin', 'procurement_manager'].includes(user?.role)
  const canDeactivate = user?.role === 'admin'

  const load = useCallback(() => {
    setLoading(true)
    getProducts({ page, limit: 20, search: search || undefined, isActive: !showInactive })
      .then(({ data }) => {
        setProducts(data.data?.products ?? [])
        setTotal(data.data?.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, search, showInactive])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    window.addEventListener('synapse:data-changed', load)
    return () => window.removeEventListener('synapse:data-changed', load)
  }, [load])

  const openModal  = () => { setForm(EMPTY_FORM); setModalOpen(true) }
  const closeModal = () => setModalOpen(false)
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const submit = async () => {
    if (!form.sku.trim() || !form.name.trim()) { toast.error('SKU and Name are required'); return }
    setSaving(true)
    try {
      await createProduct({
        sku:          form.sku.trim(),
        name:         form.name.trim(),
        description:  form.description.trim() || undefined,
        category:     form.category.trim()    || undefined,
        unit:         form.unit               || 'piece',
        unitPrice:    parseFloat(form.unitPrice)  || 0,
        reorderLevel: parseInt(form.reorderLevel) || 0,
        leadTimeDays: parseInt(form.leadTimeDays) || 0,
      })
      toast.success(`Product "${form.name}" created`)
      closeModal()
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to create product')
    } finally {
      setSaving(false)
    }
  }

  const confirmDeactivate = async () => {
    if (!deactivating) return
    setDeactLoading(true)
    try {
      await deactivateProduct(deactivating.id)
      toast.success(`"${deactivating.name}" deactivated`)
      setDeactivating(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to deactivate product')
    } finally {
      setDeactLoading(false)
    }
  }

  const confirmReactivate = async () => {
    if (!reactivating) return
    setReactLoading(true)
    try {
      await reactivateProduct(reactivating.id)
      toast.success(`"${reactivating.name}" reactivated`)
      setReactivating(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to reactivate product')
    } finally {
      setReactLoading(false)
    }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="page">
      <div className="page-toolbar">
        <div className="page-search-wrap">
          <Search size={14} className="page-search-icon" />
          <input
            className="page-search-input"
            placeholder="Search by name or SKU…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <div className="page-toolbar-right">
          {canDeactivate && (
            <button
              className={showInactive ? 'page-btn-primary' : 'page-btn-ghost'}
              style={showInactive ? { background: 'var(--warning, #f59e0b)' } : {}}
              onClick={() => { setShowInactive((v) => !v); setPage(1) }}
            >
              <PowerOff size={14} /> {showInactive ? 'Showing Inactive' : 'Show Inactive'}
            </button>
          )}
          {canWrite && !showInactive && (
            <button className="page-btn-primary" onClick={openModal}>
              <Plus size={14} /> Add Product
            </button>
          )}
        </div>
      </div>

      <div className="page-table-wrap">
        {loading && products.length === 0 ? (
          <div className="page-loading"><Spinner /></div>
        ) : products.length === 0 ? (
          <EmptyState icon={Package} title="No products found"
            description={
              search
                ? 'No products match your search.'
                : showInactive
                  ? 'No inactive products.'
                  : 'No products in the catalogue yet.'
            } />
        ) : (
          <table className="page-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Unit Price</th>
                <th>Reorder Level</th>
                <th>Lead Time</th>
                {canDeactivate && <th></th>}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td><code className="page-sku">{p.sku}</code></td>
                  <td><span className="page-product-name">{p.name}</span></td>
                  <td className="page-td-muted">{p.category ?? '—'}</td>
                  <td className="page-td-muted">{p.unit}</td>
                  <td className="page-mono">{formatINR(p.unit_price)}</td>
                  <td className="page-mono">{p.reorder_level ?? 0}</td>
                  <td className="page-td-muted">{p.lead_time_days ? `${p.lead_time_days}d` : '—'}</td>
                  {canDeactivate && (
                    <td>
                      {showInactive ? (
                        <button
                          className="page-action-btn page-action-btn--success"
                          onClick={() => setReactivating(p)}
                          title="Reactivate product"
                        >
                          <RefreshCw size={13} /> Reactivate
                        </button>
                      ) : (
                        <button
                          className="page-action-btn page-action-btn--danger"
                          onClick={() => setDeactivating(p)}
                          title="Deactivate product"
                        >
                          <PowerOff size={13} /> Deactivate
                        </button>
                      )}
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

      {/* Add Product modal */}
      <Modal open={modalOpen} onClose={closeModal} title="Add New Product" size="sm"
        footer={<>
          <button className="page-btn-ghost" onClick={closeModal}>Cancel</button>
          <button className="page-btn-primary" onClick={submit} disabled={saving || !form.sku.trim() || !form.name.trim()}>
            {saving ? <Spinner size={16} color="white" /> : 'Create Product'}
          </button>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="adj-label">SKU *</label>
              <input className="page-search-input" style={{ marginTop: 6, width: '100%' }}
                placeholder="e.g. PROD-001" value={form.sku} onChange={set('sku')} />
            </div>
            <div>
              <label className="adj-label">Unit</label>
              <select className="page-select" style={{ width: '100%', marginTop: 6 }}
                value={form.unit} onChange={set('unit')}>
                {['piece','kg','litre','metre','box','carton','dozen','pair'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="adj-label">Product Name *</label>
            <input className="page-search-input" style={{ marginTop: 6, width: '100%' }}
              placeholder="e.g. Hex Bolt M8" value={form.name} onChange={set('name')} />
          </div>
          <div>
            <label className="adj-label">Category</label>
            <input className="page-search-input" style={{ marginTop: 6, width: '100%' }}
              placeholder="e.g. Hardware, Electronics, Packaging" value={form.category} onChange={set('category')} />
          </div>
          <div>
            <label className="adj-label">Description</label>
            <textarea className="adj-reason" style={{ marginTop: 6 }} rows={2}
              placeholder="Optional description" value={form.description} onChange={set('description')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label className="adj-label">Unit Price (₹)</label>
              <input className="page-search-input" style={{ marginTop: 6, width: '100%' }}
                type="number" min="0" placeholder="0" value={form.unitPrice} onChange={set('unitPrice')} />
            </div>
            <div>
              <label className="adj-label">Reorder Level</label>
              <input className="page-search-input" style={{ marginTop: 6, width: '100%' }}
                type="number" min="0" placeholder="0" value={form.reorderLevel} onChange={set('reorderLevel')} />
            </div>
            <div>
              <label className="adj-label">Lead Time (days)</label>
              <input className="page-search-input" style={{ marginTop: 6, width: '100%' }}
                type="number" min="0" placeholder="0" value={form.leadTimeDays} onChange={set('leadTimeDays')} />
            </div>
          </div>
        </div>
      </Modal>

      {/* Reactivate confirm modal */}
      <Modal open={!!reactivating} onClose={() => setReactivating(null)}
        title="Reactivate Product" size="sm"
        footer={<>
          <button className="page-btn-ghost" onClick={() => setReactivating(null)}>Cancel</button>
          <button className="page-btn-primary"
            onClick={confirmReactivate} disabled={reactLoading}>
            {reactLoading ? <Spinner size={16} color="white" /> : 'Reactivate'}
          </button>
        </>}
      >
        <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6 }}>
          This will reactivate <strong>{reactivating?.name}</strong> ({reactivating?.sku}) and
          make it visible in the catalogue again.
        </p>
      </Modal>

      {/* Deactivate confirm modal */}
      <Modal open={!!deactivating} onClose={() => setDeactivating(null)}
        title="Deactivate Product" size="sm"
        footer={<>
          <button className="page-btn-ghost" onClick={() => setDeactivating(null)}>Cancel</button>
          <button className="page-btn-primary" style={{ background: 'var(--danger)' }}
            onClick={confirmDeactivate} disabled={deactLoading}>
            {deactLoading ? <Spinner size={16} color="white" /> : 'Deactivate'}
          </button>
        </>}
      >
        <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6 }}>
          This will deactivate <strong>{deactivating?.name}</strong> ({deactivating?.sku}).
          It will be hidden from the catalogue and cannot be ordered, but all historical
          records referencing it are preserved.
        </p>
      </Modal>
    </div>
  )
}
