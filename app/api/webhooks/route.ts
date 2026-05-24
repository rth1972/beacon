import { NextRequest } from 'next/server'
import { webhookDb } from '@/app/webhooks'
import { isAuthorized, unauthorizedResponse } from '@/app/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/webhooks — list all webhooks
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorizedResponse()
  const webhooks = webhookDb.listAll()
  return Response.json({ webhooks })
}

// POST /api/webhooks — create a webhook
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorizedResponse()
  const body = await req.json()
  const { topic, url, label, secret } = body

  if (!topic?.trim()) return Response.json({ error: 'topic is required' }, { status: 400 })
  if (!url?.trim())   return Response.json({ error: 'url is required' }, { status: 400 })

  try { new URL(url) } catch {
    return Response.json({ error: 'url must be a valid URL' }, { status: 400 })
  }

  const webhook = webhookDb.add(topic.trim(), url.trim(), label?.trim(), secret?.trim())
  return Response.json({ ok: true, webhook }, { status: 201 })
}
