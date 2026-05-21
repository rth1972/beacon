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
}

// Purge expired messages every 10 minutes
setInterval(() => {
  const deleted = messageDb.purgeExpired()
  if (deleted > 0) console.log(`[db] purged ${deleted} expired messages`)
}, 10 * 60 * 1000)
