export function formatINR(amount) {
  if (amount == null) return '—'
  const n = Number(amount)
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(1)}L`
  if (n >= 1_000)       return `₹${(n / 1_000).toFixed(1)}K`
  return `₹${n.toLocaleString('en-IN')}`
}

export function formatINRFull(amount) {
  if (amount == null) return '—'
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatTimeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  <  1)  return 'just now'
  if (mins  < 60)  return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  if (days  <  7)  return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ')
}

export function roleLabel(role) {
  const labels = {
    admin:                'Admin',
    procurement_manager:  'Procurement Manager',
    warehouse_staff:      'Warehouse Staff',
    supplier:             'Supplier',
    viewer:               'Viewer',
  }
  return labels[role] || role
}

export function statusColor(status) {
  const map = {
    pending:     'warning',
    approved:    'success',
    ordered:     'info',
    received:    'purple',
    cancelled:   'neutral',
    pending_approval: 'warning',
    in_transit:  'info',
    delivered:   'success',
    active:      'success',
    inactive:    'neutral',
    low_stock:   'warning',
    out_of_stock:'danger',
    critical:    'danger',
    high:        'warning',
    medium:      'info',
    low:         'neutral',
  }
  return map[status] || 'neutral'
}
