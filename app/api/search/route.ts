import { NextRequest } from 'next/server'
import { isAuthorized, isAuthorizedBrowser, unauthorizedResponse } from '@/app/auth'
import { messageDb } from '@/app/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/search?q=text&topic=foo&type=error&priority=high&limit=50
export async function GET(req: NextRequest) {
  if (!isAuthorized(req) && !isAuthorizedBrowser(req)) return unauthorizedResponse()

  const { searchParams } = req.nextUrl
  const q        = searchParams.get('q')?.trim() ?? ''
  const topic    = searchParams.get('topic')?.trim() ?? ''
  const type     = searchParams.get('type')?.trim() ?? ''
  const priority = searchParams.get('priority')?.trim() ?? ''
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)

  const messages = messageDb.search({ q, topic, type, priority, limit })
  return Response.json({ messages, count: messages.length })
}
