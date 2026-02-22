import db from "@/db"
import tasks from "@/db/schema/models/tasks.model"
import { updateTask } from "@/lib/services/task.service"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

const HARDCODED_USER_ID = 'c5520625-cb6d-4afa-b212-ceab7b17ce6f'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const taskId = id
    const body = await request.json()
    const { name, endDate, recurrenceDays } = body

    // Validate at least one field
    if (name === undefined && endDate === undefined && recurrenceDays === undefined) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Fetch current task to check its type
    const existingTasks = await db
      .select({ taskType: tasks.taskType })
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, HARDCODED_USER_ID)))
      .limit(1)

      console.log(existingTasks)

    if (existingTasks.length === 0) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    const currentTaskType = existingTasks[0].taskType

    // Prevent adding recurrenceDays to a one‑time task
    if (currentTaskType === 'one_time' && recurrenceDays !== undefined) {
      return NextResponse.json(
        { error: 'Cannot set recurrence days for a one‑time task' },
        { status: 400 }
      )
    }

    // For recurring tasks, recurrenceDays must be non‑empty if provided
    if (
      currentTaskType === 'recurring' &&
      recurrenceDays !== undefined &&
      recurrenceDays.length === 0
    ) {
      return NextResponse.json(
        { error: 'Recurring tasks must have at least one recurrence day' },
        { status: 400 }
      )
    }

    await updateTask({
      id: taskId,
      userId: HARDCODED_USER_ID,
      name,
      endDate,
      recurrenceDays
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}