import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/better-auth.config'
import { headers } from 'next/headers'
import { getHeatmapData } from '@/lib/services/task.service'

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const yearParam = searchParams.get('year')
    const projectId = searchParams.get('projectId')

    const year = yearParam ? parseInt(yearParam) : undefined

    const data = await getHeatmapData(
      session.user.id,
      year,
      projectId || undefined
    )

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('GET /api/tasks/heatmap error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}