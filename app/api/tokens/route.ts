import { NextRequest } from 'next/server'
import { tokenDb } from '@/app/db'
import { isAuthorized, unauthorizedResponse } from '@/app/auth'

export const runtime = 'nodejs'

function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let t = ''
  for (let i = 0; i < 24; i++) t += chars[Math.floor(Math.random() * chars.length)]
  return 't_' + t
}

// GET /api/tokens?topic=xxx
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorizedResponse()
  const topic = req.nextUrl.searchParams.get('topic')
  if (!topic) return Response.json({ error: 'topic required' }, { status: 400 })
  const tokens = tokenDb.getByTopic(topic).map(t => ({ ...t, token: t.token.slice(0, 8) + '…' }))
  return Response.json({ tokens })
}

// POST /api/tokens  { topic, label, permissions }
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorizedResponse()
  const { topic, label, permissions } = await req.json()
  if (!topic) return Response.json({ error: 'topic required' }, { status: 400 })

  const id = crypto.randomUUID()
  const token = generateToken()
  tokenDb.create({ id, topic, label: label || '', token, permissions: permissions || 'write', created_at: Date.now() })
  return Response.json({ ok: true, id, token, label, permissions })
}

// DELETE /api/tokens?id=xxx
export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorizedResponse()
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })
  tokenDb.revoke(id)
  return Response.json({ ok: true })
}
