import { NextResponse } from 'next/server'
import { toggleOccurrence } from '@/lib/services/task.service'

const HARDCODED_USER_ID = 'c5520625-cb6d-4afa-b212-ceab7b17ce6f'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const occurrenceId = id

    const updatedOccurrence = await toggleOccurrence(occurrenceId, HARDCODED_USER_ID)

    return NextResponse.json({ success: true, data: updatedOccurrence })
  } catch (error) {
    console.error('Error toggling occurrence:', error)
    if (error instanceof Error && error.message === 'Occurrence not found or access denied') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}