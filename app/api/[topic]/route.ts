import { NextRequest } from 'next/server'
import { execFile } from 'child_process'
import { subscribe, unsubscribe, publish, getSubscriberCount, type NotifyMessage, type MessageType } from '@/app/store'
import { messageDb } from '@/app/db'
import { isAuthorized, isAuthorizedBrowser, unauthorizedResponse } from '@/app/auth'
import { sendTelegram } from '@/app/telegram'

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
    console.log('[notify] using osascript:', script)
    execFile('osascript', ['-e', script], (err, _stdout, stderr) => {
      if (err) console.error('[notify] osascript error:', err.message)
      if (stderr) console.error('[notify] osascript stderr:', stderr)
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

// ─── GET /api/[topic]  →  SSE subscription ──────────────────────────────────
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ topic: string }> }
) {
  if (!isAuthorized(req) && !isAuthorizedBrowser(req)) return unauthorizedResponse()

  const { topic } = await context.params
  const since = req.nextUrl.searchParams.get('since')
  const poll  = req.nextUrl.searchParams.get('poll') === '1'

  // REST poll mode: return missed messages as JSON and close
  if (poll) {
    const sinceTs = since ? parseInt(since) : 0
    const messages = sinceTs
      ? messageDb.getSince(topic, sinceTs)
      : messageDb.getByTopic(topic, parseInt(process.env.NTFY_MAX_HISTORY ?? '100'))
    return Response.json({ messages })
  }

  const stream = new ReadableStream<string>({
    start(ctrl) {
      // Send history first so the client catches up on reconnect
      const maxHistory = parseInt(process.env.NTFY_MAX_HISTORY ?? '100')
      const sinceTs    = since ? parseInt(since) : 0
      const history    = sinceTs
        ? messageDb.getSince(topic, sinceTs)
        : messageDb.getByTopic(topic, maxHistory)

      // Send in chronological order
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
        try { ctrl.close() } catch { /* already closed */ }
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
  if (!isAuthorized(req)) return unauthorizedResponse()

  const { topic } = await context.params
  let body: Partial<NotifyMessage> = {}
  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    body = await req.json()
  } else {
    // Support plain-text + ntfy-style headers
    const text = await req.text()
    body = {
      message:   text,
      title:     req.headers.get('x-title')     ?? undefined,
      priority:  (req.headers.get('x-priority') ?? undefined) as any,
      type:      (req.headers.get('x-type')      ?? undefined) as any,
      url:       req.headers.get('x-url')        ?? undefined,
      url_label: req.headers.get('x-url-label')  ?? undefined,
      tags:      req.headers.get('x-tags')?.split(',').map(t => t.trim()) ?? undefined,
    }
  }

  if (!body.message?.trim()) {
    return Response.json({ error: 'message is required' }, { status: 400 })
  }

  // Resolve TTL → expires_at
  const defaultTtl = parseInt(process.env.NTFY_DEFAULT_TTL ?? '0')
  const ttl = body.ttl ?? defaultTtl
  const expires_at = ttl > 0 ? Date.now() + ttl * 1000 : undefined

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
    timestamp: Date.now(),
  }

  // Persist to SQLite
  try {
    messageDb.insert({ ...msg, tags: msg.tags ?? [], priority: msg.priority ?? 'default' })
  } catch (err) {
    console.error('[db] insert error:', err)
  }

  const delivered = publish(topic, msg)

  const notifTitle = msg.title ? `[${topic}] ${msg.title}` : `[${topic}]`
  try {
    systemNotify(notifTitle, msg.message, msg.priority ?? 'default', msg.type, msg.url)
  } catch (err) {
    console.error('[notify] systemNotify error:', err)
  }

  // Telegram — fire and forget
  sendTelegram(msg).catch(err => console.error('[telegram] error:', err))

  return Response.json({ ok: true, id: msg.id, delivered })
}

// ─── DELETE /api/[topic]  →  delete message(s) ──────────────────────────────
//   DELETE /api/[topic]?id=<uuid>      →  delete a single message
//   DELETE /api/[topic]?id=a&id=b&id=c →  delete multiple messages
//   DELETE /api/[topic]                →  delete all messages for topic
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ topic: string }> }
) {
  if (!isAuthorized(req)) return unauthorizedResponse()
  const { topic } = await context.params
  const ids = req.nextUrl.searchParams.getAll('id')

  if (ids.length > 0) {
    let deleted = 0
    for (const id of ids) {
      deleted += messageDb.deleteMessage(id)
    }
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
