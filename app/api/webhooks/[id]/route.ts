import { NextRequest } from 'next/server'
import { webhookDb } from '@/app/webhooks'
import { isAuthorized, unauthorizedResponse } from '@/app/auth'

export const runtime = 'nodejs'

// DELETE /api/webhooks/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorized(req)) return unauthorizedResponse()
  const { id } = await params
  const deleted = webhookDb.delete(id)
  if (!deleted) return Response.json({ error: 'not found' }, { status: 404 })
  return Response.json({ ok: true })
}

// PATCH /api/webhooks/[id] — toggle enabled
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorized(req)) return unauthorizedResponse()
  const { id } = await params
  const { enabled } = await req.json()
  const updated = webhookDb.toggle(id, Boolean(enabled))
  if (!updated) return Response.json({ error: 'not found' }, { status: 404 })
  return Response.json({ ok: true })
}
