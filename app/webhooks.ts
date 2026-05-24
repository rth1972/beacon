/**
 * Webhook store — persists outgoing webhook configs in SQLite.
 * Each webhook fires when a message is published to its topic.
 */

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

const DB_DIR = path.join(process.cwd(), 'data')
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })

const db = new Database(path.join(DB_DIR, 'ntfy.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS webhooks (
    id          TEXT PRIMARY KEY,
    topic       TEXT NOT NULL,
    url         TEXT NOT NULL,
    label       TEXT,
    secret      TEXT,
    enabled     INTEGER NOT NULL DEFAULT 1,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_webhooks_topic ON webhooks(topic);
`)

export interface Webhook {
  id: string
  topic: string
  url: string
  label?: string
  secret?: string
  enabled: boolean
  created_at: number
}

const insertWebhook = db.prepare(`
  INSERT INTO webhooks (id, topic, url, label, secret, enabled, created_at)
  VALUES (@id, @topic, @url, @label, @secret, @enabled, @created_at)
`)
const listWebhooks   = db.prepare(`SELECT * FROM webhooks WHERE topic = ? ORDER BY created_at DESC`)
const listAllWebhooks = db.prepare(`SELECT * FROM webhooks ORDER BY topic, created_at DESC`)
const deleteWebhook  = db.prepare(`DELETE FROM webhooks WHERE id = ?`)
const toggleWebhook  = db.prepare(`UPDATE webhooks SET enabled = ? WHERE id = ?`)

function parseWebhook(row: any): Webhook {
  return { ...row, enabled: Boolean(row.enabled) }
}

export const webhookDb = {
  add(topic: string, url: string, label?: string, secret?: string): Webhook {
    const wh: Webhook = {
      id: crypto.randomUUID(),
      topic,
      url,
      label,
      secret,
      enabled: true,
      created_at: Date.now(),
    }
    insertWebhook.run({ ...wh, label: label ?? null, secret: secret ?? null, enabled: 1 })
    return wh
  },

  list(topic: string): Webhook[] {
    return (listWebhooks.all(topic) as any[]).map(parseWebhook)
  },

  listAll(): Webhook[] {
    return (listAllWebhooks.all() as any[]).map(parseWebhook)
  },

  delete(id: string): boolean {
    return deleteWebhook.run(id).changes > 0
  },

  toggle(id: string, enabled: boolean): boolean {
    return toggleWebhook.run(enabled ? 1 : 0, id).changes > 0
  },
}

export async function fireWebhooks(topic: string, msg: object): Promise<void> {
  const hooks = webhookDb.list(topic).filter(h => h.enabled)
  if (!hooks.length) return

  const body = JSON.stringify(msg)

  await Promise.allSettled(
    hooks.map(async (hook) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Beacon/1.0',
        'X-Beacon-Topic': topic,
      }

      // HMAC signature if secret is set
      if (hook.secret) {
        const sig = crypto
          .createHmac('sha256', hook.secret)
          .update(body)
          .digest('hex')
        headers['X-Beacon-Signature'] = `sha256=${sig}`
      }

      try {
        const res = await fetch(hook.url, { method: 'POST', headers, body })
        if (!res.ok) {
          console.warn(`[webhook] ${hook.url} responded ${res.status}`)
        } else {
          console.log(`[webhook] fired → ${hook.url} (${res.status})`)
        }
      } catch (err) {
        console.error(`[webhook] failed → ${hook.url}:`, err)
      }
    })
  )
}
