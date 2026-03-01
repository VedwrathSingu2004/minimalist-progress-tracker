import { auth } from "@/better-auth.config"
import db from "@/db"
import tasks from "@/db/schema/models/tasks.model"
import { deleteTask, updateTask } from "@/lib/services/task.service"
import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { name, endDate, recurrenceDays, projectId } = body

    if (name === undefined && endDate === undefined && recurrenceDays === undefined && projectId === undefined) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const existingTasks = await db
      .select({ taskType: tasks.taskType })
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, session.user.id)))
      .limit(1)

    if (existingTasks.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const currentTaskType = existingTasks[0].taskType

    if (currentTaskType === 'one_time' && recurrenceDays !== undefined) {
      return NextResponse.json({ error: 'Cannot set recurrence days for a one‑time task' }, { status: 400 })
    }

    if (currentTaskType === 'recurring' && recurrenceDays !== undefined && recurrenceDays.length === 0) {
      return NextResponse.json({ error: 'Recurring tasks must have at least one recurrence day' }, { status: 400 })
    }

    await updateTask({
      id,
      userId: session.user.id,
      name,
      endDate,
      recurrenceDays,
      projectId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    await deleteTask({ id, userId: session.user.id })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    if (error instanceof Error && error.message === 'Task not found or access denied') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}