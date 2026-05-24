'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type MessageType = 'info' | 'success' | 'warning' | 'error'

interface Message {
  id: string
  topic: string
  title?: string
  message: string
  type?: MessageType
  priority: 'low' | 'default' | 'high' | 'urgent'
  tags: string[]
  url?: string
  url_label?: string
  expires_at?: number
  timestamp: number
}

interface Template {
  id: string
  label: string
  topic: string
  title?: string
  message: string
  type?: string
  priority: string
  tags: string[]
  url?: string
}

const TYPE_META: Record<MessageType, { icon: string; label: string }> = {
  info:    { icon: 'ℹ️',  label: 'info' },
  success: { icon: '✅', label: 'success' },
  warning: { icon: '⚠️', label: 'warning' },
  error:   { icon: '❌', label: 'error' },
}

function playBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = 880; osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(); osc.stop(ctx.currentTime + 0.4)
  } catch { /* ignore — user hasn't interacted yet */ }
}

function formatTtl(s: number): string {
  if (s < 60)    return `${s}s`
  if (s < 3600)  return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-input)', border: '1px solid var(--border-input)',
  borderRadius: 6, color: 'var(--text)', fontSize: 14,
  padding: '8px 12px', outline: 'none', width: '100%',
  transition: 'background 0.2s',
}

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer', width: 'auto' }

