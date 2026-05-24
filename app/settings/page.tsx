'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Webhook {
  id: string
  topic: string
  url: string
  label?: string
  enabled: boolean
  created_at: number
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

const S: Record<string, React.CSSProperties> = {
  page:       { maxWidth: 760, margin: '0 auto', padding: '32px 24px' },
  h1:         { fontSize: 22, fontWeight: 600, color: 'var(--text)', marginBottom: 4 },
  sub:        { fontSize: 14, color: 'var(--text-muted)', marginBottom: 32 },
  section:    { marginBottom: 40 },
  sectionHdr: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle:{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: 1 },
  card:       { background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 10, overflow: 'hidden' },
  row:        { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)' },
  label:      { fontSize: 13, fontWeight: 500, color: 'var(--text)', flex: 1, minWidth: 0 },
  sub2:       { fontSize: 12, color: 'var(--text-muted)', marginTop: 2 },
  input:      { background: 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: 6, color: 'var(--text)', fontSize: 13, padding: '7px 10px', outline: 'none', width: '100%' },
  btn:        { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const },
  btnDanger:  { background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer' },
  btnGhost:   { background: 'var(--bg-btn-off)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer' },
  tag:        { background: 'var(--bg-tag)', border: '1px solid var(--border-tag)', borderRadius: 4, fontSize: 11, padding: '2px 7px', color: 'var(--text-muted)' },
  empty:      { padding: '24px 16px', textAlign: 'center' as const, fontSize: 13, color: 'var(--text-faint)' },
}

export default function SettingsPage() {
  const [tab, setTab] = useState<'webhooks' | 'templates' | 'general'>('webhooks')
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [templates, setTemplates] = useState<Template[]>([])

  // Webhook form
  const [whTopic, setWhTopic]   = useState('')
  const [whUrl, setWhUrl]       = useState('')
  const [whLabel, setWhLabel]   = useState('')
  const [whSecret, setWhSecret] = useState('')
  const [whAdding, setWhAdding] = useState(false)

  // Template form
  const [tmplLabel, setTmplLabel]     = useState('')
  const [tmplTopic, setTmplTopic]     = useState('')
  const [tmplTitle, setTmplTitle]     = useState('')
  const [tmplMessage, setTmplMessage] = useState('')
  const [tmplType, setTmplType]       = useState('')
  const [tmplPriority, setTmplPriority] = useState('default')
  const [tmplUrl, setTmplUrl]         = useState('')
  const [tmplTags, setTmplTags]       = useState('')
  const [tmplAdding, setTmplAdding]   = useState(false)

  // General
  const [rateLimitInfo, setRateLimitInfo] = useState<any>(null)

  useEffect(() => { loadWebhooks() }, [])

  useEffect(() => {
    // Load templates from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem('beacon_templates') ?? '[]')
      setTemplates(saved)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    // Load health/rate info
    fetch('/api/health').then(r => r.json()).then(setRateLimitInfo).catch(() => {})
  }, [])

  async function loadWebhooks() {
    try {
      const res = await fetch('/api/webhooks')
      if (res.ok) setWebhooks((await res.json()).webhooks ?? [])
    } catch { /* ignore */ }
  }

  async function addWebhook(e: React.FormEvent) {
    e.preventDefault()
    if (!whTopic.trim() || !whUrl.trim()) return
    setWhAdding(true)
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: whTopic, url: whUrl, label: whLabel || undefined, secret: whSecret || undefined }),
      })
      if (res.ok) {
        setWhTopic(''); setWhUrl(''); setWhLabel(''); setWhSecret('')
        await loadWebhooks()
      }
    } finally { setWhAdding(false) }
  }

  async function deleteWebhook(id: string) {
    await fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
    await loadWebhooks()
  }

  async function toggleWebhook(id: string, enabled: boolean) {
    await fetch(`/api/webhooks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !enabled }),
    })
    await loadWebhooks()
  }

  function saveTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (!tmplLabel.trim() || !tmplMessage.trim()) return
    setTmplAdding(true)
    const tmpl: Template = {
      id: crypto.randomUUID(),
      label: tmplLabel,
      topic: tmplTopic,
      title: tmplTitle || undefined,
      message: tmplMessage,
      type: tmplType || undefined,
      priority: tmplPriority,
      tags: tmplTags ? tmplTags.split(',').map(t => t.trim()).filter(Boolean) : [],
      url: tmplUrl || undefined,
    }
    const next = [...templates, tmpl]
    setTemplates(next)
    localStorage.setItem('beacon_templates', JSON.stringify(next))
    setTmplLabel(''); setTmplTopic(''); setTmplTitle(''); setTmplMessage('')
    setTmplType(''); setTmplPriority('default'); setTmplUrl(''); setTmplTags('')
    setTmplAdding(false)
  }

  function deleteTemplate(id: string) {
    const next = templates.filter(t => t.id !== id)
    setTemplates(next)
    localStorage.setItem('beacon_templates', JSON.stringify(next))
  }

  const tabStyle = (t: string): React.CSSProperties => ({
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: tab === t ? 600 : 400,
    color: tab === t ? 'var(--text)' : 'var(--text-muted)',
    background: tab === t ? 'var(--bg-active)' : 'transparent',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  })

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Link href="/dashboard" style={{ fontSize: 12, color: 'var(--text-faint)' }}>← dashboard</Link>
      </div>
      <h1 style={S.h1}>Settings</h1>
      <p style={S.sub}>Manage webhooks, message templates, and general configuration.</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'var(--bg-card)', borderRadius: 8, padding: 4, width: 'fit-content', border: '1px solid var(--border)' }}>
        <button style={tabStyle('webhooks')}  onClick={() => setTab('webhooks')}>🔗 Webhooks</button>
        <button style={tabStyle('templates')} onClick={() => setTab('templates')}>📋 Templates</button>
        <button style={tabStyle('general')}   onClick={() => setTab('general')}>⚙️ General</button>
      </div>

      {/* ── WEBHOOKS ── */}
      {tab === 'webhooks' && (
        <>
          <section style={S.section}>
            <div style={S.sectionHdr}>
              <span style={S.sectionTitle}>Active webhooks</span>
            </div>
            <div style={S.card}>
              {webhooks.length === 0
                ? <div style={S.empty}>No webhooks yet. Add one below.</div>
                : webhooks.map((wh, i) => (
                  <div key={wh.id} style={{ ...S.row, borderBottom: i < webhooks.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={S.label}>{wh.label || wh.url}</span>
                        <span style={{ ...S.tag, color: wh.enabled ? '#2ecc71' : 'var(--text-faint)' }}>
                          {wh.enabled ? 'active' : 'paused'}
                        </span>
                      </div>
                      <div style={{ ...S.sub2, fontFamily: 'monospace', fontSize: 11 }}>
                        [{wh.topic}] → {wh.url.length > 50 ? wh.url.slice(0, 50) + '…' : wh.url}
                      </div>
                    </div>
                    <button onClick={() => toggleWebhook(wh.id, wh.enabled)} style={S.btnGhost}>
                      {wh.enabled ? 'Pause' : 'Resume'}
                    </button>
                    <button onClick={() => deleteWebhook(wh.id)} style={S.btnDanger}>Delete</button>
                  </div>
                ))
              }
            </div>
          </section>

          <section style={S.section}>
            <div style={S.sectionHdr}>
              <span style={S.sectionTitle}>Add webhook</span>
            </div>
            <div style={{ ...S.card, padding: 20 }}>
              <form onSubmit={addWebhook} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>TOPIC</label>
                    <input value={whTopic} onChange={e => setWhTopic(e.target.value)} placeholder="my-topic" style={S.input} required/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>LABEL (optional)</label>
                    <input value={whLabel} onChange={e => setWhLabel(e.target.value)} placeholder="Slack alerts" style={S.input}/>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>WEBHOOK URL</label>
                  <input value={whUrl} onChange={e => setWhUrl(e.target.value)} placeholder="https://hooks.slack.com/..." style={S.input} type="url" required/>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>HMAC SECRET (optional — sent as X-Beacon-Signature)</label>
                  <input value={whSecret} onChange={e => setWhSecret(e.target.value)} placeholder="my-secret" style={S.input} type="password"/>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={whAdding || !whTopic.trim() || !whUrl.trim()} style={{ ...S.btn, opacity: whAdding ? 0.6 : 1 }}>
                    {whAdding ? 'Adding…' : 'Add webhook'}
                  </button>
                </div>
              </form>
            </div>
            <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text-faint)' }}>
              Beacon will POST the full message JSON to your URL on every publish. If a secret is set, an <code>X-Beacon-Signature: sha256=…</code> header is included for verification.
            </p>
          </section>
        </>
      )}

      {/* ── TEMPLATES ── */}
      {tab === 'templates' && (
        <>
          <section style={S.section}>
            <div style={S.sectionHdr}>
              <span style={S.sectionTitle}>Saved templates</span>
            </div>
            <div style={S.card}>
              {templates.length === 0
                ? <div style={S.empty}>No templates yet. Save one below.</div>
                : templates.map((t, i) => (
                  <div key={t.id} style={{ ...S.row, flexWrap: 'wrap' as const, borderBottom: i < templates.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
                        <span style={S.label}>{t.label}</span>
                        {t.type && <span style={S.tag}>{t.type}</span>}
                        <span style={S.tag}>{t.priority}</span>
                        {t.topic && <span style={{ ...S.tag, color: 'var(--link)' }}>{t.topic}</span>}
                      </div>
                      <div style={S.sub2}>{t.title ? `${t.title} — ` : ''}{t.message}</div>
                    </div>
                    <Link
                      href={`/t/${t.topic || 'demo'}?tmpl=${t.id}`}
                      style={{ ...S.btn, display: 'inline-block', fontSize: 12, padding: '5px 12px' }}
                    >
                      Use
                    </Link>
                    <button onClick={() => deleteTemplate(t.id)} style={S.btnDanger}>Delete</button>
                  </div>
                ))
              }
            </div>
          </section>

          <section style={S.section}>
            <div style={S.sectionHdr}>
              <span style={S.sectionTitle}>New template</span>
            </div>
            <div style={{ ...S.card, padding: 20 }}>
              <form onSubmit={saveTemplate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>TEMPLATE NAME *</label>
                    <input value={tmplLabel} onChange={e => setTmplLabel(e.target.value)} placeholder="Deploy success" style={S.input} required/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>DEFAULT TOPIC</label>
                    <input value={tmplTopic} onChange={e => setTmplTopic(e.target.value)} placeholder="deploy" style={S.input}/>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>TITLE (optional)</label>
                  <input value={tmplTitle} onChange={e => setTmplTitle(e.target.value)} placeholder="Deploy complete" style={S.input}/>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>MESSAGE *</label>
                  <input value={tmplMessage} onChange={e => setTmplMessage(e.target.value)} placeholder="Your message…" style={S.input} required/>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>TYPE</label>
                    <select value={tmplType} onChange={e => setTmplType(e.target.value)} style={{ ...S.input, cursor: 'pointer' }}>
                      <option value="">— none —</option>
                      <option value="info">ℹ️ info</option>
                      <option value="success">✅ success</option>
                      <option value="warning">⚠️ warning</option>
                      <option value="error">❌ error</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>PRIORITY</label>
                    <select value={tmplPriority} onChange={e => setTmplPriority(e.target.value)} style={{ ...S.input, cursor: 'pointer' }}>
                      <option value="low">🔕 low</option>
                      <option value="default">🔔 default</option>
                      <option value="high">⚠️ high</option>
                      <option value="urgent">🚨 urgent</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>CLICK URL</label>
                    <input value={tmplUrl} onChange={e => setTmplUrl(e.target.value)} placeholder="https://…" style={S.input}/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>TAGS (comma-separated)</label>
                    <input value={tmplTags} onChange={e => setTmplTags(e.target.value)} placeholder="deploy, prod" style={S.input}/>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={!tmplLabel.trim() || !tmplMessage.trim()} style={S.btn}>
                    Save template
                  </button>
                </div>
              </form>
            </div>
          </section>
        </>
      )}

      {/* ── GENERAL ── */}
      {tab === 'general' && (
        <section style={S.section}>
          <div style={S.sectionHdr}>
            <span style={S.sectionTitle}>Instance info</span>
          </div>
          <div style={S.card}>
            {[
              { label: 'Status',            value: rateLimitInfo?.status ?? '…' },
              { label: 'Uptime',            value: rateLimitInfo ? formatUptime(rateLimitInfo.uptime) : '…' },
              { label: 'Live topics',       value: rateLimitInfo?.topics_live ?? '…' },
              { label: 'Persisted topics',  value: rateLimitInfo?.topics_db ?? '…' },
              { label: 'Rate limit',        value: `${process.env.NTFY_RATE_LIMIT ?? 60} msgs/min/topic` },
              { label: 'Max history',       value: `${process.env.NTFY_MAX_HISTORY ?? 100} msgs/topic` },
              { label: 'Auth',              value: process.env.NTFY_TOKEN ? 'Enabled' : 'Disabled (open)' },
              { label: 'Telegram',          value: process.env.TELEGRAM_BOT_TOKEN ? 'Configured' : 'Not configured' },
            ].map(({ label, value }, i, arr) => (
              <div key={label} style={{ ...S.row, borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 160 }}>{label}</span>
                <span style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'monospace' }}>{String(value)}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24 }}>
            <div style={S.sectionHdr}>
              <span style={S.sectionTitle}>Environment variables</span>
            </div>
            <div style={S.card}>
              {[
                { key: 'NTFY_TOKEN',          desc: 'Bearer token for auth. Leave empty for open access.' },
                { key: 'NTFY_MAX_HISTORY',    desc: 'Max messages to keep per topic (default: 100).' },
                { key: 'NTFY_DEFAULT_TTL',    desc: 'Default message TTL in seconds (0 = never).' },
                { key: 'NTFY_RATE_LIMIT',     desc: 'Max messages per topic per minute (0 = disabled).' },
                { key: 'TELEGRAM_BOT_TOKEN',  desc: 'Telegram bot token from @BotFather.' },
                { key: 'TELEGRAM_CHAT_ID',    desc: 'Telegram chat ID from @userinfobot.' },
              ].map(({ key, desc }, i, arr) => (
                <div key={key} style={{ ...S.row, borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ flex: 1 }}>
                    <code style={{ fontSize: 12, color: 'var(--link)', background: 'var(--bg-tag)', padding: '2px 6px', borderRadius: 4 }}>{key}</code>
                    <div style={{ ...S.sub2, marginTop: 4 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function formatUptime(s: number): string {
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}h ${m}m`
}
