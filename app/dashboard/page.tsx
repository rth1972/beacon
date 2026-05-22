'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppShell from '../components/AppShell'

interface TopicStat {
  topic: string
  count: number
  last_message: number | null
}

export default function Dashboard() {
  const [topics, setTopics] = useState<TopicStat[]>([])
  const [loading, setLoading] = useState(true)
  const [pubTopic, setPubTopic] = useState('')
  const [pubTitle, setPubTitle] = useState('')
  const [pubMsg, setPubMsg] = useState('')
  const [pubPriority, setPubPriority] = useState<string>('default')
  const [pubSending, setPubSending] = useState(false)
  const [pubDone, setPubDone] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/topics?list=1')
        if (res.ok) {
          const data = await res.json()
          setTopics(data.topics ?? [])
        }
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()

    const es = new EventSource('/api/topics')
    es.onmessage = (e) => {
      try {
        const names: string[] = JSON.parse(e.data)
        setTopics(prev => {
          const map = new Map(prev.map(t => [t.topic, t]))
          return names.map(name => map.get(name) ?? { topic: name, count: 0, last_message: null })
        })
      } catch { /* ignore */ }
    }
    return () => es.close()
  }, [])

  async function quickPublish(e: React.FormEvent) {
    e.preventDefault()
    if (!pubTopic.trim() || !pubMsg.trim()) return
    setPubSending(true)
    setPubDone(false)
    try {
      await fetch(`/api/${pubTopic.trim().toLowerCase().replace(/\s+/g, '-')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: pubMsg,
          title: pubTitle || undefined,
          priority: pubPriority,
        }),
      })
      setPubDone(true)
      setTimeout(() => setPubDone(false), 2000)
    } catch { /* ignore */ }
    setPubSending(false)
  }

  const totalMsgs = topics.reduce((s, t) => s + t.count, 0)
  const statusColor = loading ? '#888880' : '#2ecc71'

  return (
    <AppShell>
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Dashboard</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Self-hosted push notifications.
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }} />
            <span style={{ fontSize: 12, color: 'var(--text-label)' }}>{loading ? 'Loading…' : 'Connected'}</span>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Topics', value: topics.length },
            { label: 'Total messages', value: totalMsgs },
            { label: 'Subscribers', value: '—' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 10,
              padding: '16px 20px',
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                {stat.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>
                {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Quick publish */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 10,
          padding: 20, marginBottom: 28,
        }}>
          <h2 style={{ fontSize: 13, marginBottom: 14, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Quick publish
          </h2>
          <form onSubmit={quickPublish} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="Topic name"
                value={pubTopic}
                onChange={e => setPubTopic(e.target.value)}
                style={inputStyle}
              />
              <select value={pubPriority} onChange={e => setPubPriority(e.target.value)} style={{ ...inputStyle, width: 130, cursor: 'pointer' }}>
                <option value="low">🔕 Low</option>
                <option value="default">🔔 Default</option>
                <option value="high">⚠️ High</option>
                <option value="urgent">🚨 Urgent</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="Title (optional)"
                value={pubTitle}
                onChange={e => setPubTitle(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="Message…"
                value={pubMsg}
                onChange={e => setPubMsg(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="submit"
                disabled={pubSending || !pubTopic.trim() || !pubMsg.trim()}
                style={sendBtnStyle(pubSending || !pubTopic.trim() || !pubMsg.trim(), pubDone)}
              >
                {pubSending ? '…' : pubDone ? '✓ Sent' : 'Send'}
              </button>
            </div>
          </form>
        </div>

        {/* Topic table */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 10,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-card)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h2 style={{ fontSize: 13, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 1 }}>
              Topics
            </h2>
            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
              {topics.length} total
            </span>
          </div>

          {topics.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 14 }}>
              {loading ? 'Loading…' : 'No topics yet. Publish a message to create one.'}
            </div>
          ) : (
            <div>
              {topics.map((t, i) => (
                <Link
                  key={t.topic}
                  href={`/t/${t.topic}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 20px',
                    borderBottom: i < topics.length - 1 ? '1px solid var(--border-card)' : 'none',
                    textDecoration: 'none', transition: 'background 0.1s',
                    color: 'inherit',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-active)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: t.count > 0 ? 'var(--accent)' : 'var(--border-tag)',
                    flexShrink: 0,
                  }} />
                  <code style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{t.topic}</code>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {t.count} msg{t.count !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-faint)', width: 60, textAlign: 'right' }}>
                    {t.last_message ? formatRelative(t.last_message) : '—'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h`
  return `${Math.floor(diff / 86400_000)}d`
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
}

function sendBtnStyle(disabled: boolean, done: boolean): React.CSSProperties {
  return {
    background: disabled ? 'var(--bg-btn-off)' : done ? '#2ecc71' : 'var(--accent)',
    color: disabled ? 'var(--text-faint)' : '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '0 20px',
    cursor: disabled ? 'default' : 'pointer',
    fontWeight: 600,
    fontSize: 14,
    whiteSpace: 'nowrap',
  }
}
