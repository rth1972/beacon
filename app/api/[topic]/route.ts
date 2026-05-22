import { NextRequest } from 'next/server'
import { execFile } from 'child_process'
import { subscribe, unsubscribe, publish, getSubscriberCount, type NotifyMessage, type MessageType } from '@/app/store'
import { messageDb, subDb, tokenDb, settingsDb, attachmentDb } from '@/app/db'
import { isAuthorized, isAuthorizedBrowser, unauthorizedResponse } from '@/app/auth'
import { sendTelegram } from '@/app/telegram'
import { pushSender } from '@/app/vapid'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TYPE_EMOJI: Record<MessageType, string> = {
  info:    'ℹ️',
  success: '✅',
  warning: '⚠️',
  error:   '❌',
}

const TYPE_LINUX_ICON: Record<MessageType, string> = {
  info:    'dialog-information',
  success: 'dialog-ok',
  warning: 'dialog-warning',
  error:   'dialog-error',
}

function esc(s: string) { return s.replace(/"/g, '\\"') }

function systemNotify(title: string, message: string, priority: string, type?: MessageType, url?: string) {
  const emoji     = type ? TYPE_EMOJI[type] + ' ' : ''
  const fullTitle = emoji + title
  console.log(`[notify] platform=${process.platform} title="${fullTitle}" message="${message}"`)
  if (process.platform === 'darwin') {
    const script = `display notification "${esc(message)}" with title "${esc(fullTitle)}"`
    execFile('osascript', ['-e', script], (err) => {
      if (err) console.error('[notify] osascript error:', err.message)
    })
  } else if (process.platform === 'win32') {
    const safeTitle = fullTitle.replace(/'/g, "''")
    const safeMsg   = message.replace(/'/g, "''")
    const ps = `
      [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
      $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
      $template.GetElementsByTagName('text')[0].AppendChild($template.CreateTextNode('${safeTitle}')) | Out-Null
      $template.GetElementsByTagName('text')[1].AppendChild($template.CreateTextNode('${safeMsg}')) | Out-Null
      $toast = [Windows.UI.Notifications.ToastNotification]::new($template)
      [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Beacon').Show($toast)
    `
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

async function notifyWebPush(topic: string, msg: NotifyMessage) {
  const subs = subDb.getByTopic(topic)
  if (subs.length === 0) return

  const payload = JSON.stringify({
    title: msg.title || `[${topic}]`,
    message: msg.message,
    topic,
    priority: msg.priority,
    url: msg.url,
    actions: msg.actions,
  })

  const results = await Promise.allSettled(subs.map(sub =>
    pushSender.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
    )
  ))

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const err = r.reason
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        subDb.delete(subs[i].endpoint, topic)
      }
    }
  })
}

async function relayToNtfy(msg: NotifyMessage) {
  const settings = settingsDb.get(msg.topic)
  if (!settings?.relay_url) return
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (settings.relay_token) headers['Authorization'] = `Bearer ${settings.relay_token}`
    await fetch(settings.relay_url.replace('{topic}', msg.topic), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: msg.title,
        message: msg.message,
        priority: msg.priority,
        tags: msg.tags,
        topic: msg.topic,
      }),
    })
  } catch (err) {
    console.error('[relay] ntfy.sh error:', err)
  }
}

function checkTokenAuth(req: NextRequest): boolean {
  const token = req.headers.get('x-token') || req.nextUrl.searchParams.get('token') || ''
  if (!token) return false
  return !!tokenDb.findByToken(token)
}

