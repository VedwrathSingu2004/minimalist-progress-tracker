import { NextRequest, NextResponse } from 'next/server'
import { getOccurrencesInRange } from '@/lib/services/task.service'
import { auth } from '@/better-auth.config'
import { headers } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const projectId = searchParams.get('projectId')

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 })
    }

    const occurrences = await getOccurrencesInRange(
      session.user.id,
      startDate,
      endDate,
      projectId || undefined
    )

    return NextResponse.json({ success: true, data: occurrences }, { status: 200 })
  } catch (error) {
    console.error('GET /tasks/occurrences error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}