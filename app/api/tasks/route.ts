import { auth } from "@/better-auth.config"
import db from "@/db"
import tasks from "@/db/schema/models/tasks.model"
import { createTask } from "@/lib/services/task.service"
import { and, gte, lte } from "drizzle-orm"
import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const body = await request.json()
    const { name, taskType, startDate, endDate, recurrenceDays } = body

    if (!name || !taskType || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (taskType === 'one_time' && recurrenceDays?.length) {
      return NextResponse.json(
        { error: 'One‑time tasks cannot have recurrence days' },
        { status: 400 }
      )
    }

    if (taskType === 'recurring' && (!recurrenceDays || recurrenceDays.length === 0)) {
      return NextResponse.json(
        { error: 'Recurring tasks must specify recurrenceDays' },
        { status: 400 }
      )
    }

    const taskId = await createTask({
      userId: session.user.id,
      name,
      taskType,
      startDate,
      endDate: endDate || null,
      recurrenceDays,
    })

    return NextResponse.json({ success: true, taskId }, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    let result

    if (startDate && endDate) {
      result = await db
        .select()
        .from(tasks)
        .where(
          and(
            gte(tasks.startDate, startDate),
            lte(tasks.endDate, endDate)
          )
        )
    } 
    else if (startDate) {
      result = await db
        .select()
        .from(tasks)
        .where(gte(tasks.startDate, startDate))
    }
    else if (endDate) {
      result = await db
        .select()
        .from(tasks)
        .where(lte(tasks.endDate, endDate))
    }
    else {
      result = await db.select().from(tasks)
    }

    return NextResponse.json(
      { success: true, data: result },
      { status: 200 }
    )
  } catch (error) {
    console.error("GET /tasks error:", error)

    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    )
  }
}