import { PackageSearch } from 'lucide-react'

export default function EmptyState({ icon: Icon = PackageSearch, title, description, action }) {
  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      textAlign:      'center',
      padding:        '64px 24px',
      gap:            12,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 'var(--r-lg)',
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-3)', marginBottom: 4,
      }}>
        <Icon size={24} />
      </div>
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{title}</p>
      {description && (
        <p style={{ fontSize: 13.5, color: 'var(--text-3)', maxWidth: 360, lineHeight: 1.6 }}>{description}</p>
      )}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  )
}