// ─── GET /api/[topic]  →  SSE subscription ──────────────────────────────────
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ topic: string }> }
) {
  if (!isAuthorized(req) && !isAuthorizedBrowser(req) && !checkTokenAuth(req)) return unauthorizedResponse()

  const { topic } = await context.params
  const since = req.nextUrl.searchParams.get('since')
  const poll  = req.nextUrl.searchParams.get('poll') === '1'

  if (poll) {
    const sinceTs = since ? parseInt(since) : 0
    const messages = sinceTs
      ? messageDb.getSince(topic, sinceTs)
      : messageDb.getByTopic(topic, parseInt(process.env.NTFY_MAX_HISTORY ?? '100'))
    return Response.json({ messages })
  }

  const stream = new ReadableStream<string>({
    start(ctrl) {
      const maxHistory = parseInt(process.env.NTFY_MAX_HISTORY ?? '100')
      const sinceTs    = since ? parseInt(since) : 0
      const history    = sinceTs
        ? messageDb.getSince(topic, sinceTs)
        : messageDb.getByTopic(topic, maxHistory)

      ;[...history].reverse().forEach(msg => {
        ctrl.enqueue(`data: ${JSON.stringify(msg)}\n\n`)
      })

      ctrl.enqueue(`: connected to topic "${topic}"\n\n`)
      subscribe(topic, ctrl)

      const keepalive = setInterval(() => {
        try { ctrl.enqueue(': keepalive\n\n') }
        catch { clearInterval(keepalive) }
      }, 25_000)

      req.signal.addEventListener('abort', () => {
        clearInterval(keepalive)
        unsubscribe(topic, ctrl)
        try { ctrl.close() } catch { }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

// ─── POST /api/[topic]  →  publish a message ────────────────────────────────
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ topic: string }> }
) {
  if (!isAuthorized(req) && !checkTokenAuth(req)) return unauthorizedResponse()

  const { topic } = await context.params
  let body: any = {}
  const contentType = req.headers.get('content-type') ?? ''
  let attachment: any = null

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    for (const [key, val] of form) {
      if (key === 'file' && val instanceof Blob) {
        const buf = Buffer.from(await val.arrayBuffer())
        attachment = {
          id: crypto.randomUUID(),
          topic,
          filename: (val as any).name || 'file',
          mimetype: val.type || 'application/octet-stream',
          size: buf.length,
          data: buf,
          timestamp: Date.now(),
        }
        attachmentDb.insert(attachment)
        body.message = `📎 ${attachment.filename} (${formatSize(attachment.size)})`
      } else if (key === 'message' && typeof val === 'string') {
        body.message = val
      } else if (typeof val === 'string') {
        body[key] = val
      }
    }
  } else if (contentType.includes('application/json')) {
    body = await req.json()
  } else {
    const text = await req.text()
    body = {
      message:   text,
      title:     req.headers.get('x-title')     ?? undefined,
      priority:  (req.headers.get('x-priority') ?? undefined) as any,
      type:      (req.headers.get('x-type')      ?? undefined) as any,
      url:       req.headers.get('x-url')        ?? undefined,
      url_label: req.headers.get('x-url-label')  ?? undefined,
      tags:      req.headers.get('x-tags')?.split(',').map(t => t.trim()) ?? undefined,
      actions:   req.headers.get('x-actions')    ?? undefined,
      delay:     req.headers.get('x-delay')      ?? undefined,
    }
  }

  if (!body.message?.trim()) {
    return Response.json({ error: 'message is required' }, { status: 400 })
  }

  const defaultTtl = parseInt(process.env.NTFY_DEFAULT_TTL ?? '0')
  const ttl = body.ttl ?? defaultTtl
  let expires_at = ttl > 0 ? Date.now() + ttl * 1000 : undefined

  // Scheduling: delay=<seconds> or at=<ISO timestamp>
  let publishAt = 0
  if (body.delay) {
    const match = body.delay.match(/^(\d+)([smhd])?$/)
    if (match) {
      const n = parseInt(match[1])
      const unit = match[2] || 's'
      const mult: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 }
      publishAt = Date.now() + n * mult[unit]
    }
  } else if (body.at) {
    const ts = new Date(body.at).getTime()
    if (!isNaN(ts)) publishAt = ts
  }

  const msg: NotifyMessage = {
    id:        crypto.randomUUID(),
    topic,
    title:     body.title,
    message:   body.message,
    type:      body.type,
    priority:  body.priority ?? 'default',
    tags:      body.tags ?? [],
    url:       body.url,
    url_label: body.url_label,
    expires_at,
    actions:   body.actions ? JSON.parse(typeof body.actions === 'string' ? body.actions : JSON.stringify(body.actions)) : undefined,
    attachment: attachment ? { id: attachment.id, filename: attachment.filename, mimetype: attachment.mimetype, size: attachment.size } : undefined,
    timestamp: Date.now(),
  }

  // If scheduled, store in a scheduled queue (simple: store message now, publish later via setTimeout)
  if (publishAt > 0) {
    const delayMs = publishAt - Date.now()
    if (delayMs > 0) {
      messageDb.insert({ ...msg, tags: msg.tags ?? [], priority: msg.priority ?? 'default' })
      setTimeout(async () => {
        publish(topic, msg)
        if (msg.actions) notifyWebPush(topic, msg)
      }, delayMs)
      return Response.json({ ok: true, id: msg.id, scheduled_at: new Date(publishAt).toISOString() })
    }
  }

  try {
    messageDb.insert({ ...msg, tags: msg.tags ?? [], priority: msg.priority ?? 'default' })
  } catch (err) {
    console.error('[db] insert error:', err)
  }

  const delivered = publish(topic, msg)

  const notifTitle = msg.title ? `[${topic}] ${msg.title}` : `[${topic}]`
  try { systemNotify(notifTitle, msg.message, msg.priority ?? 'default', msg.type, msg.url) } catch {}

  sendTelegram(msg).catch(err => console.error('[telegram] error:', err))
  notifyWebPush(topic, msg).catch(err => console.error('[webpush] error:', err))
  relayToNtfy(msg).catch(err => console.error('[relay] error:', err))

  return Response.json({ ok: true, id: msg.id, delivered })
}

// ─── DELETE /api/[topic]  →  delete message(s) ──────────────────────────────
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ topic: string }> }
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

// ─── HEAD /api/[topic]  →  subscriber + stats ───────────────────────────────
export async function HEAD(
  _req: NextRequest,
  context: { params: Promise<{ topic: string }> }
) {
  const { topic } = await context.params
  const subs  = getSubscriberCount(topic)
  const stats = messageDb.getStats(topic)
  return new Response(null, {
    headers: {
      'X-Subscriber-Count': String(subs),
      'X-Message-Count':    String(stats.count),
      'X-Last-Message':     String(stats.last_message ?? 0),
    },
  })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB'
  return (bytes / 1048576).toFixed(1) + 'MB'
}
