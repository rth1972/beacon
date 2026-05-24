import { NextRequest } from 'next/server'
import { isAuthorized, unauthorizedResponse } from '@/app/auth'
import { scheduledDb } from '@/app/scheduler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/scheduled — list pending scheduled messages
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorizedResponse()
  const pending = scheduledDb.listPending().map(m => ({
    ...m,
    payload: JSON.parse(m.payload),
    send_at_iso: new Date(m.send_at).toISOString(),
  }))
  return Response.json({ scheduled: pending })
}

// DELETE /api/scheduled?id=xxx — cancel a scheduled message
export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorizedResponse()
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return Response.json({ error: 'id is required' }, { status: 400 })
  const deleted = scheduledDb.delete(id)
  if (!deleted) return Response.json({ error: 'not found or already sent' }, { status: 404 })
  return Response.json({ ok: true })
}
