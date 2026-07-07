import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Building2, Pencil } from 'lucide-react'
import { getSuppliers, createSupplier, updateSupplier } from '../api/suppliers'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'
import './AppPage.css'

const EMPTY_FORM = {
  name: '', contactName: '', email: '', phone: '',
  address: '', city: '', country: '', paymentTerms: '', leadTimeDays: '',
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [total,     setTotal]     = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [page,      setPage]      = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing,   setEditing]   = useState(null) // null = create, object = edit
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)

  const { toast } = useToast()
  const { user }  = useAuth()
  const canWrite = ['admin', 'procurement_manager'].includes(user?.role)

  const load = useCallback(() => {
    setLoading(true)
    getSuppliers({ page, limit: 20, search: search || undefined })
      .then(({ data }) => {
        setSuppliers(data.data?.suppliers ?? [])
        setTotal(data.data?.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    window.addEventListener('synapse:data-changed', load)
    return () => window.removeEventListener('synapse:data-changed', load)
  }, [load])

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true) }
  const openEdit   = (s) => {
    setEditing(s)
    setForm({
      name: s.name ?? '', contactName: s.contact_name ?? '', email: s.email ?? '',
      phone: s.phone ?? '', address: s.address ?? '', city: s.city ?? '',
      country: s.country ?? '', paymentTerms: s.payment_terms ?? '',
      leadTimeDays: s.lead_time_days != null ? String(s.lead_time_days) : '',
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
        name:         form.name.trim(),
        contactName:  form.contactName.trim()  || undefined,
        email:        form.email.trim()        || undefined,
        phone:        form.phone.trim()        || undefined,
        address:      form.address.trim()      || undefined,
        city:         form.city.trim()         || undefined,
        country:      form.country.trim()      || undefined,
        paymentTerms: form.paymentTerms.trim() || undefined,
        leadTimeDays: form.leadTimeDays !== '' ? parseInt(form.leadTimeDays) : undefined,
      }
      if (editing) {
        await updateSupplier(editing.id, payload)
        toast.success(`"${form.name}" updated`)
      } else {
        await createSupplier(payload)
        toast.success(`Supplier "${form.name}" added`)
      }
      closeModal()
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to save supplier')
    } finally {
      setSaving(false)
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
            placeholder="Search suppliers…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        {canWrite && (
          <div className="page-toolbar-right">
            <button className="page-btn-primary" onClick={openCreate}>
              <Plus size={14} /> Add Supplier
            </button>
          </div>
        )}
      </div>

      <div className="page-table-wrap">
        {loading && suppliers.length === 0 ? (
          <div className="page-loading"><Spinner /></div>
        ) : suppliers.length === 0 ? (
          <EmptyState icon={Building2} title="No suppliers found"
            description={search ? 'No suppliers match your search.' : 'No suppliers added yet.'} />
        ) : (
          <table className="page-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Phone</th>
                <th>City</th>
                <th>Country</th>
                <th>Payment Terms</th>
                <th>Lead Time</th>
                {canWrite && <th></th>}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td><span className="page-product-name">{s.name}</span></td>
                  <td className="page-td-muted">{s.contact_name ?? '—'}</td>
                  <td className="page-td-muted">{s.email ?? '—'}</td>
                  <td className="page-td-muted">{s.phone ?? '—'}</td>
                  <td className="page-td-muted">{s.city ?? '—'}</td>
                  <td className="page-td-muted">{s.country ?? '—'}</td>
                  <td className="page-td-muted">{s.payment_terms ?? '—'}</td>
                  <td className="page-td-muted">{s.lead_time_days ? `${s.lead_time_days}d` : '—'}</td>
                  {canWrite && (
                    <td>
                      <button className="page-action-btn" onClick={() => openEdit(s)} title="Edit supplier">
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
        title={editing ? `Edit Supplier — ${editing.name}` : 'Add Supplier'} size="sm"
        footer={<>
          <button className="page-btn-ghost" onClick={closeModal}>Cancel</button>
          <button className="page-btn-primary" onClick={submit} disabled={saving || !form.name.trim()}>
            {saving ? <Spinner size={16} color="white" /> : editing ? 'Save Changes' : 'Add Supplier'}
          </button>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="adj-label">Supplier Name *</label>
            <input className="page-search-input" style={{ marginTop: 6, width: '100%' }}
              placeholder="e.g. Tata Steel Ltd" value={form.name} onChange={set('name')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="adj-label">Contact Name</label>
              <input className="page-search-input" style={{ marginTop: 6, width: '100%' }}
                placeholder="e.g. Rahul Sharma" value={form.contactName} onChange={set('contactName')} />
            </div>
            <div>
              <label className="adj-label">Phone</label>
              <input className="page-search-input" style={{ marginTop: 6, width: '100%' }}
                placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} />
            </div>
          </div>
          <div>
            <label className="adj-label">Email</label>
            <input className="page-search-input" style={{ marginTop: 6, width: '100%' }}
              type="email" placeholder="supplier@example.com" value={form.email} onChange={set('email')} />
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="adj-label">Payment Terms</label>
              <input className="page-search-input" style={{ marginTop: 6, width: '100%' }}
                placeholder="e.g. Net 30" value={form.paymentTerms} onChange={set('paymentTerms')} />
            </div>
            <div>
              <label className="adj-label">Lead Time (days)</label>
              <input className="page-search-input" style={{ marginTop: 6, width: '100%' }}
                type="number" min="0" placeholder="0" value={form.leadTimeDays} onChange={set('leadTimeDays')} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
