import db from '@/db'
import tasks from '@/db/schema/models/tasks.model'
import taskRecurrenceDays from '@/db/schema/models/taskRecurrenceDays.model'
import taskOccurrences from '@/db/schema/models/taskOccurences.model'
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'

// Helper: get today's date as YYYY-MM-DD (UTC)
function getTodayString(): string {
  const d = new Date()
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper: convert YYYY-MM-DD to a Date object at UTC midnight
function dateFromString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

// Helper: generate occurrence objects for a date range (inclusive)
function generateOccurrences(
  taskId: string,
  startStr: string,
  endStr: string,
  recurrenceDays: Set<number>
): { taskId: string; date: string; completed: boolean }[] {
  const occurrences = []
  const start = dateFromString(startStr)
  const end = dateFromString(endStr)
  const current = new Date(start)

  while (current <= end) {
    if (recurrenceDays.has(current.getUTCDay())) {
      const year = current.getUTCFullYear()
      const month = String(current.getUTCMonth() + 1).padStart(2, '0')
      const day = String(current.getUTCDate()).padStart(2, '0')
      occurrences.push({
        taskId,
        date: `${year}-${month}-${day}`,
        completed: false,
      })
    }
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return occurrences
}

// Helper: Adding months
function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setUTCMonth(result.getUTCMonth() + months)
  return result
}

export interface ICreateTask {
  userId: string
  name: string
  taskType: 'recurring' | 'one_time'
  startDate: string
  endDate?: string | null
  recurrenceDays?: number[]
}

export async function createTask(input: ICreateTask) {
  const { userId, name, taskType, startDate, endDate, recurrenceDays = [] } = input

  if (taskType === 'recurring' && recurrenceDays.length === 0) {
    throw new Error('Recurring tasks must have at least one recurrence day')
  }

  return await db.transaction(async (tx) => {
    const [newTask] = await tx
      .insert(tasks)
      .values({
        userId,
        name,
        taskType,
        startDate,
        endDate: taskType === 'one_time' ? startDate : endDate,
      })
      .returning({ id: tasks.id })

    const taskId = newTask.id

    if (taskType === 'recurring' && recurrenceDays.length > 0) {
      const daysToInsert = recurrenceDays.map((day) => ({
        taskId,
        dayOfWeek: day,
      }))
      await tx.insert(taskRecurrenceDays).values(daysToInsert)
    }

    const todayStr = getTodayString()
    const recurrenceSet = new Set(recurrenceDays)
    const occurrencesToInsert: { taskId: string; date: string; completed: boolean }[] = []

    if (taskType === 'one_time') {
      occurrencesToInsert.push({ taskId, date: startDate, completed: false })
    } else {
      if (startDate < todayStr) {
        const yesterdayDate = new Date(dateFromString(todayStr))
        yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1)
        const yesterdayStr = yesterdayDate.toISOString().split('T')[0]
        const pastEndStr = endDate && endDate < yesterdayStr ? endDate : yesterdayStr

        if (startDate <= pastEndStr) {
          const pastOccurrences = generateOccurrences(taskId, startDate, pastEndStr, recurrenceSet)
          occurrencesToInsert.push(...pastOccurrences)
        }
      }

      const futureStart = startDate > todayStr ? startDate : todayStr
      const twoMonthsFromNow = addMonths(dateFromString(todayStr), 2)
      const twoMonthsStr = twoMonthsFromNow.toISOString().split('T')[0]

      let futureEndStr: string
      if (endDate && endDate < twoMonthsStr) {
        futureEndStr = endDate
      } else {
        futureEndStr = twoMonthsStr
      }

      if (futureStart <= futureEndStr) {
        const futureOccurrences = generateOccurrences(taskId, futureStart, futureEndStr, recurrenceSet)
        occurrencesToInsert.push(...futureOccurrences)
      }
    }

    if (occurrencesToInsert.length > 0) {
      await tx.insert(taskOccurrences).values(occurrencesToInsert)
    }

    return taskId
  })
}

export interface IUpdateTask {
  id: string
  userId: string
  name?: string
  endDate?: string | null
  recurrenceDays?: number[]
}

