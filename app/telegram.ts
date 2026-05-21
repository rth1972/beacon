/**
 * Telegram bot helper.
 *
 * Set these in .env.local:
 *   TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
 *   TELEGRAM_CHAT_ID=987654321
 *
 * Get a bot token: message @BotFather on Telegram → /newbot
 * Get your chat ID: message @userinfobot on Telegram
 */

import { type NotifyMessage, type MessageType } from '@/app/store'

const TYPE_EMOJI: Record<MessageType, string> = {
  info:    'ℹ️',
  success: '✅',
  warning: '⚠️',
  error:   '❌',
}

const PRIORITY_EMOJI: Record<string, string> = {
  low:     '🔕',
  default: '🔔',
  high:    '⚠️',
  urgent:  '🚨',
}

function escMd(text: string): string {
  // Escape Telegram MarkdownV2 special characters
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&')
}

export async function sendTelegram(msg: NotifyMessage): Promise<void> {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return // not configured

  const typeEmoji     = msg.type     ? TYPE_EMOJI[msg.type] + ' '         : ''
  const priorityEmoji = msg.priority ? PRIORITY_EMOJI[msg.priority] + ' ' : ''

  // Build message text in MarkdownV2
  const lines: string[] = []

  // Header line: emoji + topic
  lines.push(`${typeEmoji}*${escMd(`[${msg.topic}]`)}*`)

  // Title (if present)
  if (msg.title) {
    lines.push(`*${escMd(msg.title)}*`)
  }

  // Message body
  lines.push(escMd(msg.message))

  // Meta row: priority + type badge + tags
  const meta: string[] = []
  meta.push(`${priorityEmoji}${escMd(msg.priority ?? 'default')}`)
  if (msg.type) meta.push(escMd(msg.type))
  if (msg.tags?.length) meta.push(msg.tags.map(t => escMd(`#${t}`)).join(' '))
  lines.push(`\n_${meta.join('  ·  ')}_`)

  // Expiry
  if (msg.expires_at) {
    const inMs = msg.expires_at - Date.now()
    if (inMs > 0) {
      const s = Math.floor(inMs / 1000)
      const human = s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s/60)}m` : s < 86400 ? `${Math.floor(s/3600)}h` : `${Math.floor(s/86400)}d`
      lines.push(`⏱ _expires in ${escMd(human)}_`)
    }
  }

  const text = lines.join('\n')

  // Build inline keyboard button if URL is set
  const reply_markup = msg.url
    ? {
        inline_keyboard: [[{
          text: msg.url_label || '🔗 Open',
          url: msg.url,
        }]],
      }
    : undefined

  const body: Record<string, unknown> = {
    chat_id:    chatId,
    text,
    parse_mode: 'MarkdownV2',
  }
  if (reply_markup) body.reply_markup = reply_markup

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json()
      console.error('[telegram] API error:', err.description)
    } else {
      console.log(`[telegram] sent to chat ${chatId}`)
    }
  } catch (err) {
    console.error('[telegram] fetch error:', err)
  }
}
