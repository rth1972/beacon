'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useTheme } from './ThemeProvider'

interface TopicStat {
  topic: string
  count: number
  last_message: number | null
}

const STORAGE_PINNED  = 'beacon_pinned'
const STORAGE_MUTED   = 'ntfy_muted'
const STORAGE_UNREAD  = 'beacon_unread'

export default function Sidebar() {
  const [topics, setTopics]       = useState<TopicStat[]>([])
  const [newTopic, setNewTopic]   = useState('')
  const [muted, setMuted]         = useState<Set<string>>(new Set())
  const [pinned, setPinned]       = useState<Set<string>>(new Set())
  const [unread, setUnread]       = useState<Record<string, number>>({})
  const [search, setSearch]       = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const params  = useParams<{ topic?: string }>()
  const router  = useRouter()
  const activeTopic = params?.topic
  const { theme, toggle } = useTheme()
  const searchRef = useRef<HTMLInputElement>(null)

  // Load persisted state
  useEffect(() => {
    try {
      setMuted(new Set(JSON.parse(localStorage.getItem(STORAGE_MUTED)  ?? '[]')))
      setPinned(new Set(JSON.parse(localStorage.getItem(STORAGE_PINNED) ?? '[]')))
      setUnread(JSON.parse(localStorage.getItem(STORAGE_UNREAD) ?? '{}'))
    } catch { /* ignore */ }
  }, [])

  // Clear unread when topic is viewed
  useEffect(() => {
    if (!activeTopic) return
    setUnread(prev => {
      const next = { ...prev }
      delete next[activeTopic]
      localStorage.setItem(STORAGE_UNREAD, JSON.stringify(next))
      return next
    })
  }, [activeTopic])

  // SSE for live topic list + REST for stats
  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/topics?list=1')
        if (!res.ok) return
        const data = await res.json()
        setTopics(data.topics ?? [])
      } catch { /* ignore */ }
    }
    loadStats()

    const es = new EventSource('/api/topics')
    es.onmessage = (e) => {
      try {
        const topicNames: string[] = JSON.parse(e.data)
        setTopics(prev => {
          const existing = new Map(prev.map(t => [t.topic, t]))
          return topicNames.map(name => existing.get(name) ?? { topic: name, count: 0, last_message: null })
        })
        // Track new messages for unread
        loadStats()
      } catch { /* ignore */ }
    }
    return () => es.close()
  }, [])

  // Listen for new messages on all topics to track unread
  useEffect(() => {
    if (!activeTopic) return
    // We mark other topics as unread via a broadcast channel if needed
    // For now, unread is cleared when you visit a topic
  }, [activeTopic])

  function toggleMute(topic: string) {
    setMuted(prev => {
      const next = new Set(prev)
      next.has(topic) ? next.delete(topic) : next.add(topic)
      localStorage.setItem(STORAGE_MUTED, JSON.stringify([...next]))
      return next
    })
  }

  function togglePin(topic: string) {
    setPinned(prev => {
      const next = new Set(prev)
      next.has(topic) ? next.delete(topic) : next.add(topic)
      localStorage.setItem(STORAGE_PINNED, JSON.stringify([...next]))
      return next
    })
  }

  function handleNewTopic(e: React.FormEvent) {
    e.preventDefault()
    const t = newTopic.trim().toLowerCase().replace(/\s+/g, '-')
    if (!t) return
    setNewTopic('')
    router.push(`/t/${t}`)
  }

  function formatRelative(ts: number | null): string {
    if (!ts) return ''
    const diff = Date.now() - ts
    if (diff < 60_000)   return 'now'
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h`
    return `${Math.floor(diff / 86400_000)}d`
  }

  // Filter + sort: pinned first, then alphabetical
  const filtered = topics
    .filter(t => !search || t.topic.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const ap = pinned.has(a.topic) ? 0 : 1
      const bp = pinned.has(b.topic) ? 0 : 1
      if (ap !== bp) return ap - bp
      return a.topic.localeCompare(b.topic)
    })

  if (collapsed) {
    return (
      <aside style={{ width: 48, background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: 16, flexShrink: 0 }}>
        <button onClick={() => setCollapsed(false)} title="Expand sidebar" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)' }}>☰</button>
        {filtered.slice(0, 8).map(({ topic }) => (
          <Link key={topic} href={`/t/${topic}`} title={topic} style={{
            width: 28, height: 28, borderRadius: 6,
            background: activeTopic === topic ? 'var(--bg-active)' : 'var(--bg-btn-off)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            position: 'relative',
          }}>
            {topic[0].toUpperCase()}
            {unread[topic] > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, background: '#e74c3c', color: '#fff', borderRadius: '50%', width: 14, height: 14, fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {unread[topic] > 9 ? '9+' : unread[topic]}
              </span>
            )}
          </Link>
        ))}
      </aside>
    )
  }

  return (
    <aside style={{
      width: 232,
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      height: '100vh',
      transition: 'background 0.2s',
    }}>
      {/* Logo row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 12px 12px 16px', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BeaconIcon/>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Beacon</span>
        </Link>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={toggle} title="Toggle theme" style={iconBtnStyle}>{theme === 'dark' ? '☀️' : '🌙'}</button>
          <button onClick={() => setCollapsed(true)} title="Collapse sidebar" style={iconBtnStyle}>◀</button>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 12px 0' }}>
        <input
          ref={searchRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search topics…"
          style={{
            width: '100%',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-input)',
            borderRadius: 6,
            color: 'var(--text)',
            fontSize: 12,
            padding: '6px 10px',
            outline: 'none',
          }}
        />
      </div>

      {/* Quick nav */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
        <NavLink href="/dashboard" label="Dashboard" icon="⬛"/>
        <NavLink href="/settings"  label="Settings"  icon="⚙️"/>
        <NavLink href="/docs"      label="API docs"   icon="📖"/>
      </div>

      {/* Topic list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        <div style={{ padding: '4px 16px 6px', fontSize: 9, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase' as const, letterSpacing: 1.5 }}>
          Topics {filtered.length > 0 && <span style={{ color: 'var(--text-faint)' }}>· {filtered.length}</span>}
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-no-topic)' }}>
            {search ? 'No matching topics.' : 'No topics yet.'}
          </div>
        )}

        {filtered.map(({ topic, count, last_message }) => {
          const isActive = activeTopic === topic
          const isMuted  = muted.has(topic)
          const isPinned = pinned.has(topic)
          const unreadCount = unread[topic] ?? 0

          return (
            <div
              key={topic}
              className="sidebar-topic-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                background: isActive ? 'var(--bg-active)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              <Link
                href={`/t/${topic}`}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column' as const,
                  padding: '6px 8px 6px 12px',
                  textDecoration: 'none',
                  minWidth: 0,
                  opacity: isMuted ? 0.5 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isPinned && <span style={{ fontSize: 9, color: 'var(--accent)' }}>📌</span>}
                  <span style={{
                    fontSize: 13,
                    color: isActive ? 'var(--text)' : 'var(--text-topic)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                    flex: 1,
                  }}>
                    {topic}
                  </span>
                  {unreadCount > 0 && !isActive && (
                    <span style={{ background: '#e74c3c', color: '#fff', borderRadius: 10, fontSize: 9, padding: '1px 5px', fontWeight: 700, flexShrink: 0 }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, paddingLeft: 0, fontSize: 10, color: 'var(--text-faint)', marginTop: 1 }}>
                  {count > 0 && <span>{count} msg{count !== 1 ? 's' : ''}</span>}
                  {last_message && <span>· {formatRelative(last_message)}</span>}
                </div>
              </Link>

              {/* Action buttons (visible on hover via CSS) */}
              <div className="topic-actions" style={{ display: 'flex', paddingRight: 6, gap: 2, opacity: 0, transition: 'opacity 0.15s' }}>
                <button onClick={() => togglePin(topic)} title={isPinned ? 'Unpin' : 'Pin'} style={microBtnStyle}>
                  {isPinned ? '📌' : '·'}
                </button>
                <button onClick={() => toggleMute(topic)} title={isMuted ? 'Unmute' : 'Mute'} style={microBtnStyle}>
                  {isMuted ? '🔔' : '🔕'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* New topic + copy curl */}
      <form onSubmit={handleNewTopic} style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
        <input
          placeholder="New topic…"
          value={newTopic}
          onChange={e => setNewTopic(e.target.value)}
          style={{
            flex: 1,
            background: 'var(--bg-input)',
            border: '1px solid var(--border-input)',
            borderRadius: 5,
            color: 'var(--text)',
            fontSize: 12,
            padding: '6px 8px',
            outline: 'none',
            minWidth: 0,
          }}
        />
        <button type="submit" disabled={!newTopic.trim()} style={{
          background: newTopic.trim() ? 'var(--accent)' : 'var(--bg-btn-off)',
          color: newTopic.trim() ? '#fff' : 'var(--text-faint)',
          border: 'none', borderRadius: 5, padding: '6px 10px',
          fontSize: 14, fontWeight: 700, cursor: newTopic.trim() ? 'pointer' : 'default',
          flexShrink: 0,
        }}>+</button>
      </form>

      <style>{`
        .sidebar-topic-row:hover .topic-actions { opacity: 1 !important; }
      `}</style>
    </aside>
  )
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link href={href} title={label} style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 4, fontSize: 11, color: 'var(--text-faint)', padding: '5px 4px',
      borderRadius: 5, textDecoration: 'none',
      background: 'var(--bg-btn-off)',
    }}>
      <span style={{ fontSize: 12 }}>{icon}</span>
      <span>{label}</span>
    </Link>
  )
}

function BeaconIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="48" r="20" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="55 999" strokeDashoffset="-20" opacity=".4"/>
      <circle cx="24" cy="48" r="13" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="36 999" strokeDashoffset="-13" opacity=".65"/>
      <circle cx="24" cy="48" r="6"  stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="17 999" strokeDashoffset="-6"  opacity=".9"/>
      <rect x="21" y="14" width="6" height="28" rx="2" fill="var(--accent)"/>
      <polygon points="12,42 36,42 31,48 17,48" fill="var(--accent)" opacity=".6"/>
      <circle cx="24" cy="12" r="4" fill="var(--link)"/>
    </svg>
  )
}

const iconBtnStyle: React.CSSProperties = {
  background: 'var(--bg-btn-off)', border: '1px solid var(--border)',
  borderRadius: 5, color: 'var(--text-muted)', cursor: 'pointer',
  fontSize: 12, lineHeight: 1, padding: '4px 6px',
}

const microBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: 12,
  color: 'var(--text-faint)', cursor: 'pointer', padding: '2px 3px',
  borderRadius: 3, lineHeight: 1,
}
