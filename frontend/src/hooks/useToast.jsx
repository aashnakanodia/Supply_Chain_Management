import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  error:   XCircle,
  info:    Info,
}

const COLORS = {
  success: { bg: 'var(--success-bg)',  border: 'var(--success-border)',  icon: 'var(--success)' },
  warning: { bg: 'var(--warning-bg)',  border: 'var(--warning-border)',  icon: 'var(--warning)' },
  error:   { bg: 'var(--danger-bg)',   border: 'var(--danger-border)',   icon: 'var(--danger)'  },
  info:    { bg: 'var(--info-bg)',     border: 'var(--info-border)',     icon: 'var(--info)'    },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const add = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev.slice(-4), { id, message, type }])
    setTimeout(() => remove(id), duration)
  }, [remove])

  const toast = {
    success: (msg) => add(msg, 'success'),
    error:   (msg) => add(msg, 'error'),
    warning: (msg) => add(msg, 'warning'),
    info:    (msg) => add(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => {
          const Icon   = ICONS[t.type] || Info
          const colors = COLORS[t.type] || COLORS.info
          return (
            <div
              key={t.id}
              className="toast-item"
              style={{ background: colors.bg, borderColor: colors.border }}
            >
              <Icon size={16} color={colors.icon} style={{ flexShrink: 0 }} />
              <span className="toast-msg">{t.message}</span>
              <button className="toast-close" onClick={() => remove(t.id)}>
                <X size={13} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
