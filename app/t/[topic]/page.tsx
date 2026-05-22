'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import AppShell from '../../components/AppShell'

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
  attachment?: { id: string; filename: string; mimetype: string; size: number }
}

const TYPE_META: Record<MessageType, { icon: string; label: string }> = {
  info:    { icon: 'ℹ️',  label: 'info' },
  success: { icon: '✅', label: 'success' },
  warning: { icon: '⚠️', label: 'warning' },
  error:   { icon: '❌', label: 'error' },
}

function playUrgentSound() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  } catch { /* ignore */ }
}

export default function TopicPage() {
  const { topic } = useParams<{ topic: string }>()
  const [messages, setMessages]       = useState<Message[]>([])
  const [status, setStatus]           = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [sendText, setSendText]       = useState('')
  const [sendTitle, setSendTitle]     = useState('')
  const [sendPriority, setSendPriority] = useState<Message['priority']>('default')
  const [sendType, setSendType]       = useState<MessageType | ''>('')
  const [sendUrl, setSendUrl]         = useState('')
  const [sendUrlLabel, setSendUrlLabel] = useState('')
  const [sendTtl, setSendTtl]         = useState('')
  const [sending, setSending]         = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isMuted, setIsMuted]         = useState(false)
  const [filterType, setFilterType]   = useState<MessageType | ''>('')
  const [autoScroll, setAutoScroll]   = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushMsg, setPushMsg] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [detailMsg, setDetailMsg] = useState<Message | null>(null)
  const [tokens, setTokens] = useState<any[]>([])
  const [newTokenLabel, setNewTokenLabel] = useState('')
  const [tokenMsg, setTokenMsg] = useState<string | null>(null)
  const [showToken, setShowToken] = useState<string | null>(null)
  const [settings, setSettings] = useState<any>(null)
  const pushSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
  const lastTsRef = useRef<number>(0)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const muted: string[] = JSON.parse(localStorage.getItem('ntfy_muted') ?? '[]')
      setIsMuted(muted.includes(topic))
    } catch { /* ignore */ }
  }, [topic])

  useEffect(() => {
    const since = lastTsRef.current
    const url = `/api/${topic}${since ? `?since=${since}` : ''}`
    const es = new EventSource(url)

    const openCheck = setInterval(() => {
      if (es.readyState === EventSource.OPEN) {
        setStatus('connected')
        clearInterval(openCheck)
      }
    }, 200)

    es.onmessage = (e) => {
      setStatus('connected')
      try {
        const msg: Message = JSON.parse(e.data)
        lastTsRef.current = Math.max(lastTsRef.current, msg.timestamp)
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [msg, ...prev].slice(0, 200)
        })

        if (!isMuted && msg.priority === 'urgent') playUrgentSound()

        if (!isMuted && Notification.permission === 'granted') {
          const typeIcon = msg.type ? TYPE_META[msg.type].icon + ' ' : ''
          const notif = new Notification(
            msg.title ? `${typeIcon}${msg.title}` : `${typeIcon}[${msg.topic}]`,
            { body: msg.message }
          )
          if (msg.url) notif.onclick = () => window.open(msg.url, '_blank')
        }
      } catch { /* ignore */ }
    }
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) setStatus('disconnected')
    }

    return () => {
      clearInterval(openCheck)
      es.close()
    }
  }, [topic, isMuted])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Check existing push subscription
  useEffect(() => {
    if (!pushSupported) return
    navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription()).then(sub => {
      setPushEnabled(!!sub)
    })
  }, [pushSupported])

  function urlBase64ToUint8Array(base64: string): Uint8Array {
    const padding = '='.repeat((4 - base64.length % 4) % 4)
    const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
    const raw = window.atob(b64)
    const arr = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
    return arr
  }

  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [messages, autoScroll])

  function toggleMute() {
    setIsMuted(prev => {
      const next = !prev
      try {
        const muted: string[] = JSON.parse(localStorage.getItem('ntfy_muted') ?? '[]')
        const updated = next ? [...new Set([...muted, topic])] : muted.filter(t => t !== topic)
        localStorage.setItem('ntfy_muted', JSON.stringify(updated))
      } catch { /* ignore */ }
      return next
    })
  }

  async function togglePush() {
    setPushMsg(null)
    if (!window.isSecureContext) {
      setPushMsg('Push requires HTTPS — use a tunnel like ngrok or localhost')
      return
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushMsg('Push not supported in this browser')
      return
    }
    if (Notification.permission === 'denied') {
      setPushMsg('Notification permission was denied — enable it in Settings')
      return
    }

    if (pushEnabled) {
      try {
        const reg = await getRegistration()
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await sub.unsubscribe()
          await fetch(`/api/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}&topic=${encodeURIComponent(topic)}`, { method: 'DELETE' })
        }
      } catch { /* ignore unsubscribe errors */ }
      setPushEnabled(false)
    } else {
      try {
        const reg = await getRegistration()
        const existing = await reg.pushManager.getSubscription()
        if (existing) {
          setPushEnabled(true)
          return
        }

        if (Notification.permission === 'default') {
          const perm = await Notification.requestPermission()
          if (perm !== 'granted') {
            setPushMsg('Notification permission not granted')
            return
          }
        }

        const res = await fetch('/api/subscribe')
        if (!res.ok) { setPushMsg('Failed to get push key from server'); return }
        const { publicKey } = await res.json()

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        })

        const json = sub.toJSON()
        const save = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            endpoint: json.endpoint,
            p256dh: json.keys!.p256dh,
            auth: json.keys!.auth,
          }),
        })
        if (!save.ok) { setPushMsg('Failed to save subscription on server'); return }
        setPushEnabled(true)
      } catch (err: any) {
        setPushMsg(err?.message || 'Push subscription failed')
      }
    }
  }

  async function getRegistration(): Promise<ServiceWorkerRegistration> {
    let reg = await navigator.serviceWorker.getRegistration()
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js')
    }
    if (reg.active) return reg
    return new Promise(resolve => {
      const target = reg.installing || reg.waiting
      if (!target) { resolve(reg); return }
      target.addEventListener('statechange', function handler() {
        if (target.state === 'activated') {
          target.removeEventListener('statechange', handler)
          resolve(reg)
        }
      })
    })
  }

  async function sendMessage(e?: React.FormEvent | React.KeyboardEvent) {
    e?.preventDefault()
    if (!sendText.trim()) return
    setSending(true)
    try {
      await fetch(`/api/${topic}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:   sendText,
          title:     sendTitle   || undefined,
          priority:  sendPriority,
          type:      sendType    || undefined,
          url:       sendUrl     || undefined,
          url_label: sendUrlLabel || undefined,
          ttl:       sendTtl ? parseInt(sendTtl) : undefined,
        }),
      })
      setSendText('')
      setSendTitle('')
      setSendUrl('')
      setSendUrlLabel('')
      setSendTtl('')
    } finally {
      setSending(false)
    }
  }

  async function clearMessages() {
    setMessages([])
    lastTsRef.current = 0
    await fetch(`/api/${topic}`, { method: 'DELETE' })
  }

  async function clearSelected() {
    const ids = [...selectedIds]
    setMessages(prev => prev.filter(m => !selectedIds.has(m.id)))
    setSelectedIds(new Set())
    const params = new URLSearchParams()
    ids.forEach(id => params.append('id', id))
    await fetch(`/api/${topic}?${params}`, { method: 'DELETE' })
  }

  function toggleSelected(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const searchLower = searchQuery.toLowerCase()
  const filtered = messages.filter(m => {
    if (filterType && m.type !== filterType) return false
    if (searchQuery && !m.message.toLowerCase().includes(searchLower) && !(m.title?.toLowerCase().includes(searchLower))) return false
    return true
  })

  return (
    <AppShell>
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>
            📡 <code style={{ fontFamily: 'monospace' }}>{topic}</code>
          </h1>
          <StatusDot status={status} />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              onClick={togglePush}
              style={{
                background: pushEnabled ? 'var(--accent)' : 'none',
                border: `1px solid ${pushEnabled ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 6,
                color: pushEnabled ? '#fff' : 'var(--text-muted)',
                fontSize: 12,
                cursor: 'pointer',
                padding: '4px 10px',
                fontWeight: pushEnabled ? 600 : 400,
              }}
              title={pushEnabled ? 'Push notifications enabled' : 'Enable push notifications'}
            >
              {pushEnabled ? '📡 Push on' : '📡 Push off'}
            </button>
            {pushMsg && (
              <span style={{ fontSize: 11, color: 'var(--type-error-icon-fg)', maxWidth: 200, lineHeight: 1.3 }}>
                {pushMsg}
              </span>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              title="Topic settings"
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 12,
                padding: '4px 8px',
                lineHeight: 1,
              }}
            >
              ⚙
            </button>
            <button
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute notifications for this topic'}
              style={{
                background: 'var(--bg-btn-off)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 12,
                padding: '4px 8px',
              }}
            >
              {isMuted ? '🔔 Unmute' : '🔕 Mute'}
            </button>
          </div>
        </div>

        {/* Send form */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: 10,
          padding: 20,
          marginBottom: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Title (optional)"
              value={sendTitle}
              onChange={e => setSendTitle(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <select value={sendType} onChange={e => setSendType(e.target.value as MessageType | '')} style={{ ...inputStyle, width: 118, cursor: 'pointer' }}>
              <option value="">— type —</option>
              <option value="info">ℹ️  info</option>
              <option value="success">✅ success</option>
              <option value="warning">⚠️  warning</option>
              <option value="error">❌ error</option>
            </select>
            <select value={sendPriority} onChange={e => setSendPriority(e.target.value as Message['priority'])} style={{ ...inputStyle, width: 118, cursor: 'pointer' }}>
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

          <button
            onClick={() => setShowAdvanced(v => !v)}
            style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 12, cursor: 'pointer', textAlign: 'left', padding: 0 }}
          >
            {showAdvanced ? '▾' : '▸'} Advanced options
          </button>

          {showAdvanced && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  placeholder="Click URL (e.g. https://example.com)"
                  value={sendUrl}
                  onChange={e => setSendUrl(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <input
                  placeholder="Button label"
                  value={sendUrlLabel}
                  onChange={e => setSendUrlLabel(e.target.value)}
                  style={{ ...inputStyle, width: 140 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  placeholder="Expires in (seconds, e.g. 3600)"
                  value={sendTtl}
                  onChange={e => setSendTtl(e.target.value)}
                  type="number"
                  min="0"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
                  {sendTtl ? `expires in ${formatTtl(parseInt(sendTtl))}` : 'no expiry'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Type filters */}
          {(['', 'info', 'success', 'warning', 'error'] as const).map(t => (
            <button
              key={t || 'all'}
              onClick={() => setFilterType(t)}
              style={{
                background: filterType === t ? 'var(--accent)' : 'var(--bg-btn-off)',
                color: filterType === t ? '#fff' : 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                fontSize: 12,
                padding: '3px 12px',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {t === '' ? 'All' : TYPE_META[t].icon + ' ' + t}
            </button>
          ))}

          {/* Copy curl */}
          <CopyCurl topic={topic} />

          {/* Search */}
          <input
            placeholder="Search…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-input)',
              borderRadius: 20,
              color: 'var(--text)',
              fontSize: 12,
              padding: '4px 12px',
              outline: 'none',
              width: 140,
              marginLeft: 'auto',
            }}
          />
        </div>

        {/* Bulk action bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', minHeight: 28 }}>
          <button
            onClick={() => setAutoScroll(v => !v)}
            style={{
              background: 'none',
              border: 'none',
              color: autoScroll ? 'var(--accent)' : 'var(--text-faint)',
              fontSize: 12,
              cursor: 'pointer',
              padding: 0,
              fontWeight: autoScroll ? 600 : 400,
            }}
          >
            {autoScroll ? '▾ Auto-scroll on' : '▸ Auto-scroll off'}
          </button>

          <button
            onClick={clearMessages}
            style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 12, cursor: 'pointer', padding: 0 }}
          >
            ✕ Clear all
          </button>

          {selectedIds.size > 0 && (
            <>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                {selectedIds.size} selected
              </span>
              <button
                onClick={clearSelected}
                style={{
                  background: 'var(--type-error-bg)',
                  border: '1px solid var(--type-error-border)',
                  borderRadius: 6,
                  color: 'var(--type-error-icon-fg)',
                  fontSize: 12,
                  cursor: 'pointer',
                  padding: '2px 10px',
                }}
              >
                Clear selected
            </button>
            </>
          )}

          <span style={{ fontSize: 12, color: 'var(--text-faint)', marginLeft: 'auto' }}>
            {filtered.length} message{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Messages */}
        {filtered.length === 0 ? (
          <p style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '48px 0', fontSize: 14 }}>
            {messages.length === 0
              ? <>Waiting for messages on <strong style={{ color: 'var(--text-muted)' }}>{topic}</strong>…</>
              : 'No messages match the current filter.'}
          </p>
        ) : (
          <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(msg => (
              <MessageCard
                key={msg.id}
                msg={msg}
                selected={selectedIds.has(msg.id)}
                onToggleSelect={() => toggleSelected(msg.id)}
                onDetail={() => setDetailMsg(msg)}
                onDelete={async () => {
                  setMessages(prev => prev.filter(m => m.id !== msg.id))
                  await fetch(`/api/${topic}?id=${msg.id}`, { method: 'DELETE' })
                }}
              />
            ))}
          </div>
        )}
      </div>
      {settingsOpen && (
        <SettingsDrawer
          topic={topic}
          tokens={tokens}
          setTokens={setTokens}
          newTokenLabel={newTokenLabel}
          setNewTokenLabel={setNewTokenLabel}
          tokenMsg={tokenMsg}
          setTokenMsg={setTokenMsg}
          showToken={showToken}
          setShowToken={setShowToken}
          settings={settings}
          setSettings={setSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {detailMsg && (
        <DetailModal msg={detailMsg} onClose={() => setDetailMsg(null)} />
      )}
    </AppShell>
  )
}

/* ─── Components ─── */

function MessageCard({ msg, selected, onToggleSelect, onDelete, onDetail }: { msg: Message; selected: boolean; onToggleSelect: () => void; onDelete: () => Promise<void>; onDetail: () => void }) {
  const [copied, setCopied] = useState(false)
  const t      = msg.type
  const borderClr = t ? `var(--type-${t}-border)` : `var(--badge-${msg.priority}-fg)`
  const border = `3px solid ${borderClr}`
  const iconBg = t ? `var(--type-${t}-icon-bg)` : undefined
  const iconFg = t ? `var(--type-${t}-icon-fg)` : undefined
  const meta   = t ? TYPE_META[t] : undefined
  const badgeBg = `var(--badge-${msg.priority}-bg)`
  const badgeFg = `var(--badge-${msg.priority}-fg)`

  const isExpired  = msg.expires_at ? msg.expires_at < Date.now() : false
  const expiresIn  = msg.expires_at ? msg.expires_at - Date.now() : null

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(msg.message)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  return (
    <div style={{
      background: 'transparent',
      border: selected ? `1px solid var(--accent)` : '1px solid var(--border-card)',
      borderLeft: selected ? `1px solid var(--accent)` : border,
      borderRadius: 8,
      padding: '10px 16px',
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
      opacity: isExpired ? 0.5 : 1,
      transition: 'background 0.2s, border-color 0.2s',
      cursor: 'pointer',
    }}
      onClick={onDetail}
    >
      {/* Checkbox */}
      <div style={{ paddingTop: 2 }} onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
        />
      </div>

      {meta && (
        <div style={{
          flexShrink: 0, width: 30, height: 30, borderRadius: 8,
          background: iconBg, color: iconFg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
        }}>
          {meta.icon}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            {msg.title && <div style={{ fontWeight: 600, marginBottom: 3, color: 'var(--text)' }}>{msg.title}</div>}
            <div style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.5 }}>{msg.message}</div>

            {msg.attachment && (
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                📎 {msg.attachment.filename} ({formatSize(msg.attachment.size)})
              </div>
            )}

            {msg.tags?.length > 0 && (
              <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {msg.tags.map(tag => (
                  <span key={tag} style={{
                    background: 'var(--bg-tag)', border: '1px solid var(--border-tag)',
                    borderRadius: 4, fontSize: 11, padding: '1px 6px', color: 'var(--text-muted)',
                  }}>{tag}</span>
                ))}
              </div>
            )}

            {msg.url && (
              <a
                href={msg.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: 8,
                  background: 'var(--accent)',
                  color: '#fff',
                  borderRadius: 5,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 10px',
                  textDecoration: 'none',
                }}
              >
                🔗 {msg.url_label || 'Open'}
              </a>
            )}

            {expiresIn !== null && expiresIn > 0 && (
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-faint)' }}>
                ⏱ expires in {formatTtl(Math.floor(expiresIn / 1000))}
              </div>
            )}
            <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text-faint)', fontFamily: 'monospace' }}>
              {msg.id.slice(0, 8)}…
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button
              onClick={copyMessage}
              title="Copy message text"
              style={{
                background: 'none', border: 'none',
                color: copied ? '#2ecc71' : 'var(--text-faint)',
                cursor: 'pointer', fontSize: 12, padding: '1px 4px',
              }}
            >
              {copied ? '✓' : 'copy'}
            </button>
            <button
              onClick={onDelete}
              title="Delete message"
              style={{
                background: 'none', border: 'none',
                color: 'var(--text-faint)', cursor: 'pointer', fontSize: 12, padding: '1px 4px',
              }}
            >
              ✕
            </button>
            {meta && (
              <span style={{ background: iconBg, color: iconFg, borderRadius: 4, fontSize: 11, padding: '2px 7px', fontWeight: 600 }}>
                {meta.label}
              </span>
            )}
            <span style={{ background: badgeBg, color: badgeFg, borderRadius: 4, fontSize: 11, padding: '2px 7px', fontWeight: 600 }}>
              {msg.priority}
            </span>
            <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}


function StatusDot({ status }: { status: 'connecting' | 'connected' | 'disconnected' }) {
  const colors = { connecting: '#888880', connected: '#2ecc71', disconnected: '#e74c3c' }
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-label)' }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: colors[status],
        boxShadow: status === 'connected' ? `0 0 6px ${colors.connected}` : 'none',
      }} />
      {status}
    </span>
  )
}