export async function updateTask(input: IUpdateTask) {
  const { id, userId, name, endDate, recurrenceDays } = input

  const existingTasks = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .limit(1)

  if (existingTasks.length === 0) {
    throw new Error('Task not found')
  }

  const existingTask = existingTasks[0]

  return await db.transaction(async (tx) => {
    const updateData: Partial<typeof tasks.$inferInsert> = {}
    if (name !== undefined) updateData.name = name
    if (endDate !== undefined) updateData.endDate = endDate

    if (Object.keys(updateData).length > 0) {
      await tx
        .update(tasks)
        .set(updateData)
        .where(eq(tasks.id, id))
    }

    if (recurrenceDays !== undefined) {
      await tx
        .delete(taskRecurrenceDays)
        .where(eq(taskRecurrenceDays.taskId, id))

      if (recurrenceDays.length > 0) {
        const daysToInsert = recurrenceDays.map(day => ({
          taskId: id,
          dayOfWeek: day
        }))
        await tx.insert(taskRecurrenceDays).values(daysToInsert)
      }

      const todayStr = getTodayString()

      await tx
        .delete(taskOccurrences)
        .where(
          and(
            eq(taskOccurrences.taskId, id),
            gte(taskOccurrences.date, todayStr)
          )
        )

      const finalEndDate = endDate !== undefined ? endDate : existingTask.endDate
      const recurrenceSet = new Set(recurrenceDays)

      const oneYearFromNow = new Date(dateFromString(todayStr))
      oneYearFromNow.setUTCFullYear(oneYearFromNow.getUTCFullYear() + 1)
      const oneYearStr = oneYearFromNow.toISOString().split('T')[0]

      let generationEndStr: string
      if (finalEndDate && finalEndDate < oneYearStr) {
        generationEndStr = finalEndDate
      } else {
        generationEndStr = oneYearStr
      }

      if (todayStr <= generationEndStr) {
        const newOccurrences = generateOccurrences(
          id,
          todayStr,
          generationEndStr,
          recurrenceSet
        )
        if (newOccurrences.length > 0) {
          await tx.insert(taskOccurrences).values(newOccurrences)
        }
      }
    }

    return { success: true }
  })
}

export interface IDeleteTask {
  id: string
  userId: string
}

export async function deleteTask(input: IDeleteTask) {
  const { id, userId } = input

  // Verifying task exists and belongs to user
  const existingTasks = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .limit(1)

  if (existingTasks.length === 0) {
    throw new Error('Task not found or access denied')
  }

  // Deleting the task – ON DELETE CASCADE handles related tables
  await db.delete(tasks).where(eq(tasks.id, id))

  return { success: true }
}

export async function ensureOccurrencesForRange(
  userId: string,
  rangeStart: string,
  rangeEnd: string
) {
  // Getting all recurring tasks for this user
  const userTasks = await db
    .select({
      id: tasks.id,
      startDate: tasks.startDate,
      endDate: tasks.endDate,
    })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.taskType, 'recurring')))

  for (const task of userTasks) {
    // Finding the latest generated occurrence for this task (if any)
    const latestOccurrence = await db
      .select({ date: taskOccurrences.date })
      .from(taskOccurrences)
      .where(eq(taskOccurrences.taskId, task.id))
      .orderBy(desc(taskOccurrences.date))
      .limit(1)

    // If no occurrences yet, start from task.startDate
    const lastGeneratedDate = latestOccurrence[0]?.date || task.startDate

    // Determine the task's effective end (or infinity)
    const taskEnd = task.endDate || '9999-12-31'

    // We need to generate from the day after lastGeneratedDate up to rangeEnd,
    // but only if that interval intersects with the requested range and is not already generated.
    // However, there might be gaps before lastGeneratedDate? No, because we generate sequentially,
    // so lastGeneratedDate is the maximum date we have. We need to generate from max(lastGeneratedDate+1, rangeStart) to rangeEnd.

    const dayAfterLast = new Date(dateFromString(lastGeneratedDate))
    dayAfterLast.setUTCDate(dayAfterLast.getUTCDate() + 1)
    const dayAfterStr = dayAfterLast.toISOString().split('T')[0]

    let generationStart = rangeStart > dayAfterStr ? rangeStart : dayAfterStr
    let generationEnd = rangeEnd < taskEnd ? rangeEnd : taskEnd

    if (generationStart > generationEnd) continue

    // Fetch recurrence days for this task
    const recurrenceRows = await db
      .select({ dayOfWeek: taskRecurrenceDays.dayOfWeek })
      .from(taskRecurrenceDays)
      .where(eq(taskRecurrenceDays.taskId, task.id))

    if (recurrenceRows.length === 0) continue // should not happen for recurring tasks

    const recurrenceSet = new Set(recurrenceRows.map(r => r.dayOfWeek))

    // Generate missing occurrences
    const newOccurrences = generateOccurrences(
      task.id,
      generationStart,
      generationEnd,
      recurrenceSet
    )

    if (newOccurrences.length > 0) {
      await db.insert(taskOccurrences).values(newOccurrences)
    }
  }
}

