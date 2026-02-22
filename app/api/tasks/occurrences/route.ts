import { NextRequest, NextResponse } from 'next/server'
import { getOccurrencesInRange } from '@/lib/services/task.service'

const HARDCODED_USER_ID = 'c5520625-cb6d-4afa-b212-ceab7b17ce6f'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const occurrences = await getOccurrencesInRange(
      HARDCODED_USER_ID,
      startDate,
      endDate
    )

    return NextResponse.json({ success: true, data: occurrences }, { status: 200 })
  } catch (error) {
    console.error('GET /tasks/occurrences error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}