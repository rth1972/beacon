import { NextRequest } from 'next/server'
import { subDb } from '@/app/db'
import { isAuthorized, isAuthorizedBrowser, unauthorizedResponse } from '@/app/auth'
import { publicKey } from '@/app/vapid'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/subscribe → returns the VAPID public key (no auth needed)
export async function GET() {
  return Response.json({ publicKey })
}

interface SubscribeBody {
  topic: string
  endpoint: string
  p256dh: string
  auth: string
}

// POST /api/subscribe → save a push subscription
export async function POST(req: NextRequest) {
  if (!isAuthorized(req) && !isAuthorizedBrowser(req)) return unauthorizedResponse()

  let body: SubscribeBody
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid JSON' }, { status: 400 })
  }

  if (!body.topic || !body.endpoint || !body.p256dh || !body.auth) {
    return Response.json({ error: 'topic, endpoint, p256dh, and auth are required' }, { status: 400 })
  }

  subDb.upsert({
    id: crypto.randomUUID(),
    topic: body.topic,
    endpoint: body.endpoint,
    p256dh: body.p256dh,
    auth: body.auth,
    created_at: Date.now(),
  })

  return Response.json({ ok: true })
}

// DELETE /api/subscribe → remove a push subscription
export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req) && !isAuthorizedBrowser(req)) return unauthorizedResponse()

  const endpoint = req.nextUrl.searchParams.get('endpoint')
  const topic = req.nextUrl.searchParams.get('topic')

  if (!endpoint || !topic) {
    return Response.json({ error: 'endpoint and topic are required' }, { status: 400 })
  }

  const deleted = subDb.delete(endpoint, topic)
  return Response.json({ ok: true, deleted })
}
