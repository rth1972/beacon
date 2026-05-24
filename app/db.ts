import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_DIR = path.join(process.cwd(), 'data')
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })

const db = new Database(path.join(DB_DIR, 'ntfy.db'))

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id          TEXT PRIMARY KEY,
    topic       TEXT NOT NULL,
    title       TEXT,
    message     TEXT NOT NULL,
    type        TEXT,
    priority    TEXT NOT NULL DEFAULT 'default',
    tags        TEXT NOT NULL DEFAULT '[]',
    url         TEXT,
    url_label   TEXT,
    expires_at  INTEGER,
    timestamp   INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_messages_topic     ON messages(topic);
  CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
  CREATE INDEX IF NOT EXISTS idx_messages_expires   ON messages(expires_at);

  CREATE TABLE IF NOT EXISTS tokens (
    id        TEXT PRIMARY KEY,
    topic     TEXT NOT NULL,
    label     TEXT NOT NULL DEFAULT '',
    token     TEXT NOT NULL,
    permissions TEXT NOT NULL DEFAULT 'write',
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tokens_topic ON tokens(topic);

  CREATE TABLE IF NOT EXISTS topic_settings (
    topic       TEXT PRIMARY KEY,
    retention   INTEGER NOT NULL DEFAULT 0,
    relay_url   TEXT,
    relay_token TEXT,
    created_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id          TEXT PRIMARY KEY,
    topic       TEXT NOT NULL,
    filename    TEXT NOT NULL,
    mimetype    TEXT NOT NULL DEFAULT 'application/octet-stream',
    size        INTEGER NOT NULL,
    data        BLOB NOT NULL,
    timestamp   INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_attachments_topic ON attachments(topic);

  CREATE TABLE IF NOT EXISTS subscriptions (
    id        TEXT PRIMARY KEY,
    topic     TEXT NOT NULL,
    endpoint  TEXT NOT NULL,
    p256dh    TEXT NOT NULL,
    auth      TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_subscriptions_topic ON subscriptions(topic);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_endpoint_topic ON subscriptions(endpoint, topic);
`)

export interface DBMessage {
  id: string
  topic: string
  title?: string
  message: string
  type?: string
  priority: string
  tags: string[]
  url?: string
  url_label?: string
  expires_at?: number
  timestamp: number
}

const insertStmt = db.prepare(`
  INSERT INTO messages (id, topic, title, message, type, priority, tags, url, url_label, expires_at, timestamp)
  VALUES (@id, @topic, @title, @message, @type, @priority, @tags, @url, @url_label, @expires_at, @timestamp)
`)

const getByTopicStmt = db.prepare(`
  SELECT * FROM messages
  WHERE topic = ?
    AND (expires_at IS NULL OR expires_at > ?)
  ORDER BY timestamp DESC
  LIMIT ?
`)

const getSinceStmt = db.prepare(`
  SELECT * FROM messages
  WHERE topic = ?
    AND timestamp > ?
    AND (expires_at IS NULL OR expires_at > ?)
  ORDER BY timestamp ASC
  LIMIT ?
`)

const deleteExpiredStmt = db.prepare(`
  DELETE FROM messages WHERE expires_at IS NOT NULL AND expires_at <= ?
`)

const getTopicsStmt = db.prepare(`
  SELECT DISTINCT topic FROM messages
  WHERE (expires_at IS NULL OR expires_at > ?)
  ORDER BY topic ASC
`)

const getStatsStmt = db.prepare(`
  SELECT
    COUNT(*) as count,
    MAX(timestamp) as last_message
  FROM messages
  WHERE topic = ?
    AND (expires_at IS NULL OR expires_at > ?)
`)

function parseRow(row: any): DBMessage {
  return { ...row, tags: JSON.parse(row.tags ?? '[]') }
}

export const messageDb = {
  insert(msg: DBMessage) {
    insertStmt.run({
      ...msg,
      tags: JSON.stringify(msg.tags ?? []),
      title: msg.title ?? null,
      type: msg.type ?? null,
      url: msg.url ?? null,
      url_label: msg.url_label ?? null,
      expires_at: msg.expires_at ?? null,
    })
  },

  getByTopic(topic: string, limit = 100): DBMessage[] {
    const rows = getByTopicStmt.all(topic, Date.now(), limit) as any[]
    return rows.map(parseRow)
  },

  getSince(topic: string, since: number, limit = 100): DBMessage[] {
    const rows = getSinceStmt.all(topic, since, Date.now(), limit) as any[]
    return rows.map(parseRow)
  },

  getTopics(): string[] {
    const rows = getTopicsStmt.all(Date.now()) as any[]
    return rows.map(r => r.topic)
  },

  getStats(topic: string): { count: number; last_message: number | null } {
    return getStatsStmt.get(topic, Date.now()) as any
  },

  deleteMessage(id: string) {
    const stmt = db.prepare('DELETE FROM messages WHERE id = ?')
    return stmt.run(id).changes
  },

  deleteTopic(topic: string) {
    const stmt = db.prepare('DELETE FROM messages WHERE topic = ?')
    return stmt.run(topic).changes
  },

  purgeExpired() {
    const result = deleteExpiredStmt.run(Date.now())
    return result.changes
  },

  search({ q, topic, type, priority, limit }: { q: string; topic: string; type: string; priority: string; limit: number }): DBMessage[] {
    const conditions: string[] = ['(expires_at IS NULL OR expires_at > ?)']
    const params: any[] = [Date.now()]
    if (q)        { conditions.push('(message LIKE ? OR title LIKE ?)'); params.push(`%${q}%`, `%${q}%`) }
    if (topic)    { conditions.push('topic = ?'); params.push(topic) }
    if (type)     { conditions.push('type = ?'); params.push(type) }
    if (priority) { conditions.push('priority = ?'); params.push(priority) }
    params.push(limit)
    const sql = `SELECT * FROM messages WHERE ${conditions.join(' AND ')} ORDER BY timestamp DESC LIMIT ?`
    const rows = db.prepare(sql).all(...params) as any[]
    return rows.map(parseRow)
  },
}

export interface Subscription {
  id: string
  topic: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: number
}

const insertSubStmt = db.prepare(`
  INSERT OR REPLACE INTO subscriptions (id, topic, endpoint, p256dh, auth, created_at)
  VALUES (@id, @topic, @endpoint, @p256dh, @auth, @created_at)
`)

const deleteSubStmt = db.prepare('DELETE FROM subscriptions WHERE endpoint = ? AND topic = ?')
const getSubsByTopicStmt = db.prepare('SELECT * FROM subscriptions WHERE topic = ?')
const getSubByEndpointStmt = db.prepare('SELECT * FROM subscriptions WHERE endpoint = ? AND topic = ?')

export const subDb = {
  upsert(sub: Subscription) {
    insertSubStmt.run(sub)
  },

  delete(endpoint: string, topic: string) {
    return deleteSubStmt.run(endpoint, topic).changes
  },

  getByTopic(topic: string): Subscription[] {
    return getSubsByTopicStmt.all(topic) as Subscription[]
  },

  getByEndpoint(endpoint: string, topic: string): Subscription | undefined {
    return getSubByEndpointStmt.get(endpoint, topic) as Subscription | undefined
  },
}

export interface Token {
  id: string
  topic: string
  label: string
  token: string
  permissions: string
  created_at: number
}

const insertTokenStmt = db.prepare(`
  INSERT INTO tokens (id, topic, label, token, permissions, created_at)
  VALUES (@id, @topic, @label, @token, @permissions, @created_at)
`)
const deleteTokenStmt = db.prepare('DELETE FROM tokens WHERE id = ?')
const getTokensByTopicStmt = db.prepare('SELECT * FROM tokens WHERE topic = ? ORDER BY created_at ASC')
const getTokenByValueStmt = db.prepare('SELECT * FROM tokens WHERE token = ?')

export const tokenDb = {
  create(t: Token) { insertTokenStmt.run(t) },
  revoke(id: string) { return deleteTokenStmt.run(id).changes },
  getByTopic(topic: string): Token[] { return getTokensByTopicStmt.all(topic) as Token[] },
  findByToken(token: string): Token | undefined { return getTokenByValueStmt.get(token) as Token | undefined },
}

export interface TopicSettings {
  topic: string
  retention: number
  relay_url: string | null
  relay_token: string | null
  created_at: number
}

const upsertSettingsStmt = db.prepare(`
  INSERT OR REPLACE INTO topic_settings (topic, retention, relay_url, relay_token, created_at)
  VALUES (@topic, @retention, @relay_url, @relay_token, @created_at)
`)
const getSettingsStmt = db.prepare('SELECT * FROM topic_settings WHERE topic = ?')

export const settingsDb = {
  upsert(s: TopicSettings) { upsertSettingsStmt.run(s) },
  get(topic: string): TopicSettings | undefined { return getSettingsStmt.get(topic) as TopicSettings | undefined },
}

export interface Attachment {
  id: string
  topic: string
  filename: string
  mimetype: string
  size: number
  timestamp: number
}

const insertAttachmentStmt = db.prepare(`
  INSERT INTO attachments (id, topic, filename, mimetype, size, data, timestamp)
  VALUES (@id, @topic, @filename, @mimetype, @size, @data, @timestamp)
`)
const getAttachmentsByTopicStmt = db.prepare(
  'SELECT id, topic, filename, mimetype, size, timestamp FROM attachments WHERE topic = ? ORDER BY timestamp DESC'
)
const getAttachmentStmt = db.prepare('SELECT * FROM attachments WHERE id = ?')

export const attachmentDb = {
  insert(a: any) { insertAttachmentStmt.run(a) },
  getByTopic(topic: string): Attachment[] { return getAttachmentsByTopicStmt.all(topic) as Attachment[] },
  get(id: string): any { return getAttachmentStmt.get(id) },
}
setInterval(() => {
  const deleted = messageDb.purgeExpired()
  if (deleted > 0) console.log(`[db] purged ${deleted} expired messages`)
}, 10 * 60 * 1000)
