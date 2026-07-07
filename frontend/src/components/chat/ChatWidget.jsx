import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, X, Send, Plus, Trash2, ChevronLeft, Loader, Minus, Maximize2 } from 'lucide-react'
import * as chatApi from '../../api/chat'
import './ChatWidget.css'

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`cw-bubble-row ${isUser ? 'cw-bubble-row--user' : 'cw-bubble-row--ai'}`}>
      {!isUser && (
        <div className="cw-avatar">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
            <circle cx="12" cy="12" r="4" fill="#2dd4cc" />
            <circle cx="12" cy="4"  r="2" fill="#0e9f99" opacity=".7" />
            <circle cx="19.2" cy="8"  r="2" fill="#0e9f99" opacity=".7" />
            <circle cx="19.2" cy="16" r="2" fill="#0e9f99" opacity=".7" />
            <circle cx="12" cy="20" r="2" fill="#0e9f99" opacity=".7" />
            <circle cx="4.8" cy="16" r="2" fill="#0e9f99" opacity=".7" />
            <circle cx="4.8" cy="8"  r="2" fill="#0e9f99" opacity=".7" />
          </svg>
        </div>
      )}
      <div className="cw-bubble">
        <div className="cw-bubble-text">
          {msg.content.split('\n').map((line, i) => (
            <span key={i}>{line}{i < msg.content.split('\n').length - 1 && <br />}</span>
          ))}
        </div>
        <div className="cw-bubble-time">{formatTime(msg.created_at || new Date())}</div>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="cw-bubble-row cw-bubble-row--ai">
      <div className="cw-avatar">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
          <circle cx="12" cy="12" r="4" fill="#2dd4cc" />
          <circle cx="12" cy="4"  r="2" fill="#0e9f99" opacity=".7" />
          <circle cx="19.2" cy="8"  r="2" fill="#0e9f99" opacity=".7" />
          <circle cx="19.2" cy="16" r="2" fill="#0e9f99" opacity=".7" />
          <circle cx="12" cy="20" r="2" fill="#0e9f99" opacity=".7" />
          <circle cx="4.8" cy="16" r="2" fill="#0e9f99" opacity=".7" />
          <circle cx="4.8" cy="8"  r="2" fill="#0e9f99" opacity=".7" />
        </svg>
      </div>
      <div className="cw-bubble cw-bubble--typing">
        <span /><span /><span />
      </div>
    </div>
  )
}

