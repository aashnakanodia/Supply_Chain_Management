const STYLES = {
  success: { background: 'var(--success-bg)', color: 'var(--success)',  border: '1px solid var(--success-border)' },
  warning: { background: 'var(--warning-bg)', color: 'var(--warning)',  border: '1px solid var(--warning-border)' },
  danger:  { background: 'var(--danger-bg)',  color: 'var(--danger)',   border: '1px solid var(--danger-border)'  },
  info:    { background: 'var(--info-bg)',     color: 'var(--info)',     border: '1px solid var(--info-border)'   },
  purple:  { background: 'var(--purple-bg)',   color: 'var(--purple)',   border: '1px solid var(--purple-border)' },
  primary: { background: 'var(--primary-light)', color: 'var(--primary-hover)', border: '1px solid var(--primary-100)' },
  neutral: { background: 'var(--surface-2)',   color: 'var(--text-2)',   border: '1px solid var(--border)' },
  navy:    { background: 'rgba(13,31,60,0.08)', color: 'var(--navy)',   border: '1px solid rgba(13,31,60,0.15)' },
}

export default function Badge({ children, variant = 'neutral', size = 'md', dot = false }) {
  const style = STYLES[variant] || STYLES.neutral
  const padding = size === 'sm' ? '2px 7px' : '3px 9px'
  const fontSize = size === 'sm' ? '11px' : '12px'

  return (
    <span style={{
      display:       'inline-flex',
      alignItems:    'center',
      gap:           dot ? '5px' : 0,
      padding,
      fontSize,
      fontWeight:    600,
      lineHeight:    1.5,
      borderRadius:  'var(--r-full)',
      whiteSpace:    'nowrap',
      letterSpacing: '0.01em',
      ...style,
    }}>
      {dot && (
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: 'currentColor', flexShrink: 0,
        }} />
      )}
      {children}
    </span>
  )
}
