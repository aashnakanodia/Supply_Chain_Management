import { useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { Zap, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react'
import { resetPassword } from '../api/auth'
import Spinner from '../components/ui/Spinner'
import './Auth.css'

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

export default function ResetPassword() {
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  const token      = params.get('token') ?? ''

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPwd,   setShowPwd]   = useState(false)
  const [showConf,  setShowConf]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!token) { setError('Reset link is missing or invalid. Request a new one.'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setError('')
    setLoading(true)
    try {
      await resetPassword(token, password)
      setSuccess(true)
      setTimeout(() => navigate('/auth', { replace: true }), 3000)
    } catch (err) {
      const msg = err.response?.data?.error?.message ?? ''
      setError(msg || 'Reset link is invalid or has expired. Please request a new one.')
    } finally {
      setLoading(false)
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
            <strong>Synapse</strong>
          </Link>
          <div className="auth-left-hero">
            <h2 className="auth-left-h2">
              Almost there.<br />Set a new<br /><em>password.</em>
            </h2>
            <p className="auth-left-sub">
              Choose something strong — at least 8 characters with uppercase, a number, and a symbol.
            </p>
          </div>
          <div className="auth-left-features">
            {['Minimum 8 characters', 'At least one uppercase', 'Include a number', 'Add a special character'].map((f) => (
              <div key={f} className="auth-left-feature"><CheckCircle size={14} /><span>{f}</span></div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-form-wrap">
          {success ? (
            <div className="auth-sent-state" style={{ paddingTop: 40 }}>
              <div className="auth-sent-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
                <CheckCircle size={28} />
              </div>
              <h2 className="auth-h1">Password updated!</h2>
              <p className="auth-h1-sub">
                Your password has been reset successfully. Redirecting you to sign in…
              </p>
              <Link to="/auth" className="auth-submit" style={{ textDecoration: 'none', marginTop: 8, justifyContent: 'center' }}>
                Go to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="auth-heading">
                <h1 className="auth-h1">Set new password</h1>
                <p className="auth-h1-sub">Enter your new password below.</p>
              </div>

              <form onSubmit={submit} noValidate className="auth-form">
                <div className="auth-field">
                  <label className="auth-label">New password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError('') }}
                      disabled={loading}
                      style={{ paddingRight: 42 }}
                      autoFocus
                    />
                    <button type="button" className="auth-eye" onClick={() => setShowPwd((v) => !v)} tabIndex={-1}>
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <StrengthBar password={password} />
                </div>

                <div className="auth-field">
                  <label className="auth-label">Confirm new password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConf ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirm}
                      onChange={(e) => { setConfirm(e.target.value); setError('') }}
                      disabled={loading}
                      style={{ paddingRight: 42 }}
                    />
                    <button type="button" className="auth-eye" onClick={() => setShowConf((v) => !v)} tabIndex={-1}>
                      {showConf ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {confirm && confirm !== password && (
                    <span className="auth-field-err">Passwords don't match</span>
                  )}
                </div>

                {error && <div className="auth-global-err">{error}</div>}

                <button className="auth-submit" disabled={loading}>
                  {loading ? <Spinner size={18} color="white" /> : <>Reset password <ArrowRight size={15} /></>}
                </button>
              </form>

              <p className="auth-switch">
                Remember it? <Link to="/auth" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
