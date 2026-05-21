'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTheme } from './ThemeProvider'

interface TopicStat {
  topic: string
  count: number
  last_message: number | null
}

export default function Sidebar() {
  const [topics, setTopics] = useState<TopicStat[]>([])
  const [newTopic, setNewTopic] = useState('')
  const [muted, setMuted] = useState<Set<string>>(new Set())
  const params = useParams<{ topic?: string }>()
  const activeTopic = params?.topic
  const { theme, toggle } = useTheme()

  // Load muted topics from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ntfy_muted') ?? '[]')
      setMuted(new Set(saved))
    } catch { /* ignore */ }
  }, [])

  // Live topic list via SSE + stats via REST
  useEffect(() => {
    // Initial stats load
    async function loadStats() {
      try {
        const res = await fetch('/api/topics?list=1')
        if (!res.ok) return
        const data = await res.json()
        setTopics(data.topics ?? [])
      } catch { /* ignore */ }
    }
    loadStats()

    // SSE for live updates to topic list
    const es = new EventSource('/api/topics')
    es.onmessage = (e) => {
      try {
        const topicNames: string[] = JSON.parse(e.data)
        // Merge with existing stats, add new topics with count 0
        setTopics(prev => {
          const existing = new Map(prev.map(t => [t.topic, t]))
          return topicNames.map(name => existing.get(name) ?? { topic: name, count: 0, last_message: null })
        })
        // Refresh stats after topic list changes
        loadStats()
      } catch { /* ignore */ }
    }
    return () => es.close()
  }, [])

  function toggleMute(topic: string) {
    setMuted(prev => {
      const next = new Set(prev)
      next.has(topic) ? next.delete(topic) : next.add(topic)
      localStorage.setItem('ntfy_muted', JSON.stringify([...next]))
      return next
    })
  }

  function handleNewTopic(e: React.FormEvent) {
    e.preventDefault()
    const t = newTopic.trim().toLowerCase().replace(/\s+/g, '-')
    if (!t) return
    setNewTopic('')
    window.location.href = `/t/${t}`
  }

  function formatRelative(ts: number | null): string {
    if (!ts) return ''
    const diff = Date.now() - ts
    if (diff < 60_000)  return 'just now'
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
    return `${Math.floor(diff / 86400_000)}d ago`
  }

  return (
    <aside style={{
      width: 230,
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      height: '100vh',
      transition: 'background 0.2s, border-color 0.2s',
    }}>
      {/* Logo + theme toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 12px 14px 16px',
        borderBottom: '1px solid var(--border)',
      }}>
        <Link href="/dashboard" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Beacon</span>
        </Link>
        <button
          onClick={toggle}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          style={{
            background: 'var(--bg-btn-off)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 14,
            lineHeight: 1,
            padding: '5px 7px',
            transition: 'background 0.15s',
            flexShrink: 0,
          }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Topic list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
        <div style={{
          padding: '4px 16px 8px',
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--text-faint)',
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}>
          Topics
        </div>

        {topics.length === 0 ? (
          <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-no-topic)' }}>
            No active topics yet
          </div>
        ) : (
          topics.map(({ topic, count, last_message }) => {
            const isActive  = activeTopic === topic
            const isMuted   = muted.has(topic)
            return (
              <div
                key={topic}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: isActive ? 'var(--bg-active)' : 'transparent',
                  borderLeft: isActive ? '2px solid var(--accent-sidebar-border)' : '2px solid transparent',
                  transition: 'background 0.1s',
                }}
              >
                <Link
                  href={`/t/${topic}`}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '7px 8px 7px 14px',
                    textDecoration: 'none',
                    minWidth: 0,
                    opacity: isMuted ? 0.45 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: isActive ? '#2ecc71' : 'var(--border-tag)',
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: 13,
                      color: isActive ? 'var(--text)' : 'var(--text-topic)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {topic}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: 6,
                    marginTop: 2,
                    paddingLeft: 13,
                    fontSize: 10,
                    color: 'var(--text-faint)',
                  }}>
                    {count > 0 && <span>{count} msg{count !== 1 ? 's' : ''}</span>}
                    {last_message && <span>· {formatRelative(last_message)}</span>}
                  </div>
                </Link>

                {/* Mute button */}
                <button
                  onClick={() => toggleMute(topic)}
                  title={isMuted ? 'Unmute topic' : 'Mute topic'}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isMuted ? 'var(--text-faint)' : 'var(--text-faint)',
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: '4px 10px 4px 4px',
                    opacity: isActive || isMuted ? 1 : 0,
                    transition: 'opacity 0.1s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => {
                    if (!isActive && !isMuted) e.currentTarget.style.opacity = '0'
                  }}
                >
                  {isMuted ? '🔔' : '🔕'}
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* New topic input */}
      <form
        onSubmit={handleNewTopic}
        style={{
          padding: '12px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: 6,
        }}
      >
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
            transition: 'background 0.2s',
          }}
        />
        <button
          type="submit"
          disabled={!newTopic.trim()}
          style={{
            background: newTopic.trim() ? 'var(--accent)' : 'var(--bg-btn-off)',
            color: newTopic.trim() ? '#fff' : 'var(--text-faint)',
            border: 'none',
            borderRadius: 5,
            padding: '6px 10px',
            fontSize: 14,
            fontWeight: 700,
            cursor: newTopic.trim() ? 'pointer' : 'default',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
        >
          +
        </button>
      </form>
    </aside>
  )
}
