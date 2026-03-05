import { auth } from '@/better-auth.config'
import db from '@/db'
import taskRecurrenceDays from '@/db/schema/models/taskRecurrenceDays.model'
import tasks from '@/db/schema/models/tasks.model'
import { createTask } from '@/lib/services/task.service'
import { and, eq, gte, lte } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, taskType, startDate, endDate, recurrenceDays, projectId } = body

    if (!name || !taskType || !startDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (taskType === 'one_time' && recurrenceDays?.length) {
      return NextResponse.json({ error: 'One‑time tasks cannot have recurrence days' }, { status: 400 })
    }

    if (taskType === 'recurring' && (!recurrenceDays || recurrenceDays.length === 0)) {
      return NextResponse.json({ error: 'Recurring tasks must specify recurrenceDays' }, { status: 400 })
    }

    const taskId = await createTask({
      userId: session.user.id,
      name,
      taskType,
      startDate,
      endDate: endDate || null,
      recurrenceDays,
      projectId,
    })

    return NextResponse.json({ success: true, taskId }, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const projectId = searchParams.get('projectId')
    const taskId = searchParams.get('taskId')

    const conditions = [eq(tasks.userId, session.user.id)]

    if (startDate && endDate) {
      conditions.push(gte(tasks.startDate, startDate), lte(tasks.endDate, endDate))
    } else if (startDate) {
      conditions.push(gte(tasks.startDate, startDate))
    } else if (endDate) {
      conditions.push(lte(tasks.endDate, endDate))
    }

    if (taskId) {
      conditions.push(eq(tasks.id, taskId))
    }

    if (projectId) {
      conditions.push(eq(tasks.projectId, projectId))
    }

    const result = await db
      .select()
      .from(tasks)
      .where(and(...conditions))

    if (taskId) {
      if (result.length === 0) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }

      const task = result[0]

      if (task.taskType === 'recurring') {
        const days = await db
          .select({ dayOfWeek: taskRecurrenceDays.dayOfWeek })
          .from(taskRecurrenceDays)
          .where(eq(taskRecurrenceDays.taskId, task.id))

        return NextResponse.json({
          success: true,
          data: {
            ...task,
            days: days.map(d => d.dayOfWeek),
          },
        })
      }

      return NextResponse.json({
        success: true,
        data: {
          ...task,
          recurrenceDays: [],
        },
      })
    }

    return NextResponse.json({ success: true, data: result }, { status: 200 })
  } catch (error) {
    console.error('GET /tasks error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}