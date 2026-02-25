import { NextResponse } from 'next/server'
import { getTodayTasks } from '@/lib/services/task.service'
import { auth } from '@/better-auth.config'
import { headers } from 'next/headers'

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tasks = await getTodayTasks(session.user.id)
    return NextResponse.json({ success: true, data: tasks }, { status: 200 })
  } catch (error) {
    console.error('GET /tasks/today error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}