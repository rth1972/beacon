import { NextRequest } from 'next/server'
import { execFile } from 'child_process'
import {
  subscribe, unsubscribe, publish, getSubscriberCount,
  type NotifyMessage, type MessageType,
} from '@/app/store'
import { messageDb, tokenDb } from '@/app/db'
import { isAuthorized, isAuthorizedBrowser, unauthorizedResponse } from '@/app/auth'
import { sendTelegram } from '@/app/telegram'
import { fireWebhooks } from '@/app/webhooks'
import { checkRateLimit } from '@/app/ratelimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ─── Notification helpers ────────────────────────────────────────────────────

const TYPE_EMOJI: Record<MessageType, string> = {
  info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌',
}
const TYPE_LINUX_ICON: Record<MessageType, string> = {
  info: 'dialog-information', success: 'dialog-ok',
  warning: 'dialog-warning',  error: 'dialog-error',
}

function esc(s: string) { return s.replace(/"/g, '\\"') }

function systemNotify(title: string, message: string, priority: string, type?: MessageType) {
  const fullTitle = (type ? TYPE_EMOJI[type] + ' ' : '') + title
  console.log(`[notify] platform=${process.platform} → "${fullTitle}"`)
  if (process.platform === 'darwin') {
    const script = `display notification "${esc(message)}" with title "${esc(fullTitle)}"`
    execFile('osascript', ['-e', script], (err) => {
      if (err) console.error('[notify] osascript error:', err.message)
    })
  } else if (process.platform === 'win32') {
    const t = fullTitle.replace(/'/g, "''")
    const m = message.replace(/'/g, "''")
    const ps = `
[Windows.UI.Notifications.ToastNotificationManager,Windows.UI.Notifications,ContentType=WindowsRuntime]|Out-Null
$tpl=[Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$tpl.GetElementsByTagName('text')[0].AppendChild($tpl.CreateTextNode('${t}'))|Out-Null
$tpl.GetElementsByTagName('text')[1].AppendChild($tpl.CreateTextNode('${m}'))|Out-Null
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Beacon').Show([Windows.UI.Notifications.ToastNotification]::new($tpl))`
    execFile('powershell', ['-NoProfile', '-Command', ps], (err) => {
      if (err) console.error('[notify] powershell error:', err.message)
    })
  } else {
    const urgency = priority === 'urgent' ? 'critical' : priority === 'high' ? 'normal' : 'low'
    const icon    = type ? TYPE_LINUX_ICON[type] : 'dialog-information'
    execFile('notify-send', ['-u', urgency, '-i', icon, fullTitle, message], (err) => {
      if (err) console.error('[notify] notify-send error:', err.message)
    })
  }
}

function checkTokenAuth(req: NextRequest): boolean {
  const t = req.headers.get('x-token') ?? req.nextUrl.searchParams.get('token') ?? ''
  return t ? !!tokenDb.findByToken(t) : false
}

function formatSize(bytes: number): string {
  if (bytes < 1024)    return bytes + 'B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB'
  return (bytes / 1048576).toFixed(1) + 'MB'
}

// ─── GET /api/[topic]  →  SSE subscription ──────────────────────────────────
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ topic: string }> },
) {
  if (!isAuthorized(req) && !isAuthorizedBrowser(req) && !checkTokenAuth(req))
    return unauthorizedResponse()

  const { topic } = await context.params
  const since = req.nextUrl.searchParams.get('since')
  const poll  = req.nextUrl.searchParams.get('poll') === '1'

  // REST poll mode
  if (poll) {
    const sinceTs = since ? parseInt(since) : 0
    const messages = sinceTs
      ? messageDb.getSince(topic, sinceTs)
      : messageDb.getByTopic(topic, parseInt(process.env.NTFY_MAX_HISTORY ?? '100'))
    return Response.json({ messages })
  }

  // SSE stream
  const stream = new ReadableStream<string>({
    start(ctrl) {
      const maxHistory = parseInt(process.env.NTFY_MAX_HISTORY ?? '100')
      const sinceTs    = since ? parseInt(since) : 0
      const history    = sinceTs
        ? messageDb.getSince(topic, sinceTs)
        : messageDb.getByTopic(topic, maxHistory)

      // Replay history oldest-first
      ;[...history].reverse().forEach(m => ctrl.enqueue(`data: ${JSON.stringify(m)}\n\n`))

      ctrl.enqueue(`: connected to "${topic}"\n\n`)
      subscribe(topic, ctrl)

      const keepalive = setInterval(() => {
        try { ctrl.enqueue(': keepalive\n\n') }
        catch { clearInterval(keepalive) }
      }, 25_000)

      req.signal.addEventListener('abort', () => {
        clearInterval(keepalive)
        unsubscribe(topic, ctrl)
        try { ctrl.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':    'text/event-stream; charset=utf-8',
      'Cache-Control':   'no-cache, no-transform',
      'Connection':      'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

// ─── POST /api/[topic]  →  publish ──────────────────────────────────────────
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ topic: string }> },
) {
  if (!isAuthorized(req) && !checkTokenAuth(req)) return unauthorizedResponse()

  const { topic } = await context.params

  // Rate limit
  const rate = checkRateLimit(topic)
  if (!rate.ok) {
    return Response.json(
      { error: `Rate limit exceeded. Retry after ${new Date(rate.resetAt).toISOString()}` },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit':     process.env.NTFY_RATE_LIMIT ?? '60',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset':     String(rate.resetAt),
          'Retry-After':           String(Math.ceil((rate.resetAt - Date.now()) / 1000)),
        },
      },
    )
  }

  // Parse body
  let body: Record<string, any> = {}
  const ct = req.headers.get('content-type') ?? ''

  if (ct.includes('multipart/form-data')) {
    const form = await req.formData()
    for (const [key, val] of form) {
      if (key === 'file' && val instanceof Blob) {
        const buf      = Buffer.from(await val.arrayBuffer())
        const filename = (val as File).name || 'file'
        body.message   = body.message ?? `📎 ${filename} (${formatSize(buf.length)})`
      } else if (typeof val === 'string') {
        body[key] = val
      }
    }
  } else if (ct.includes('application/json')) {
    body = await req.json()
  } else {
    // Plain-text + ntfy-compatible headers
    body = {
      message:   await req.text(),
      title:     req.headers.get('x-title')     ?? undefined,
      priority:  req.headers.get('x-priority')  ?? undefined,
      type:      req.headers.get('x-type')       ?? undefined,
      url:       req.headers.get('x-url')        ?? undefined,
      url_label: req.headers.get('x-url-label')  ?? undefined,
      tags:      req.headers.get('x-tags')?.split(',').map(t => t.trim()) ?? undefined,
      delay:     req.headers.get('x-delay')      ?? undefined,
    }
  }

  if (!body.message?.trim())
    return Response.json({ error: 'message is required' }, { status: 400 })

  // TTL → expires_at
  const ttl = body.ttl ?? parseInt(process.env.NTFY_DEFAULT_TTL ?? '0')
  const expires_at = ttl > 0 ? Date.now() + ttl * 1000 : undefined

  // Scheduling
  let publishAt = 0
  if (body.delay) {
    const m = String(body.delay).match(/^(\d+)([smhd]?)$/)
    if (m) {
      const mult: Record<string, number> = { s: 1e3, m: 6e4, h: 36e5, d: 864e5, '': 1e3 }
      publishAt = Date.now() + parseInt(m[1]) * (mult[m[2]] ?? 1e3)
    }
  }

  const msg: NotifyMessage = {
    id:        crypto.randomUUID(),
    topic,
    title:     body.title     || undefined,
    message:   body.message,
    type:      body.type      || undefined,
    priority:  body.priority  ?? 'default',
    tags:      Array.isArray(body.tags) ? body.tags : [],
    url:       body.url       || undefined,
    url_label: body.url_label || undefined,
    expires_at,
    timestamp: Date.now(),
  }

  // Scheduled publish
  if (publishAt > 0 && publishAt > Date.now()) {
    const delay = publishAt - Date.now()
    setTimeout(() => {
      messageDb.insert({ ...msg, tags: msg.tags ?? [], priority: msg.priority ?? 'default' })
      publish(topic, msg)
      sendTelegram(msg).catch(() => {})
      fireWebhooks(topic, msg).catch(() => {})
    }, delay)
    return Response.json({ ok: true, id: msg.id, scheduled_at: new Date(publishAt).toISOString() })
  }

  // Immediate publish
  try {
    messageDb.insert({ ...msg, tags: msg.tags ?? [], priority: msg.priority ?? 'default' })
  } catch (err) {
    console.error('[db] insert error:', err)
  }

  const delivered = publish(topic, msg)

  const notifTitle = msg.title ? `[${topic}] ${msg.title}` : `[${topic}]`
  try { systemNotify(notifTitle, msg.message, msg.priority ?? 'default', msg.type) } catch {}

  sendTelegram(msg).catch(err => console.error('[telegram]', err))
  fireWebhooks(topic, msg).catch(err => console.error('[webhook]', err))

  return Response.json({ ok: true, id: msg.id, delivered })
}

// ─── DELETE /api/[topic]  →  clear topic / specific messages ────────────────
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ topic: string }> },
) {
  if (!isAuthorized(req) && !checkTokenAuth(req)) return unauthorizedResponse()
  const { topic } = await context.params
  const ids = req.nextUrl.searchParams.getAll('id')
  if (ids.length > 0) {
    let deleted = 0
    for (const id of ids) deleted += messageDb.deleteMessage(id)
    return Response.json({ ok: true, topic, deleted })
  }
  const deleted = messageDb.deleteTopic(topic)
  return Response.json({ ok: true, topic, deleted })
}

// ─── HEAD /api/[topic]  →  stats ────────────────────────────────────────────
export async function HEAD(
  _req: NextRequest,
  context: { params: Promise<{ topic: string }> },
) {
  const { topic } = await context.params
  const stats = messageDb.getStats(topic)
  return new Response(null, {
    headers: {
      'X-Subscriber-Count': String(getSubscriberCount(topic)),
      'X-Message-Count':    String(stats.count),
      'X-Last-Message':     String(stats.last_message ?? 0),
    },
  })
}
