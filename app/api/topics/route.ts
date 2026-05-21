import { NextRequest } from 'next/server'
import { subscribeTopicList, unsubscribeTopicList } from '@/app/store'
import { messageDb } from '@/app/db'
import { isAuthorized, isAuthorizedBrowser } from '@/app/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/topics          → SSE stream of topic list updates
// GET /api/topics?list=1   → REST: return topic list + stats as JSON
export async function GET(req: NextRequest) {
  if (!isAuthorized(req) && !isAuthorizedBrowser(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (req.nextUrl.searchParams.get('list') === '1') {
    const topics = messageDb.getTopics()
    const withStats = topics.map(topic => ({
      topic,
      ...messageDb.getStats(topic),
    }))
    return Response.json({ topics: withStats })
  }

  const stream = new ReadableStream<string>({
    start(ctrl) {
      subscribeTopicList(ctrl)

      const keepalive = setInterval(() => {
        try { ctrl.enqueue(': keepalive\n\n') }
        catch { clearInterval(keepalive) }
      }, 25_000)

      req.signal.addEventListener('abort', () => {
        clearInterval(keepalive)
        unsubscribeTopicList(ctrl)
        try { ctrl.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