function formatTtl(seconds: number): string {
  if (seconds < 60)   return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border-input)',
  borderRadius: 6,
  color: 'var(--text)',
  fontSize: 14,
  padding: '8px 12px',
  outline: 'none',
  width: '100%',
  transition: 'background 0.2s',
}

function sendBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    background: disabled ? 'var(--bg-btn-off)' : 'var(--accent)',
    color: disabled ? 'var(--text-faint)' : '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '0 20px',
    cursor: disabled ? 'default' : 'pointer',
    fontWeight: 600,
    fontSize: 14,
    transition: 'background 0.15s',
    whiteSpace: 'nowrap',
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB'
  return (bytes / 1048576).toFixed(1) + 'MB'
}

function CopyCurl({ topic }: { topic: string }) {
  const [copied, setCopied] = useState(false)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const cmd = `curl -d "Hello World" ${origin}/api/${topic}`
  async function copy() {
    try { await navigator.clipboard.writeText(cmd); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }
  return (
    <button
      onClick={copy}
      title="Copy publish curl command"
      style={{
        background: 'none',
        border: '1px solid var(--border)',
        borderRadius: 20,
        color: copied ? '#2ecc71' : 'var(--text-muted)',
        cursor: 'pointer',
        fontSize: 11,
        padding: '3px 12px',
        transition: 'color 0.15s',
        fontFamily: 'monospace',
      }}
    >
      {copied ? '✓ Copied!' : 'curl ↗'}
    </button>
  )
}

function DetailModal({ msg, onClose }: { msg: Message; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: 12,
          padding: 24,
          maxWidth: 520,
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, color: 'var(--text)', margin: 0 }}>Message Detail</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>
        <pre style={{
          background: 'var(--bg-code)',
          border: '1px solid var(--border-code)',
          borderRadius: 8,
          padding: 16,
          fontSize: 12,
          lineHeight: 1.6,
          overflow: 'auto',
          color: 'var(--text-code)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          margin: 0,
        }}>{JSON.stringify(msg, null, 2)}</pre>
      </div>
    </div>
  )
}

