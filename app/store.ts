/**
 * In-memory pub/sub store.
 * Handles live SSE fan-out; persistence is handled by app/db.ts
 */

type Controller = ReadableStreamDefaultController<string>

const topics = new Map<string, Set<Controller>>()
const topicListeners = new Set<Controller>()

function broadcastTopicList() {
  const list = getTopicNames()
  const data = `data: ${JSON.stringify(list)}\n\n`
  topicListeners.forEach((ctrl) => {
    try { ctrl.enqueue(data) }
    catch { topicListeners.delete(ctrl) }
  })
}

export function subscribeTopicList(ctrl: Controller) {
  topicListeners.add(ctrl)
  ctrl.enqueue(`data: ${JSON.stringify(getTopicNames())}\n\n`)
}

export function unsubscribeTopicList(ctrl: Controller) {
  topicListeners.delete(ctrl)
}

export function subscribe(topic: string, ctrl: Controller) {
  const isNew = !topics.has(topic)
  if (isNew) topics.set(topic, new Set())
  topics.get(topic)!.add(ctrl)
  if (isNew) broadcastTopicList()
}

export function unsubscribe(topic: string, ctrl: Controller) {
  topics.get(topic)?.delete(ctrl)
  if (topics.get(topic)?.size === 0) {
    topics.delete(topic)
    broadcastTopicList()
  }
}

export function publish(topic: string, message: NotifyMessage): number {
  if (!topics.has(topic)) {
    topics.set(topic, new Set())
    broadcastTopicList()
  }
  const subs = topics.get(topic)!
  if (subs.size === 0) return 0
  const data = `data: ${JSON.stringify(message)}\n\n`
  subs.forEach((ctrl) => {
    try { ctrl.enqueue(data) }
    catch { subs.delete(ctrl) }
  })
  return subs.size
}

export function getTopicNames(): string[] {
  return Array.from(topics.keys()).sort()
}

export function getTopicCount(): number {
  return topics.size
}

export function getSubscriberCount(topic: string): number {
  return topics.get(topic)?.size ?? 0
}

export type MessageType = 'info' | 'success' | 'warning' | 'error'

export interface NotifyMessage {
  id: string
  topic: string
  title?: string
  message: string
  type?: MessageType
  priority?: 'low' | 'default' | 'high' | 'urgent'
  tags?: string[]
  url?: string
  url_label?: string
  expires_at?: number
  ttl?: number
  actions?: NotificationAction[]
  attachment?: { id: string; filename: string; mimetype: string; size: number }
  timestamp: number
}

export interface NotificationAction {
  action: 'view' | 'http'
  label: string
  url: string
}
