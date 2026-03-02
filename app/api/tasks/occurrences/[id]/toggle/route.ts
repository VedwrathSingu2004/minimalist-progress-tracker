import { NextResponse } from 'next/server'
import { toggleOccurrence } from '@/lib/services/task.service'
import { auth } from '@/better-auth.config'
import { headers } from 'next/headers'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await params
    const occurrenceId = id

    const updatedOccurrence = await toggleOccurrence(occurrenceId, session.user.id)

    return NextResponse.json({ success: true, data: updatedOccurrence }, { status: 302 })
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