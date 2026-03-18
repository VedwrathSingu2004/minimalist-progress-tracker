import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/better-auth.config'
import { headers } from 'next/headers'
import { getProjectCompletionStats } from '@/lib/services/task.service'

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const stats = await getProjectCompletionStats(
      session.user.id,
      startDate || undefined,
      endDate || undefined
    )

    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    console.error('GET /api/tasks/project-stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}