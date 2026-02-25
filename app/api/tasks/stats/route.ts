import { NextRequest, NextResponse } from 'next/server'
import { getDailyProgressStats } from '@/lib/services/task.service'
import { auth } from '@/better-auth.config'
import { headers } from 'next/headers'


export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const stats = await getDailyProgressStats(
      session.user.id,
      startDate,
      endDate
    )

    return NextResponse.json({ success: true, data: stats }, { status: 200 })
  } catch (error) {
    console.error('GET /tasks/stats error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}