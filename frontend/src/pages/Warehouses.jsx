import { useState, useEffect, useCallback } from 'react'
import { Plus, Warehouse, Pencil } from 'lucide-react'
import { getWarehouses, createWarehouse, updateWarehouse } from '../api/warehouses'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'
import './AppPage.css'

const EMPTY_FORM = { name: '', address: '', city: '', country: '', capacity: '', managerName: '' }

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([])
  const [total,      setTotal]      = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [page,       setPage]       = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)

  const { toast } = useToast()
  const { user }  = useAuth()
  const canWrite = user?.role === 'admin'

  const load = useCallback(() => {
    setLoading(true)
    getWarehouses({ page, limit: 20 })
      .then(({ data }) => {
        setWarehouses(data.data?.warehouses ?? [])
        setTotal(data.data?.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    window.addEventListener('synapse:data-changed', load)
    return () => window.removeEventListener('synapse:data-changed', load)
  }, [load])

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true) }
  const openEdit   = (w) => {
    setEditing(w)
    setForm({
      name:     w.name     ?? '',
      address:  w.address  ?? '',
      city:     w.city     ?? '',
      country:  w.country  ?? '',
      capacity:    w.capacity != null ? String(w.capacity) : '',
      managerName: w.manager_name ?? '',
    })
    setModalOpen(true)
  }
  const closeModal = () => setModalOpen(false)
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const submit = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const payload = {
        name:     form.name.trim(),
        address:  form.address.trim()  || undefined,
        city:     form.city.trim()     || undefined,
        country:  form.country.trim()  || undefined,
        capacity:    form.capacity    !== '' ? parseInt(form.capacity) : undefined,
        managerName: form.managerName.trim() || undefined,
      }
      if (editing) {
        await updateWarehouse(editing.id, payload)
        toast.success(`"${form.name}" updated`)
      } else {
        await createWarehouse(payload)
        toast.success(`Warehouse "${form.name}" created`)
      }
      closeModal()
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to save warehouse')
    } finally {
      setSaving(false)
    }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="page">
      <div className="page-toolbar">
        <div style={{ flex: 1 }} />
        {canWrite && (
          <div className="page-toolbar-right">
            <button className="page-btn-primary" onClick={openCreate}>
              <Plus size={14} /> Add Warehouse
            </button>
          </div>
        )}
      </div>

      <div className="page-table-wrap">
        {loading && warehouses.length === 0 ? (
          <div className="page-loading"><Spinner /></div>
        ) : warehouses.length === 0 ? (
          <EmptyState icon={Warehouse} title="No warehouses found"
            description="No warehouses have been added yet." />
        ) : (
          <table className="page-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>City</th>
                <th>Country</th>
                <th>Capacity</th>
                <th>Manager</th>
                {canWrite && <th></th>}
              </tr>
            </thead>
            <tbody>
              {warehouses.map((w) => (
                <tr key={w.id}>
                  <td><span className="page-product-name">{w.name}</span></td>
                  <td className="page-td-muted">{w.city ?? '—'}</td>
                  <td className="page-td-muted">{w.country ?? '—'}</td>
                  <td className="page-mono">{w.capacity != null ? w.capacity.toLocaleString() : '—'}</td>
                  <td className="page-td-muted">{w.manager_name ?? '—'}</td>
                  {canWrite && (
                    <td>
                      <button className="page-action-btn" onClick={() => openEdit(w)} title="Edit warehouse">
                        <Pencil size={13} /> Edit
                      </button>
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

      <Modal open={modalOpen} onClose={closeModal}
        title={editing ? `Edit Warehouse — ${editing.name}` : 'Add Warehouse'} size="sm"
        footer={<>
          <button className="page-btn-ghost" onClick={closeModal}>Cancel</button>
          <button className="page-btn-primary" onClick={submit} disabled={saving || !form.name.trim()}>
            {saving ? <Spinner size={16} color="white" /> : editing ? 'Save Changes' : 'Add Warehouse'}
          </button>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="adj-label">Warehouse Name *</label>
            <input className="page-search-input" style={{ marginTop: 6, width: '100%' }}
              placeholder="e.g. Mumbai Central Warehouse" value={form.name} onChange={set('name')} />
          </div>
          <div>
            <label className="adj-label">Address</label>
            <input className="page-search-input" style={{ marginTop: 6, width: '100%' }}
              placeholder="Street address" value={form.address} onChange={set('address')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="adj-label">City</label>
              <input className="page-search-input" style={{ marginTop: 6, width: '100%' }}
                placeholder="Mumbai" value={form.city} onChange={set('city')} />
            </div>
            <div>
              <label className="adj-label">Country</label>
              <input className="page-search-input" style={{ marginTop: 6, width: '100%' }}
                placeholder="India" value={form.country} onChange={set('country')} />
            </div>
          </div>
          <div>
            <label className="adj-label">Capacity (units)</label>
            <input className="page-search-input" style={{ marginTop: 6, width: '100%' }}
              type="number" min="0" placeholder="e.g. 10000" value={form.capacity} onChange={set('capacity')} />
          </div>
          <div>
            <label className="adj-label">Manager Name</label>
            <input className="page-search-input" style={{ marginTop: 6, width: '100%' }}
              placeholder="e.g. Rajesh Kumar" value={form.managerName} onChange={set('managerName')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
