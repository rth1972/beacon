import { NextRequest } from 'next/server'
import { settingsDb } from '@/app/db'
import { isAuthorized, unauthorizedResponse } from '@/app/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ topic: string }> }
) {
  const { topic } = await context.params
  const settings = settingsDb.get(topic)
  return Response.json({ settings: settings ?? null })
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ topic: string }> }
) {
  if (!isAuthorized(req)) return unauthorizedResponse()
  const { topic } = await context.params
  const body = await req.json()
  settingsDb.upsert({
    topic,
    retention: body.retention ?? 0,
    relay_url: body.relay_url ?? null,
    relay_token: body.relay_token ?? null,
    created_at: Date.now(),
  })
  return Response.json({ ok: true })
}
