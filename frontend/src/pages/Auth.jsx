import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Zap, Eye, EyeOff, ArrowRight, CheckCircle, ArrowLeft, Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { register as apiRegister, forgotPassword as apiForgotPassword } from '../api/auth'
import Spinner from '../components/ui/Spinner'
import './Auth.css'

const ROLES = [
  { value: 'viewer',              label: 'Viewer',              icon: '👁', desc: 'Read-only access' },
  { value: 'warehouse_staff',     label: 'Warehouse Staff',     icon: '📦', desc: 'Manage inventory' },
  { value: 'procurement_manager', label: 'Procurement Manager', icon: '📋', desc: 'Create & approve POs' },
  { value: 'supplier',            label: 'Supplier',            icon: '🏭', desc: 'View your orders' },
]

function StrengthBar({ password }) {
  if (!password) return null
  let s = 0
  if (password.length >= 8)           s++
  if (/[A-Z]/.test(password))         s++
  if (/[0-9]/.test(password))         s++
  if (/[^A-Za-z0-9]/.test(password))  s++
  const colors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981']
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  return (
    <div className="auth-strength">
      <div className="auth-strength-bars">
        {[1,2,3,4].map((n) => (
          <div key={n} className="auth-strength-bar"
            style={{ background: n <= s ? colors[s] : 'var(--border)' }} />
        ))}
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: colors[s] }}>{labels[s]}</span>
    </div>
  )
}