function SettingsDrawer({ topic, tokens, setTokens, newTokenLabel, setNewTokenLabel, tokenMsg, setTokenMsg, showToken, setShowToken, settings, setSettings, onClose }: {
  topic: string; tokens: any[]; setTokens: (t: any[]) => void;
  newTokenLabel: string; setNewTokenLabel: (s: string) => void;
  tokenMsg: string | null; setTokenMsg: (s: string | null) => void;
  showToken: string | null; setShowToken: (s: string | null) => void;
  settings: any; setSettings: (s: any) => void; onClose: () => void;
}) {
  const [retention, setRetention] = useState(settings?.retention ?? 0)
  const [relayUrl, setRelayUrl] = useState(settings?.relay_url ?? '')
  const [relayToken, setRelayToken] = useState(settings?.relay_token ?? '')

  useEffect(() => {
    fetch(`/api/tokens?topic=${encodeURIComponent(topic)}`).then(r => r.json()).then(d => setTokens(d.tokens ?? [])).catch(() => {})
    fetch(`/api/settings/${encodeURIComponent(topic)}`).then(r => r.json()).then(d => { if (d.settings) { setSettings(d.settings); setRetention(d.settings.retention ?? 0); setRelayUrl(d.settings.relay_url ?? ''); setRelayToken(d.settings.relay_token ?? '') } }).catch(() => {})
  }, [])

  async function createToken() {
    setTokenMsg(null)
    try {
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, label: newTokenLabel, permissions: 'write' }),
      })
      const data = await res.json()
      if (!res.ok) { setTokenMsg(data.error); return }
      setShowToken(data.token)
      setNewTokenLabel('')
      const r = await fetch(`/api/tokens?topic=${encodeURIComponent(topic)}`)
      const d = await r.json()
      setTokens(d.tokens ?? [])
    } catch { setTokenMsg('Failed to create token') }
  }

  async function revokeToken(id: string) {
    await fetch(`/api/tokens?id=${id}`, { method: 'DELETE' })
    setTokens(tokens.filter(t => t.id !== id))
  }

  async function saveSettings() {
    await fetch(`/api/settings/${encodeURIComponent(topic)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ retention: parseInt(retention as any) || 0, relay_url: relayUrl || null, relay_token: relayToken || null }),
    })
  }

  const inp: React.CSSProperties = {
    background: 'var(--bg-input)', border: '1px solid var(--border-input)',
    borderRadius: 6, color: 'var(--text)', fontSize: 13,
    padding: '6px 10px', outline: 'none', width: '100%',
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 320, zIndex: 150,
      background: 'var(--bg-sidebar)', borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 15, color: 'var(--text)', margin: 0 }}>⚙ Topic Settings</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Tokens */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Access Tokens</div>
          {tokens.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 8 }}>No tokens yet</div>
          ) : (
            tokens.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1, fontFamily: 'monospace' }}>
                  {showToken && t.token === showToken?.slice(0, 8) + '…' ? showToken : t.token}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{t.label}</span>
                <button onClick={() => revokeToken(t.id)} style={{ background: 'none', border: 'none', color: 'var(--type-error-icon-fg)', cursor: 'pointer', fontSize: 12, padding: '2px 4px' }}>✕</button>
              </div>
            ))
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <input placeholder="Label" value={newTokenLabel} onChange={e => setNewTokenLabel(e.target.value)} style={inp} />
            <button onClick={createToken} disabled={!newTokenLabel.trim()} style={{
              background: newTokenLabel.trim() ? 'var(--accent)' : 'var(--bg-btn-off)',
              color: newTokenLabel.trim() ? '#fff' : 'var(--text-faint)',
              border: 'none', borderRadius: 6, padding: '6px 12px', cursor: newTokenLabel.trim() ? 'pointer' : 'default',
              fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
            }}>Generate</button>
          </div>
          {tokenMsg && <div style={{ marginTop: 6, fontSize: 11, color: 'var(--type-error-icon-fg)' }}>{tokenMsg}</div>}
        </div>

        {/* Retention */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Retention</div>
          <select value={retention} onChange={e => setRetention(parseInt(e.target.value))} style={inp}>
            <option value={0}>Forever (default)</option>
            <option value={3600}>1 hour</option>
            <option value={86400}>1 day</option>
            <option value={604800}>7 days</option>
            <option value={2592000}>30 days</option>
          </select>
          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-faint)' }}>Messages older than this are auto-deleted.</div>
        </div>

        {/* ntfy.sh relay */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>ntfy.sh Relay</div>
          <input placeholder="Relay URL (e.g. https://ntfy.sh/{topic})" value={relayUrl} onChange={e => setRelayUrl(e.target.value)} style={inp} />
          <input placeholder="Relay token (optional)" value={relayToken} onChange={e => setRelayToken(e.target.value)} style={{ ...inp, marginTop: 6 }} />
          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-faint)' }}>Publishes are relayed to this URL. Use {'{topic}'} as placeholder.</div>
        </div>

        <button onClick={saveSettings} style={{
          background: 'var(--accent)', color: '#fff', border: 'none',
          borderRadius: 6, padding: '8px 16px', cursor: 'pointer',
          fontWeight: 600, fontSize: 13,
        }}>Save Settings</button>
      </div>
    </div>
  )
}