export async function getTodayTasks(userId: string) {
  const todayStr = getTodayString()

  const results = await db
    .select({
      occurrenceId: taskOccurrences.id,
      taskId: tasks.id,
      taskName: tasks.name,
      taskType: tasks.taskType,
      date: taskOccurrences.date,
      completed: taskOccurrences.completed,
    })
    .from(taskOccurrences)
    .innerJoin(tasks, eq(tasks.id, taskOccurrences.taskId))
    .where(
      and(
        eq(tasks.userId, userId),
        eq(taskOccurrences.date, todayStr)
      )
    )
    .orderBy(tasks.name)

  return results
}

export async function getOccurrencesInRange(
  userId: string,
  startDate: string,
  endDate: string
) {
  await ensureOccurrencesForRange(userId, startDate, endDate)

  const results = await db
    .select({
      occurrenceId: taskOccurrences.id,
      taskId: tasks.id,
      taskName: tasks.name,
      date: taskOccurrences.date,
      completed: taskOccurrences.completed,
    })
    .from(taskOccurrences)
    .innerJoin(tasks, eq(tasks.id, taskOccurrences.taskId))
    .where(
      and(
        eq(tasks.userId, userId),
        gte(taskOccurrences.date, startDate),
        lte(taskOccurrences.date, endDate)
      )
    )
    .orderBy(taskOccurrences.date, tasks.name)

  return results
}

export async function getDailyProgressStats(
  userId: string,
  startDate: string,
  endDate: string
) {
  await ensureOccurrencesForRange(userId, startDate, endDate)

  const dateSeries = sql<{ date: string }>`
    SELECT generate_series(${startDate}::date, ${endDate}::date, '1 day') AS date
  `

  const dailyStats = db
    .select({
      date: taskOccurrences.date,
      totalTasks: sql<number>`count(*)`.as('total_tasks'),
      completedTasks: sql<number>`sum(case when ${taskOccurrences.completed} then 1 else 0 end)`.as('completed_tasks'),
    })
    .from(taskOccurrences)
    .innerJoin(tasks, eq(tasks.id, taskOccurrences.taskId))
    .where(
      and(
        eq(tasks.userId, userId),
        gte(taskOccurrences.date, startDate),
        lte(taskOccurrences.date, endDate)
      )
    )
    .groupBy(taskOccurrences.date)
    .as('daily_stats')

  const result = await db
    .select({
      date: sql<string>`date_series.date`,
      totalTasks: sql<number>`coalesce(${dailyStats.totalTasks}, 0)`,
      completedTasks: sql<number>`coalesce(${dailyStats.completedTasks}, 0)`,
      progressPercent: sql<number>`
        coalesce(
          (${dailyStats.completedTasks} * 100.0) / nullif(${dailyStats.totalTasks}, 0),
          0
        )
      `,
    })
    .from(sql`(${dateSeries}) as date_series`)
    .leftJoin(dailyStats, sql`date_series.date = ${dailyStats.date}`)
    .orderBy(sql`date_series.date`)

  return result
}