export default function ChatWidget() {
  const [open,       setOpen]       = useState(false)
  const [minimized,  setMinimized]  = useState(false)
  const [view,       setView]       = useState('sessions') // 'sessions' | 'chat'
  const [sessions,   setSessions]   = useState([])
  const [activeId,   setActiveId]   = useState(null)
  const [messages,   setMessages]   = useState([])
  const [input,      setInput]      = useState('')
  const [sending,    setSending]    = useState(false)
  const [loadingSess, setLoadingSess] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [error,      setError]      = useState('')
  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)

  // ── fetch sessions when panel opens ─────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setLoadingSess(true)
    chatApi.listSessions()
      .then(r => setSessions(r.data.data?.sessions || []))
      .catch(() => setError('Could not load conversations'))
      .finally(() => setLoadingSess(false))
  }, [open])

  // ── auto-scroll ──────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  // ── focus input when entering chat view ─────────────────────────────────────
  useEffect(() => {
    if (view === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [view, activeId])

  const openSession = useCallback(async (id) => {
    setActiveId(id)
    setView('chat')
    setLoadingMsgs(true)
    try {
      const r = await chatApi.getMessages(id)
      setMessages(r.data.data || [])
    } catch {
      setError('Could not load messages')
    } finally {
      setLoadingMsgs(false)
    }
  }, [])

  const newSession = useCallback(async () => {
    try {
      const r = await chatApi.createSession('New Conversation')
      const session = r.data.data
      setSessions(prev => [session, ...prev])
      await openSession(session.id)
    } catch {
      setError('Could not start conversation')
    }
  }, [openSession])

  const removeSession = useCallback(async (e, id) => {
    e.stopPropagation()
    try {
      await chatApi.deleteSession(id)
      setSessions(prev => prev.filter(s => s.id !== id))
      if (activeId === id) { setView('sessions'); setActiveId(null); setMessages([]) }
    } catch {
      setError('Could not delete conversation')
    }
  }, [activeId])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    setError('')

    // Optimistic user bubble
    const optimistic = { id: 'opt', role: 'user', content: text, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])

    try {
      const r = await chatApi.sendMessage(activeId, text)
      const aiMsg = r.data.data.message
      // Replace optimistic with real user msg isn't needed — only AI msg comes back
      // Just append the AI reply
      setMessages(prev => {
        const withoutOpt = prev.filter(m => m.id !== 'opt')
        // Re-insert confirmed user message then AI
        return [...withoutOpt, { ...optimistic, id: 'user-' + Date.now() }, aiMsg]
      })
      // Refresh session list to update recency
      chatApi.listSessions().then(r2 => setSessions(r2.data.data?.sessions || [])).catch(() => {})
      // Notify all data pages to refresh (POs, inventory, shipments, alerts)
      window.dispatchEvent(new CustomEvent('synapse:data-changed'))
    } catch {
      setMessages(prev => prev.filter(m => m.id !== 'opt'))
      setError('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }, [input, sending, activeId])

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        className={`cw-trigger ${open ? 'cw-trigger--open' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
        {!open && <span className="cw-trigger-label">Synapse AI</span>}
      </button>

      {/* Panel */}
      {open && (
        <div className={`cw-panel${minimized ? ' cw-panel--minimized' : ''}`} role="dialog" aria-label="Synapse AI assistant">
          {/* Header */}
          <div className="cw-header" onClick={minimized ? () => setMinimized(false) : undefined}
            style={minimized ? { cursor: 'pointer' } : {}}>
            {!minimized && (view === 'chat' ? (
              <button className="cw-back" onClick={(e) => { e.stopPropagation(); setView('sessions'); setError('') }}>
                <ChevronLeft size={16} />
              </button>
            ) : (
              <div className="cw-header-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                  <circle cx="12" cy="12" r="4" fill="#2dd4cc" />
                  <circle cx="12" cy="4"  r="2" fill="#2dd4cc" opacity=".6" />
                  <circle cx="19.2" cy="8"  r="2" fill="#2dd4cc" opacity=".6" />
                  <circle cx="19.2" cy="16" r="2" fill="#2dd4cc" opacity=".6" />
                  <circle cx="12" cy="20" r="2" fill="#2dd4cc" opacity=".6" />
                  <circle cx="4.8" cy="16" r="2" fill="#2dd4cc" opacity=".6" />
                  <circle cx="4.8" cy="8"  r="2" fill="#2dd4cc" opacity=".6" />
                </svg>
              </div>
            ))}
            <div className="cw-header-text">
              <span className="cw-header-title">Synapse AI</span>
              {!minimized && <span className="cw-header-sub">Your supply chain assistant</span>}
            </div>
            <button className="cw-minimize" onClick={(e) => { e.stopPropagation(); setMinimized(v => !v) }}
              aria-label={minimized ? 'Restore' : 'Minimize'} title={minimized ? 'Restore' : 'Minimize'}>
              {minimized ? <Maximize2 size={13} /> : <Minus size={13} />}
            </button>
            <button className="cw-close" onClick={(e) => { e.stopPropagation(); setOpen(false); setMinimized(false) }} aria-label="Close">
              <X size={16} />
            </button>
          </div>

          {/* ── SESSIONS VIEW ── */}
          {!minimized && view === 'sessions' && (
            <div className="cw-sessions">
              <button className="cw-new-btn" onClick={newSession}>
                <Plus size={14} /> New conversation
              </button>

              {error && <div className="cw-error">{error}</div>}

              {loadingSess ? (
                <div className="cw-center"><Loader size={18} className="cw-spin" /></div>
              ) : sessions.length === 0 ? (
                <div className="cw-empty">
                  <MessageCircle size={32} opacity={.3} />
                  <p>No conversations yet.</p>
                  <p>Start one to query live data.</p>
                </div>
              ) : (
                <ul className="cw-session-list">
                  {sessions.map(s => (
                    <li key={s.id} className="cw-session-item" onClick={() => openSession(s.id)}>
                      <div className="cw-session-title">{s.title || 'Conversation'}</div>
                      <div className="cw-session-time">
                        {new Date(s.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                      <button
                        className="cw-session-del"
                        onClick={(e) => removeSession(e, s.id)}
                        aria-label="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ── CHAT VIEW ── */}
          {!minimized && view === 'chat' && (
            <>
              <div className="cw-messages">
                {loadingMsgs ? (
                  <div className="cw-center"><Loader size={18} className="cw-spin" /></div>
                ) : messages.length === 0 ? (
                  <div className="cw-empty cw-empty--chat">
                    <p>Ask me anything about your supply chain.</p>
                    <div className="cw-suggestions">
                      {[
                        'What needs my attention today?',
                        'Show low stock items',
                        'List pending purchase orders',
                        'Show in-transit shipments',
                      ].map(s => (
                        <button key={s} className="cw-suggestion" onClick={() => { setInput(s) }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((m, i) => <MessageBubble key={m.id || i} msg={m} />)
                )}
                {sending && <TypingIndicator />}
                <div ref={bottomRef} />
              </div>

              {error && <div className="cw-error cw-error--inline">{error}</div>}

              <div className="cw-input-row">
                <textarea
                  ref={inputRef}
                  className="cw-input"
                  placeholder="Ask about inventory, POs, shipments…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKey}
                  rows={1}
                  disabled={sending}
                />
                <button
                  className="cw-send"
                  onClick={send}
                  disabled={!input.trim() || sending}
                  aria-label="Send"
                >
                  {sending ? <Loader size={15} className="cw-spin" /> : <Send size={15} />}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
