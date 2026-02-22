import { NextResponse } from 'next/server'
import { getTodayTasks } from '@/lib/services/task.service'

const HARDCODED_USER_ID = 'c5520625-cb6d-4afa-b212-ceab7b17ce6f'

export async function GET() {
  try {
    const tasks = await getTodayTasks(HARDCODED_USER_ID)
    return NextResponse.json({ success: true, data: tasks }, { status: 200 })
  } catch (error) {
    console.error('GET /tasks/today error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}