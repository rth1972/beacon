/**
 * Scheduled messages — stored in SQLite, fired by a background interval.
 */
import Database from 'better-sqlite3'
import path from 'path'

const db = new Database(path.join(process.cwd(), 'data', 'ntfy.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS scheduled (
    id          TEXT PRIMARY KEY,
    topic       TEXT NOT NULL,
    payload     TEXT NOT NULL,
    send_at     INTEGER NOT NULL,
    sent        INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_scheduled_send_at ON scheduled(send_at);
  CREATE INDEX IF NOT EXISTS idx_scheduled_sent    ON scheduled(sent);
`)

const insertScheduled = db.prepare(`
  INSERT INTO scheduled (id, topic, payload, send_at, sent, created_at)
  VALUES (@id, @topic, @payload, @send_at, 0, @created_at)
`)
const getDueScheduled = db.prepare(`
  SELECT * FROM scheduled WHERE sent = 0 AND send_at <= ? ORDER BY send_at ASC LIMIT 50
`)
const markSent = db.prepare(`UPDATE scheduled SET sent = 1 WHERE id = ?`)
const listPending = db.prepare(`
  SELECT id, topic, payload, send_at, created_at FROM scheduled WHERE sent = 0 ORDER BY send_at ASC
`)
const deleteScheduled = db.prepare(`DELETE FROM scheduled WHERE id = ? AND sent = 0`)

export interface ScheduledMessage {
  id: string
  topic: string
  payload: string // JSON of NotifyMessage body
  send_at: number
  created_at: number
}

export const scheduledDb = {
  add(msg: ScheduledMessage) {
    insertScheduled.run(msg)
  },
  getDue(): ScheduledMessage[] {
    return getDueScheduled.all(Date.now()) as ScheduledMessage[]
  },
  markSent(id: string) {
    markSent.run(id)
  },
  listPending(): ScheduledMessage[] {
    return listPending.all() as ScheduledMessage[]
  },
  delete(id: string): boolean {
    return deleteScheduled.run(id).changes > 0
  },
}

// Background runner — checks every 30s
let schedulerStarted = false

export function startScheduler(
  onFire: (topic: string, payload: any) => Promise<void>
) {
  if (schedulerStarted) return
  schedulerStarted = true

  async function tick() {
    const due = scheduledDb.getDue()
    for (const item of due) {
      try {
        const payload = JSON.parse(item.payload)
        await onFire(item.topic, payload)
        scheduledDb.markSent(item.id)
        console.log(`[scheduler] fired ${item.id} → ${item.topic}`)
      } catch (err) {
        console.error(`[scheduler] failed ${item.id}:`, err)
      }
    }
  }

  // Run immediately then every 30s
  tick()
  setInterval(tick, 30_000)
  console.log('[scheduler] started')
}