export default function Auth() {
  const [params]    = useSearchParams()
  const [mode, setMode] = useState(params.get('mode') === 'signup' ? 'signup' : 'signin')
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [errors,  setErrors]  = useState({})
  const [globalErr, setGlobalErr] = useState('')
  const [loading, setLoading] = useState(false)

  // Forgot password
  const [forgotEmail,   setForgotEmail]   = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent,    setForgotSent]    = useState(false)
  const [forgotErr,     setForgotErr]     = useState('')

  const { login } = useAuth()
  const navigate  = useNavigate()

  const switchMode = (m) => {
    setMode(m)
    setErrors({})
    setGlobalErr('')
  }

  // Clear error as soon as the user edits any field
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }))
    if (globalErr)  setGlobalErr('')
  }

  const validate = () => {
    const e = {}
    if (mode === 'signup') {
      if (!form.firstName.trim()) e.firstName = 'Required'
      if (!form.lastName.trim())  e.lastName  = 'Required'
      if (!form.role)             e.role      = 'Select a role to continue'
    }
    if (!form.email.trim())           e.email    = 'Required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address'
    if (!form.password)               e.password = 'Required'
    else if (form.password.length < 8) e.password = 'At least 8 characters'
    return e
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      let loggedIn
      if (mode === 'signup') {
        await apiRegister({
          firstName: form.firstName.trim(),
          lastName:  form.lastName.trim(),
          email:     form.email.trim().toLowerCase(),
          password:  form.password,
          role:      form.role,
        })
        loggedIn = await login(form.email.trim().toLowerCase(), form.password)
      } else {
        loggedIn = await login(form.email.trim().toLowerCase(), form.password)
      }
      const dest = loggedIn?.role === 'supplier' ? '/purchase-orders' : '/dashboard'
      navigate(dest, { replace: true })
    } catch (err) {
      if (!err.response) {
        setGlobalErr('Cannot connect to server. Make sure the backend is running on port 3000.')
        setLoading(false)
        return
      }
      const status = err.response.status
      const msg    = err.response.data?.error?.message ?? ''
      const lower  = msg.toLowerCase()

      if (mode === 'signup' && (status === 409 || lower.includes('already') || lower.includes('exist') || lower.includes('email'))) {
        setErrors({ email: 'This email is already registered' })
        setGlobalErr('An account with this email already exists — try signing in instead.')
      } else if (mode === 'signin' && status === 401) {
        setGlobalErr('Incorrect email or password. Please try again.')
      } else if (status === 422) {
        setGlobalErr(msg || 'Please check all fields and try again.')
      } else {
        setGlobalErr(msg || 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const submitForgot = async (e) => {
    e.preventDefault()
    if (!forgotEmail.trim() || !/\S+@\S+\.\S+/.test(forgotEmail)) {
      setForgotErr('Enter a valid email address')
      return
    }
    setForgotErr('')
    setForgotLoading(true)
    try {
      await apiForgotPassword(forgotEmail.trim().toLowerCase())
      setForgotSent(true)
    } catch {
      setForgotErr('Something went wrong. Please try again.')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="auth">
      {/* Left panel */}
      <div className="auth-left">
        <div className="auth-left-bg" aria-hidden />
        <div className="auth-left-content">
          <Link to="/" className="auth-nav-logo">
            <div className="auth-nav-logo-icon"><Zap size={16} /></div>
            TechVolt <strong>SCM</strong>
          </Link>

          <div className="auth-left-hero">
            <h2 className="auth-left-h2">
              Manage your entire<br />supply chain from<br /><em>one dashboard.</em>
            </h2>
            <p className="auth-left-sub">
              Real-time inventory, PO workflows, shipment tracking,
              and automated alerts — built for Indian electronics distributors.
            </p>
          </div>

          <div className="auth-left-features">
            {[
              'Live inventory across all warehouses',
              'Auto alerts when stock runs low',
              'Full purchase order lifecycle',
              'Role-based access for your team',
            ].map((f) => (
              <div key={f} className="auth-left-feature">
                <CheckCircle size={14} />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-form-wrap">

          {/* ── FORGOT PASSWORD VIEW ── */}
          {mode === 'forgot' && (
            <div className="auth-forgot-view" key="forgot">
              <button className="auth-back-btn" onClick={() => { setMode('signin'); setForgotSent(false); setForgotErr('') }}>
                <ArrowLeft size={14} /> Back to sign in
              </button>

              {forgotSent ? (
                <div className="auth-sent-state">
                  <div className="auth-sent-icon"><Mail size={28} /></div>
                  <h2 className="auth-h1">Check your inbox</h2>
                  <p className="auth-h1-sub">
                    If <strong>{forgotEmail}</strong> is registered, a password reset link has been sent.
                    Check your spam folder too — it might land there.
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 12 }}>
                    Didn't get it?{' '}
                    <button className="auth-link-btn" onClick={() => setForgotSent(false)}>
                      Try again
                    </button>
                  </p>
                </div>
              ) : (
                <>
                  <div className="auth-heading">
                    <h1 className="auth-h1">Forgot password?</h1>
                    <p className="auth-h1-sub">Enter your email and we'll send a reset link.</p>
                  </div>
                  <form onSubmit={submitForgot} noValidate className="auth-form">
                    <Field label="Email address" error={forgotErr}>
                      <input
                        type="email"
                        placeholder="you@company.in"
                        value={forgotEmail}
                        onChange={(e) => { setForgotEmail(e.target.value); setForgotErr('') }}
                        disabled={forgotLoading}
                        autoFocus
                      />
                    </Field>
                    <button className="auth-submit" disabled={forgotLoading}>
                      {forgotLoading
                        ? <Spinner size={18} color="white" />
                        : <>Send reset link <ArrowRight size={15} /></>
                      }
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* ── SIGN IN / SIGN UP VIEW ── */}
          {mode !== 'forgot' && (
            <>
              {/* Tabs */}
              <div className="auth-tabs">
                <button
                  className={`auth-tab ${mode === 'signin' ? 'auth-tab--on' : ''}`}
                  onClick={() => switchMode('signin')} type="button"
                >Sign In</button>
                <button
                  className={`auth-tab ${mode === 'signup' ? 'auth-tab--on' : ''}`}
                  onClick={() => switchMode('signup')} type="button"
                >Create Account</button>
                <span className={`auth-tab-indicator ${mode === 'signup' ? 'auth-tab-indicator--r' : ''}`} />
              </div>

              {/* Heading */}
              <div className="auth-heading" key={mode}>
                <h1 className="auth-h1">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
                <p className="auth-h1-sub">
                  {mode === 'signin'
                    ? 'Sign in to your TechVolt SCM account'
                    : 'Join TechVolt SCM and take control of your supply chain'}
                </p>
              </div>

              <form onSubmit={submit} noValidate className="auth-form">
                {mode === 'signup' && (
                  <div className="auth-row">
                    <Field label="First name" error={errors.firstName}>
                      <input
                        placeholder="Rajesh"
                        value={form.firstName}
                        onChange={set('firstName')}
                        disabled={loading}
                        className={errors.firstName ? 'is-err' : ''}
                        autoFocus
                      />
                    </Field>
                    <Field label="Last name" error={errors.lastName}>
                      <input
                        placeholder="Iyer"
                        value={form.lastName}
                        onChange={set('lastName')}
                        disabled={loading}
                        className={errors.lastName ? 'is-err' : ''}
                      />
                    </Field>
                  </div>
                )}

                <Field label="Email address" error={errors.email}>
                  <input
                    type="email"
                    placeholder="you@company.in"
                    value={form.email}
                    onChange={set('email')}
                    disabled={loading}
                    className={errors.email ? 'is-err' : ''}
                    autoFocus={mode === 'signin'}
                  />
                </Field>

                <Field label="Password" error={errors.password}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={set('password')}
                      disabled={loading}
                      className={errors.password ? 'is-err' : ''}
                      style={{ paddingRight: 42 }}
                    />
                    <button
                      type="button"
                      className="auth-eye"
                      onClick={() => setShowPwd((v) => !v)}
                      tabIndex={-1}
                    >
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {mode === 'signup' && <StrengthBar password={form.password} />}
                  {mode === 'signin' && (
                    <button
                      type="button"
                      className="auth-forgot-link"
                      onClick={() => { setMode('forgot'); setForgotEmail(form.email); setForgotSent(false) }}
                    >
                      Forgot password?
                    </button>
                  )}
                </Field>

                {mode === 'signup' && (
                  <Field label="Your role" error={errors.role}>
                    <div className="auth-roles">
                      {ROLES.map(({ value, label, icon, desc }) => (
                        <button
                          key={value}
                          type="button"
                          className={`auth-role-chip ${form.role === value ? 'auth-role-chip--on' : ''}`}
                          onClick={() => { setForm((f) => ({ ...f, role: value })); if (errors.role) setErrors((p) => ({ ...p, role: undefined })) }}
                        >
                          <span className="auth-role-icon">{icon}</span>
                          <span className="auth-role-name">{label}</span>
                          <span className="auth-role-desc">{desc}</span>
                          {form.role === value && (
                            <CheckCircle size={12} className="auth-role-check" />
                          )}
                        </button>
                      ))}
                    </div>
                  </Field>
                )}

                {globalErr && (
                  <div className="auth-global-err">{globalErr}</div>
                )}

                <button className="auth-submit" disabled={loading}>
                  {loading
                    ? <Spinner size={18} color="white" />
                    : <>{mode === 'signin' ? 'Sign in' : 'Create account'} <ArrowRight size={15} /></>
                  }
                </button>
              </form>

              <p className="auth-switch">
                {mode === 'signin'
                  ? <>Don't have an account? <button onClick={() => switchMode('signup')}>Create one</button></>
                  : <>Already have an account? <button onClick={() => switchMode('signin')}>Sign in</button></>
                }
              </p>

              {mode === 'signin' && (
                <div className="auth-demo-hint">
                  <span>Demo: </span>
                  <code>rajesh.iyer@techvolt.in</code>
                  <span> / </span>
                  <code>Admin@1234</code>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div className="auth-field">
      <label className="auth-label">{label}</label>
      {children}
      {error && <span className="auth-field-err">{error}</span>}
    </div>
  )
}
