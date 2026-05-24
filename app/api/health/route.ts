import { messageDb } from '@/app/db'
import { getTopicCount } from '@/app/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const topics = getTopicCount()
    const dbTopics = messageDb.getTopics().length
    return Response.json({
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      topics_live: topics,
      topics_db: dbTopics,
      timestamp: Date.now(),
    })
  } catch (err) {
    return Response.json({ status: 'error', error: String(err) }, { status: 500 })
  }
}
