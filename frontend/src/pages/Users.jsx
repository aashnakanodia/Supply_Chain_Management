import { useState, useEffect } from 'react'
import { Users as UsersIcon } from 'lucide-react'
import { getUsers, changeUserRole, updateUser } from '../api/users'
import { roleLabel, formatDate } from '../utils/formatters'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'
import './AppPage.css'

const ROLES = ['admin', 'procurement_manager', 'warehouse_staff', 'supplier', 'viewer']

const ROLE_VARIANTS = {
  admin:                'danger',
  procurement_manager:  'info',
  warehouse_staff:      'success',
  supplier:             'warning',
  viewer:               'neutral',
}

export default function Users() {
  const [users,   setUsers]   = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)
  const [acting,  setActing]  = useState(null)
  const [roleModal, setRoleModal] = useState(null)
  const [newRole,   setNewRole]   = useState('')
  const { toast } = useToast()
  const { user: me } = useAuth()

  const load = () => {
    setLoading(true)
    getUsers({ page, limit: 25 })
      .then(({ data }) => { setUsers(data.data?.users ?? []); setTotal(data.data?.total ?? 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page]) // eslint-disable-line

  const openRoleModal = (u) => { setRoleModal(u); setNewRole(u.role) }

  const submitRole = async () => {
    if (!newRole || !roleModal) return
    setActing(roleModal.id)
    try {
      await changeUserRole(roleModal.id, newRole)
      toast.success(`Role updated for ${roleModal.first_name}`)
      setRoleModal(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to change role')
    } finally {
      setActing(null)
    }
  }

  const toggleActive = async (u) => {
    setActing(u.id)
    try {
      await updateUser(u.id, { isActive: !u.is_active })
      toast.success(`${u.first_name} ${u.is_active ? 'deactivated' : 'activated'}`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to update user')
    } finally {
      setActing(null)
    }
  }

  const totalPages = Math.ceil(total / 25)

  return (
    <div className="page">
      <div className="page-table-wrap">
        {loading && users.length === 0 ? (
          <div className="page-loading"><Spinner /></div>
        ) : users.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No users found" />
        ) : (
          <table className="page-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'var(--primary-light)', color: 'var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800, flexShrink: 0,
                      }}>
                        {u.first_name?.[0]}{u.last_name?.[0]}
                      </div>
                      <span className="page-product-name">{u.first_name} {u.last_name}</span>
                    </div>
                  </td>
                  <td className="page-td-muted page-mono" style={{ fontSize: 12 }}>{u.email}</td>
                  <td>
                    <Badge variant={ROLE_VARIANTS[u.role] ?? 'neutral'}>
                      {roleLabel(u.role)}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={u.is_active ? 'success' : 'neutral'} dot>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="page-td-muted">{formatDate(u.created_at)}</td>
                  <td>
                    <div className="page-actions">
                      {u.id !== me?.id && (
                        <>
                          <button className="page-action-btn" onClick={() => openRoleModal(u)}>Change role</button>
                          <button
                            className={`page-action-btn ${u.is_active ? 'page-action-btn--danger' : 'page-action-btn--success'}`}
                            disabled={acting === u.id}
                            onClick={() => toggleActive(u)}
                          >
                            {acting === u.id ? <Spinner size={13} /> : u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </>
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

      <Modal
        open={!!roleModal}
        onClose={() => setRoleModal(null)}
        title={`Change Role — ${roleModal?.first_name ?? ''}`}
        size="sm"
        footer={
          <>
            <button className="page-btn-ghost" onClick={() => setRoleModal(null)}>Cancel</button>
            <button className="page-btn-primary" onClick={submitRole} disabled={!!acting || !newRole || newRole === roleModal?.role}>
              {acting ? <Spinner size={16} color="white" /> : 'Save role'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13.5, color: 'var(--text-2)' }}>
            Current role: <Badge variant={ROLE_VARIANTS[roleModal?.role]}>{roleLabel(roleModal?.role)}</Badge>
          </p>
          <label className="adj-label">New role</label>
          <select className="page-select" style={{ width: '100%' }} value={newRole} onChange={(e) => setNewRole(e.target.value)}>
            {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
          </select>
        </div>
      </Modal>
    </div>
  )
}