export default function TopicPage() {
  const { topic }      = useParams<{ topic: string }>()
  const searchParams   = useSearchParams()
  const tmplId         = searchParams.get('tmpl')

  const [messages, setMessages]         = useState<Message[]>([])
  const [status, setStatus]             = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [isMuted, setIsMuted]           = useState(false)
  const [filterType, setFilterType]     = useState<MessageType | ''>('')
  const [searchQ, setSearchQ]           = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [copied, setCopied]             = useState(false)

  // Send form
  const [sendText, setSendText]         = useState('')
  const [sendTitle, setSendTitle]       = useState('')
  const [sendPriority, setSendPriority] = useState<Message['priority']>('default')
  const [sendType, setSendType]         = useState<MessageType | ''>('')
  const [sendUrl, setSendUrl]           = useState('')
  const [sendUrlLabel, setSendUrlLabel] = useState('')
  const [sendTtl, setSendTtl]           = useState('')
  const [sendDelay, setSendDelay]       = useState('')
  const [sending, setSending]           = useState(false)

  // Templates
  const [templates, setTemplates]       = useState<Template[]>([])
  const [showTemplates, setShowTemplates] = useState(false)

  const lastTsRef = useRef<number>(0)

  // Load persisted state
  useEffect(() => {
    try {
      const muted: string[] = JSON.parse(localStorage.getItem('ntfy_muted') ?? '[]')
      setIsMuted(muted.includes(topic))
      const tmpls: Template[] = JSON.parse(localStorage.getItem('beacon_templates') ?? '[]')
      setTemplates(tmpls)
    } catch { /* ignore */ }
  }, [topic])

  // Apply template from URL param
  useEffect(() => {
    if (!tmplId || templates.length === 0) return
    const t = templates.find(t => t.id === tmplId)
    if (!t) return
    setSendTitle(t.title ?? '')
    setSendText(t.message)
    setSendType((t.type as MessageType | '') ?? '')
    setSendPriority((t.priority as Message['priority']) ?? 'default')
    setSendUrl(t.url ?? '')
  }, [tmplId, templates])

  // SSE subscription
  useEffect(() => {
    const url = `/api/${topic}${lastTsRef.current ? `?since=${lastTsRef.current}` : ''}`
    const es  = new EventSource(url)

    const openCheck = setInterval(() => {
      if (es.readyState === EventSource.OPEN) { setStatus('connected'); clearInterval(openCheck) }
    }, 200)

    es.onmessage = (e) => {
      setStatus('connected')
      try {
        const msg: Message = JSON.parse(e.data)
        lastTsRef.current = Math.max(lastTsRef.current, msg.timestamp)
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [msg, ...prev].slice(0, 200))
        if (!isMuted) {
          if (msg.priority === 'urgent') playBeep()
          if (Notification.permission === 'granted') {
            const icon = msg.type ? TYPE_META[msg.type].icon + ' ' : ''
            const n = new Notification(msg.title ? `${icon}${msg.title}` : `${icon}[${topic}]`, { body: msg.message })
            if (msg.url) n.onclick = () => window.open(msg.url, '_blank')
          }
        }
      } catch { /* ignore SSE comments */ }
    }

    es.onerror = () => { if (es.readyState === EventSource.CLOSED) setStatus('disconnected') }

    return () => { clearInterval(openCheck); es.close() }
  }, [topic, isMuted])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission()
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev
      try {
        const arr: string[] = JSON.parse(localStorage.getItem('ntfy_muted') ?? '[]')
        localStorage.setItem('ntfy_muted', JSON.stringify(next ? [...new Set([...arr, topic])] : arr.filter(t => t !== topic)))
      } catch { /* ignore */ }
      return next
    })
  }, [topic])

  async function sendMessage(e?: React.FormEvent | React.KeyboardEvent) {
    e?.preventDefault()
    if (!sendText.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/${topic}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:   sendText,
          title:     sendTitle   || undefined,
          priority:  sendPriority,
          type:      sendType    || undefined,
          url:       sendUrl     || undefined,
          url_label: sendUrlLabel || undefined,
          ttl:       sendTtl   ? parseInt(sendTtl)   : undefined,
          delay:     sendDelay || undefined,
        }),
      })
      if (res.ok) {
        setSendText(''); setSendTitle(''); setSendUrl('')
        setSendUrlLabel(''); setSendTtl(''); setSendDelay('')
      }
    } finally { setSending(false) }
  }

  function copyCurl() {
    const obj: Record<string, any> = { message: sendText || 'Hello from Beacon' }
    if (sendTitle)     obj.title    = sendTitle
    if (sendPriority !== 'default') obj.priority = sendPriority
    if (sendType)      obj.type     = sendType
    if (sendUrl)       obj.url      = sendUrl
    if (sendUrlLabel)  obj.url_label = sendUrlLabel
    if (sendTtl)       obj.ttl      = parseInt(sendTtl)
    if (sendDelay)     obj.delay    = sendDelay
    const cmd = `curl -X POST ${window.location.origin}/api/${topic} \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(obj, null, 2)}'`
    navigator.clipboard.writeText(cmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function applyTemplate(t: Template) {
    setSendTitle(t.title ?? '')
    setSendText(t.message)
    setSendType((t.type as MessageType | '') ?? '')
    setSendPriority((t.priority as Message['priority']) ?? 'default')
    setSendUrl(t.url ?? '')
    setShowTemplates(false)
  }

  // Filtered messages
  const displayed = messages.filter(m => {
    if (filterType && m.type !== filterType) return false
    if (searchQ && !m.message.toLowerCase().includes(searchQ.toLowerCase()) &&
        !m.title?.toLowerCase().includes(searchQ.toLowerCase())) return false
    return true
  })

  const myTemplates = templates.filter(t => !t.topic || t.topic === topic)

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '32px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
          📡 <code style={{ fontFamily: 'monospace' }}>{topic}</code>
        </h1>
        <StatusDot status={status} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'} style={ghostBtn}>
            {isMuted ? '🔔 Unmute' : '🔕 Mute'}
          </button>
          <button onClick={copyCurl} title="Copy curl command" style={ghostBtn}>
            {copied ? '✓ Copied' : '⎘ curl'}
          </button>
          {myTemplates.length > 0 && (
            <button onClick={() => setShowTemplates(v => !v)} style={ghostBtn}>
              📋 Templates
            </button>
          )}
          <Link href="/settings" style={{ ...ghostBtn, display: 'inline-block' }}>⚙️</Link>
        </div>
      </div>

      {/* Templates dropdown */}
      {showTemplates && myTemplates.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 10, marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ padding: '8px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid var(--border)' }}>
            Saved templates
          </div>
          {myTemplates.map(t => (
            <button key={t.id} onClick={() => applyTemplate(t)} style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px',
              background: 'none', border: 'none', borderBottom: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--text)',
            }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{t.label}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{t.message.slice(0, 60)}{t.message.length > 60 ? '…' : ''}</span>
            </button>
          ))}
        </div>
      )}

      {/* Send form */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 10, padding: 20, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="Title (optional)" value={sendTitle} onChange={e => setSendTitle(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 120 }} />
          <select value={sendType} onChange={e => setSendType(e.target.value as MessageType | '')} style={selectStyle}>
            <option value="">— type —</option>
            <option value="info">ℹ️ info</option>
            <option value="success">✅ success</option>
            <option value="warning">⚠️ warning</option>
            <option value="error">❌ error</option>
          </select>
          <select value={sendPriority} onChange={e => setSendPriority(e.target.value as Message['priority'])} style={selectStyle}>
            <option value="low">🔕 low</option>
            <option value="default">🔔 default</option>
            <option value="high">⚠️ high</option>
            <option value="urgent">🚨 urgent</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Message…"
            value={sendText}
            onChange={e => setSendText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) sendMessage(e) }}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={() => sendMessage()} disabled={sending || !sendText.trim()} style={sendBtnStyle(sending || !sendText.trim())}>
            {sending ? '…' : 'Send'}
          </button>
        </div>

        <button onClick={() => setShowAdvanced(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 12, cursor: 'pointer', textAlign: 'left', padding: 0 }}>
          {showAdvanced ? '▾' : '▸'} Advanced
        </button>

        {showAdvanced && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Click URL (https://…)" value={sendUrl} onChange={e => setSendUrl(e.target.value)} style={{ ...inputStyle, flex: 2 }} />
              <input placeholder="Button label" value={sendUrlLabel} onChange={e => setSendUrlLabel(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <input placeholder="Expire in (e.g. 3600 seconds)" value={sendTtl} onChange={e => setSendTtl(e.target.value)} type="number" min="0" style={inputStyle} />
                {sendTtl && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>expires in {formatTtl(parseInt(sendTtl))}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <input placeholder="Schedule delay (e.g. 5m, 2h, 1d)" value={sendDelay} onChange={e => setSendDelay(e.target.value)} style={inputStyle} />
                {sendDelay && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>sends in {sendDelay}</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter + search bar */}
      {messages.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            placeholder="Search messages…"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            style={{ ...inputStyle, flex: 1, minWidth: 140, fontSize: 12, padding: '5px 10px' }}
          />
          {(['', 'info', 'success', 'warning', 'error'] as const).map(t => (
            <button key={t || 'all'} onClick={() => setFilterType(t)} style={{
              background: filterType === t ? 'var(--accent)' : 'var(--bg-btn-off)',
              color: filterType === t ? '#fff' : 'var(--text-muted)',
              border: '1px solid var(--border)', borderRadius: 20,
              fontSize: 11, padding: '3px 10px', cursor: 'pointer',
            }}>
              {t === '' ? 'All' : `${TYPE_META[t].icon} ${t}`}
            </button>
          ))}
          <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 'auto' }}>
            {displayed.length} / {messages.length}
          </span>
        </div>
      )}

      {/* Message list */}
      {displayed.length === 0 ? (
        <p style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '48px 0', fontSize: 14 }}>
          {messages.length === 0
            ? <>Waiting for messages on <strong style={{ color: 'var(--text-muted)' }}>{topic}</strong>…</>
            : 'No messages match the current filter.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayed.map(msg => <MessageCard key={msg.id} msg={msg} topic={topic} />)}
        </div>
      )}
    </div>
  )
}

