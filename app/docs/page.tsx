'use client'

import { useState } from 'react'

interface Endpoint {
  method: 'GET' | 'POST' | 'DELETE' | 'HEAD' | 'PATCH'
  path: string
  desc: string
  params?: { name: string; type: string; required?: boolean; desc: string }[]
  body?: { name: string; type: string; required?: boolean; desc: string }[]
  example?: string
  response?: string
}

const ENDPOINTS: Endpoint[] = [
  {
    method: 'GET', path: '/api/:topic', desc: 'Subscribe to a topic via Server-Sent Events. Replays message history on connect.',
    params: [
      { name: 'since', type: 'number', desc: 'Unix timestamp — only return messages after this time.' },
      { name: 'poll',  type: '1',      desc: 'Return messages as JSON instead of SSE stream.' },
    ],
    example: `curl -N http://localhost:3000/api/my-topic`,
    response: `data: {"id":"abc","topic":"my-topic","message":"Hello","priority":"default","timestamp":1716000000000}`,
  },
  {
    method: 'POST', path: '/api/:topic', desc: 'Publish a message to a topic. Accepts JSON, plain text, or multipart/form-data (for attachments).',
    body: [
      { name: 'message',   type: 'string',   required: true,  desc: 'The notification body.' },
      { name: 'title',     type: 'string',                    desc: 'Optional title / heading.' },
      { name: 'type',      type: 'info|success|warning|error',desc: 'Visual message type.' },
      { name: 'priority',  type: 'low|default|high|urgent',   desc: 'Notification priority.' },
      { name: 'tags',      type: 'string[]',                  desc: 'Array of tag strings.' },
      { name: 'url',       type: 'string',                    desc: 'Click-action URL.' },
      { name: 'url_label', type: 'string',                    desc: 'Button label for the URL.' },
      { name: 'ttl',       type: 'number',                    desc: 'Seconds until the message expires.' },
      { name: 'delay',     type: 'string',                    desc: 'Schedule: e.g. "30s", "5m", "2h", "1d".' },
    ],
    example: `curl -X POST http://localhost:3000/api/deploy \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Deploy complete","message":"v2.4.1","type":"success","priority":"high","url":"https://myapp.com"}'`,
    response: `{"ok":true,"id":"abc123","delivered":2}`,
  },
  {
    method: 'DELETE', path: '/api/:topic', desc: 'Delete all messages in a topic, or specific messages by ID.',
    params: [{ name: 'id', type: 'string', desc: 'Message ID to delete. Repeat for multiple. Omit to clear all.' }],
    example: `curl -X DELETE http://localhost:3000/api/my-topic\ncurl -X DELETE "http://localhost:3000/api/my-topic?id=abc&id=def"`,
    response: `{"ok":true,"topic":"my-topic","deleted":5}`,
  },
  {
    method: 'HEAD', path: '/api/:topic', desc: 'Get subscriber count and message stats for a topic (headers only).',
    example: `curl -I http://localhost:3000/api/my-topic`,
    response: `X-Subscriber-Count: 3\nX-Message-Count: 42\nX-Last-Message: 1716000000000`,
  },
  {
    method: 'GET', path: '/api/topics', desc: 'Live topic list via SSE. Use ?list=1 for JSON snapshot with stats.',
    params: [{ name: 'list', type: '1', desc: 'Return topics as JSON with message count and last message time.' }],
    example: `curl http://localhost:3000/api/topics?list=1`,
    response: `{"topics":[{"topic":"deploy","count":12,"last_message":1716000000000}]}`,
  },
  {
    method: 'GET', path: '/api/search', desc: 'Search message history across all topics.',
    params: [
      { name: 'q',        type: 'string', desc: 'Full-text search in message and title fields.' },
      { name: 'topic',    type: 'string', desc: 'Filter by topic name.' },
      { name: 'type',     type: 'string', desc: 'Filter by message type.' },
      { name: 'priority', type: 'string', desc: 'Filter by priority.' },
      { name: 'limit',    type: 'number', desc: 'Max results (default 50, max 200).' },
    ],
    example: `curl "http://localhost:3000/api/search?q=deploy&type=error&limit=20"`,
    response: `{"messages":[...],"count":3}`,
  },
  {
    method: 'GET',    path: '/api/webhooks', desc: 'List all configured webhooks.',
    example: `curl http://localhost:3000/api/webhooks`,
    response: `{"webhooks":[{"id":"abc","topic":"deploy","url":"https://hooks.slack.com/...","enabled":true}]}`,
  },
  {
    method: 'POST',   path: '/api/webhooks', desc: 'Create a new outgoing webhook.',
    body: [
      { name: 'topic',  type: 'string', required: true, desc: 'Topic that triggers this webhook.' },
      { name: 'url',    type: 'string', required: true, desc: 'URL to POST to.' },
      { name: 'label',  type: 'string', desc: 'Human-readable name.' },
      { name: 'secret', type: 'string', desc: 'HMAC secret for request signing.' },
    ],
    example: `curl -X POST http://localhost:3000/api/webhooks \\
  -H "Content-Type: application/json" \\
  -d '{"topic":"deploy","url":"https://hooks.slack.com/...","label":"Slack"}'`,
    response: `{"ok":true,"webhook":{...}}`,
  },
  {
    method: 'DELETE', path: '/api/webhooks/:id', desc: 'Delete a webhook.',
    example: `curl -X DELETE http://localhost:3000/api/webhooks/abc123`,
    response: `{"ok":true}`,
  },
  {
    method: 'PATCH',  path: '/api/webhooks/:id', desc: 'Enable or pause a webhook.',
    body: [{ name: 'enabled', type: 'boolean', required: true, desc: 'true to enable, false to pause.' }],
    example: `curl -X PATCH http://localhost:3000/api/webhooks/abc123 \\
  -H "Content-Type: application/json" \\
  -d '{"enabled":false}'`,
    response: `{"ok":true}`,
  },
  {
    method: 'GET',    path: '/api/scheduled', desc: 'List pending scheduled messages.',
    example: `curl http://localhost:3000/api/scheduled`,
    response: `{"scheduled":[{"id":"abc","topic":"deploy","send_at_iso":"2026-05-24T09:00:00.000Z",...}]}`,
  },
  {
    method: 'DELETE', path: '/api/scheduled', desc: 'Cancel a pending scheduled message.',
    params: [{ name: 'id', type: 'string', required: true, desc: 'Scheduled message ID.' }],
    example: `curl -X DELETE "http://localhost:3000/api/scheduled?id=abc123"`,
    response: `{"ok":true}`,
  },
  {
    method: 'GET', path: '/api/health', desc: 'Health check — returns uptime, live topic count, and DB stats.',
    example: `curl http://localhost:3000/api/health`,
    response: `{"status":"ok","uptime":3600,"topics_live":4,"topics_db":12,"timestamp":1716000000000}`,
  },
]

const METHOD_COLOR: Record<string, string> = {
  GET:    '#6490ff',
  POST:   '#2ecc71',
  DELETE: '#ff6b6b',
  HEAD:   '#f5a623',
  PATCH:  '#bb86fc',
}

export default function DocsPage() {
  const [open, setOpen] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>API Reference</h1>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>
        Base URL: <code style={codeStyle}>http://localhost:3000</code>
      </p>
      <p style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 32 }}>
        If auth is enabled, pass <code style={codeStyle}>Authorization: Bearer &lt;token&gt;</code> on every request.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ENDPOINTS.map((ep) => {
          const key = `${ep.method}-${ep.path}`
          const isOpen = open === key
          return (
            <div key={key} style={{ border: '1px solid var(--border-card)', borderRadius: 10, overflow: 'hidden' }}>
              {/* Header row */}
              <button
                onClick={() => setOpen(isOpen ? null : key)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', background: isOpen ? 'var(--bg-active)' : 'var(--bg-card)',
                  border: 'none', cursor: 'pointer', textAlign: 'left' as const,
                  transition: 'background 0.15s',
                }}
              >
                <span style={{
                  fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
                  color: METHOD_COLOR[ep.method] ?? '#888',
                  background: `${METHOD_COLOR[ep.method]}18`,
                  borderRadius: 4, padding: '2px 7px',
                  minWidth: 52, textAlign: 'center' as const,
                }}>
                  {ep.method}
                </span>
                <code style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>{ep.path}</code>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 2, textAlign: 'left' as const }}>{ep.desc}</span>
                <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {ep.params && (
                    <div>
                      <div style={paramHdr}>Query parameters</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 12 }}>
                        <tbody>
                          {ep.params.map(p => (
                            <tr key={p.name} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' as const }}><code style={codeStyle}>{p.name}</code></td>
                              <td style={{ padding: '6px 8px', color: '#f5a623', fontFamily: 'monospace', fontSize: 11 }}>{p.type}</td>
                              <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{p.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {ep.body && (
                    <div>
                      <div style={paramHdr}>Request body (JSON)</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 12 }}>
                        <tbody>
                          {ep.body.map(p => (
                            <tr key={p.name} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' as const }}>
                                <code style={codeStyle}>{p.name}</code>
                                {p.required && <span style={{ color: '#ff6b6b', marginLeft: 4, fontSize: 10 }}>required</span>}
                              </td>
                              <td style={{ padding: '6px 8px', color: '#f5a623', fontFamily: 'monospace', fontSize: 11 }}>{p.type}</td>
                              <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{p.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {ep.example && (
                    <div>
                      <div style={{ ...paramHdr, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Example</span>
                        <button onClick={() => copy(ep.example!, `ex-${key}`)} style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--text-faint)', cursor: 'pointer' }}>
                          {copied === `ex-${key}` ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                      <pre style={preStyle}>{ep.example}</pre>
                    </div>
                  )}

                  {ep.response && (
                    <div>
                      <div style={paramHdr}>Response</div>
                      <pre style={{ ...preStyle, color: '#2ecc71' }}>{ep.response}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const codeStyle: React.CSSProperties = {
  fontFamily: 'monospace', fontSize: 12,
  background: 'var(--bg-tag)', padding: '1px 5px', borderRadius: 3,
  color: 'var(--text-code)',
}

const paramHdr: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'var(--text-faint)',
  textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8,
}

const preStyle: React.CSSProperties = {
  background: 'var(--bg-code)', border: '1px solid var(--border-code)',
  borderRadius: 7, padding: '12px 14px', fontSize: 12,
  fontFamily: 'monospace', overflowX: 'auto', color: 'var(--text-code)',
  lineHeight: 1.6, margin: 0,
}