function MessageCard({ msg, topic }: { msg: Message; topic: string }) {
  const [deleting, setDeleting] = useState(false)
  const t       = msg.type
  const cardBg  = t ? `var(--type-${t}-bg)` : `var(--priority-${msg.priority}-bg)`
  const border  = t ? `3px solid var(--type-${t}-border)` : '3px solid transparent'
  const iconBg  = t ? `var(--type-${t}-icon-bg)` : undefined
  const iconFg  = t ? `var(--type-${t}-icon-fg)` : undefined
  const meta    = t ? TYPE_META[t] : undefined
  const badgeBg = `var(--badge-${msg.priority}-bg)`
  const badgeFg = `var(--badge-${msg.priority}-fg)`
  const isExpired   = msg.expires_at ? msg.expires_at < Date.now() : false
  const expiresInMs = msg.expires_at ? msg.expires_at - Date.now() : null

  async function deleteMsg() {
    setDeleting(true)
    await fetch(`/api/${topic}?id=${msg.id}`, { method: 'DELETE' })
    // optimistic — page will refresh on next SSE event
  }

  return (
    <div style={{ background: cardBg, border: '1px solid var(--border-card)', borderLeft: border, borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', opacity: isExpired ? 0.5 : 1, transition: 'background 0.2s' }}>
      {meta && (
        <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, background: iconBg, color: iconFg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
          {meta.icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            {msg.title && <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text)', fontSize: 14 }}>{msg.title}</div>}
            <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>{msg.message}</div>
            {msg.tags?.length > 0 && (
              <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {msg.tags.map(tag => (
                  <span key={tag} style={{ background: 'var(--bg-tag)', border: '1px solid var(--border-tag)', borderRadius: 4, fontSize: 10, padding: '1px 6px', color: 'var(--text-muted)' }}>{tag}</span>
                ))}
              </div>
            )}
            {msg.url && (
              <a href={msg.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, background: 'var(--accent)', color: '#fff', borderRadius: 5, fontSize: 11, fontWeight: 600, padding: '4px 10px', textDecoration: 'none' }}>
                🔗 {msg.url_label || 'Open'}
              </a>
            )}
            {expiresInMs !== null && expiresInMs > 0 && (
              <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text-faint)' }}>⏱ expires in {formatTtl(Math.floor(expiresInMs / 1000))}</div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            {meta && <span style={{ background: iconBg, color: iconFg, borderRadius: 4, fontSize: 10, padding: '2px 6px', fontWeight: 600 }}>{meta.label}</span>}
            <span style={{ background: badgeBg, color: badgeFg, borderRadius: 4, fontSize: 10, padding: '2px 6px', fontWeight: 600 }}>{msg.priority}</span>
            <span style={{ color: 'var(--text-faint)', fontSize: 10 }}>{new Date(msg.timestamp).toLocaleTimeString()}</span>
            <button onClick={deleteMsg} disabled={deleting} title="Delete message" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-faint)', padding: '1px 3px' }}>
              {deleting ? '…' : '✕'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: 'connecting' | 'connected' | 'disconnected' }) {
  const colors = { connecting: '#f5a623', connected: '#2ecc71', disconnected: '#e74c3c' }
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-label)' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[status], boxShadow: status === 'connected' ? `0 0 6px ${colors.connected}` : 'none' }} />
      {status}
    </span>
  )
}

const ghostBtn: React.CSSProperties = {
  background: 'var(--bg-btn-off)', color: 'var(--text-muted)',
  border: '1px solid var(--border)', borderRadius: 6,
  fontSize: 12, padding: '5px 10px', cursor: 'pointer',
  textDecoration: 'none',
}

function sendBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    background: disabled ? 'var(--bg-btn-off)' : 'var(--accent)',
    color: disabled ? 'var(--text-faint)' : '#fff',
    border: 'none', borderRadius: 6, padding: '0 20px',
    cursor: disabled ? 'default' : 'pointer',
    fontWeight: 600, fontSize: 14, transition: 'background 0.15s',
    whiteSpace: 'nowrap',
  }
}
