import db from '@/db'
import tasks from '@/db/schema/models/tasks.model'
import projects from '@/db/schema/models/projects.model'
import taskRecurrenceDays from '@/db/schema/models/taskRecurrenceDays.model'
import taskOccurrences from '@/db/schema/models/taskOccurences.model'
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'

function getTodayString(): string {
  const d = new Date()
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateFromString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

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
  projectId?: string | null               // <-- new field
}

export async function createTask(input: ICreateTask) {
  const { userId, name, taskType, startDate, endDate, recurrenceDays = [], projectId } = input

  if (taskType === 'recurring' && recurrenceDays.length === 0) {
    throw new Error('Recurring tasks must have at least one recurrence day')
  }

  if (projectId) {
    const project = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1)
    if (project.length === 0) {
      throw new Error('Project not found or access denied')
    }
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
        projectId,                         // <-- insert projectId
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
  startDate?: string | null
  endDate?: string | null
  recurrenceDays?: number[]
  projectId?: string | null
}

export async function updateTask(input: IUpdateTask) {
  const { id, userId, name, startDate, endDate, recurrenceDays, projectId } = input

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
    if (startDate !== undefined && startDate !== null) {
      updateData.startDate = startDate
    }
    if (endDate !== undefined) updateData.endDate = endDate
    if (projectId !== undefined) updateData.projectId = projectId

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

      const twoMonthsFromNow = addMonths(dateFromString(todayStr), 2)
      const twoMonthsStr = twoMonthsFromNow.toISOString().split('T')[0]

      let generationEndStr: string
      if (finalEndDate && finalEndDate < twoMonthsStr) {
        generationEndStr = finalEndDate
      } else {
        generationEndStr = twoMonthsStr
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

  const existingTasks = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .limit(1)

  if (existingTasks.length === 0) {
    throw new Error('Task not found or access denied')
  }

  await db.delete(tasks).where(eq(tasks.id, id))

  return { success: true }
}

export async function ensureOccurrencesForRange(
  userId: string,
  rangeStart: string,
  rangeEnd: string
) {
  const userTasks = await db
    .select({
      id: tasks.id,
      startDate: tasks.startDate,
      endDate: tasks.endDate,
    })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.taskType, 'recurring')))

  for (const task of userTasks) {
    const latestOccurrence = await db
      .select({ date: taskOccurrences.date })
      .from(taskOccurrences)
      .where(eq(taskOccurrences.taskId, task.id))
      .orderBy(desc(taskOccurrences.date))
      .limit(1)

    const lastGeneratedDate = latestOccurrence[0]?.date || task.startDate
    const taskEnd = task.endDate || '9999-12-31'

    const dayAfterLast = new Date(dateFromString(lastGeneratedDate))
    dayAfterLast.setUTCDate(dayAfterLast.getUTCDate() + 1)
    const dayAfterStr = dayAfterLast.toISOString().split('T')[0]

    let generationStart = rangeStart > dayAfterStr ? rangeStart : dayAfterStr
    let generationEnd = rangeEnd < taskEnd ? rangeEnd : taskEnd

    if (generationStart > generationEnd) continue

    const recurrenceRows = await db
      .select({ dayOfWeek: taskRecurrenceDays.dayOfWeek })
      .from(taskRecurrenceDays)
      .where(eq(taskRecurrenceDays.taskId, task.id))

    if (recurrenceRows.length === 0) continue

    const recurrenceSet = new Set(recurrenceRows.map(r => r.dayOfWeek))

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

export async function getTodayTasks(userId: string, projectId?: string) {
  const todayStr = getTodayString()

  const conditions = [
    eq(tasks.userId, userId),
    eq(taskOccurrences.date, todayStr)
  ]
  if (projectId) {
    conditions.push(eq(tasks.projectId, projectId))
  }

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
    .where(and(...conditions))
    .orderBy(tasks.name)

  return results
}

export async function getOccurrencesInRange(
  userId: string,
  startDate: string,
  endDate: string,
  projectId?: string
) {
  await ensureOccurrencesForRange(userId, startDate, endDate)

  const conditions = [
    eq(tasks.userId, userId),
    gte(taskOccurrences.date, startDate),
    lte(taskOccurrences.date, endDate)
  ]
  if (projectId) {
    conditions.push(eq(tasks.projectId, projectId))
  }

  const results = await db
    .select({
      occurrenceId: taskOccurrences.id,
      taskId: tasks.id,
      projectId: tasks.projectId,
      taskName: tasks.name,
      date: taskOccurrences.date,
      taskType: tasks.taskType,
      startDate: tasks.startDate,
      endDate: tasks.endDate,
      completed: taskOccurrences.completed,
      // Aggregating recurrence days into an array
      recurrenceDays: sql<number[]>`
        COALESCE(
          (
            SELECT array_agg(${taskRecurrenceDays.dayOfWeek} ORDER BY ${taskRecurrenceDays.dayOfWeek})
            FROM ${taskRecurrenceDays}
            WHERE ${taskRecurrenceDays.taskId} = ${tasks.id}
          ),
          ARRAY[]::integer[]
        )
      `.as('recurrenceDays'),
    })
    .from(taskOccurrences)
    .innerJoin(tasks, eq(tasks.id, taskOccurrences.taskId))
    .where(and(...conditions))
    .orderBy(taskOccurrences.date, tasks.name)

  return results
}

export async function getDailyProgressStats(
  userId: string,
  startDate: string,
  endDate: string,
  projectId?: string
) {
  await ensureOccurrencesForRange(userId, startDate, endDate)

  const dateSeries = sql<{ date: string }>`
    SELECT generate_series(${startDate}::date, ${endDate}::date, '1 day') AS date
  `

  const conditions = [
    eq(tasks.userId, userId),
    gte(taskOccurrences.date, startDate),
    lte(taskOccurrences.date, endDate)
  ]
  if (projectId) {
    conditions.push(eq(tasks.projectId, projectId))
  }

  const dailyStats = db
    .select({
      date: taskOccurrences.date,
      totalTasks: sql<number>`count(*)`.as('total_tasks'),
      completedTasks: sql<number>`sum(case when ${taskOccurrences.completed} then 1 else 0 end)`.as('completed_tasks'),
    })
    .from(taskOccurrences)
    .innerJoin(tasks, eq(tasks.id, taskOccurrences.taskId))
    .where(and(...conditions))
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

export async function toggleOccurrence(occurrenceId: string, userId: string) {
  const result = await db
    .select({
      occurrenceId: taskOccurrences.id,
      taskId: tasks.id,
      completed: taskOccurrences.completed,
      date: taskOccurrences.date,
    })
    .from(taskOccurrences)
    .innerJoin(tasks, eq(tasks.id, taskOccurrences.taskId))
    .where(
      and(
        eq(taskOccurrences.id, occurrenceId),
        eq(tasks.userId, userId)
      )
    )
    .limit(1)

  if (result.length === 0) {
    throw new Error('Occurrence not found or access denied')
  }

  const occurrence = result[0]
  const newCompleted = !occurrence.completed

  const [updated] = await db
    .update(taskOccurrences)
    .set({
      completed: newCompleted,
      updatedAt: new Date()
    })
    .where(eq(taskOccurrences.id, occurrenceId))
    .returning({
      id: taskOccurrences.id,
      taskId: taskOccurrences.taskId,
      date: taskOccurrences.date,
      completed: taskOccurrences.completed,
    })

  return updated
}

export interface DailyStat {
  date: string
  totalTasks: number
  completedTasks: number
  progressPercent: number
}

export async function fetchDailyStats(
  startDate: string,
  endDate: string,
  projectId?: string
): Promise<DailyStat[]> {
  const url = new URL('/api/tasks/stats', window.location.origin)
  url.searchParams.set('startDate', startDate)
  url.searchParams.set('endDate', endDate)
  if (projectId && projectId !== 'all') url.searchParams.set('projectId', projectId)
  const res = await fetch(url.toString())
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Failed to fetch stats')
  return json.data || []
}

export interface MonthlyStat {
  month: string
  year: number
  percentage: number
}

export async function getMonthlyCompletionStats(
  userId: string,
  year?: number,
  projectId?: string
): Promise<MonthlyStat[]> {
  const conditions = [eq(tasks.userId, userId)]
  if (projectId && projectId !== 'all') {
    conditions.push(eq(tasks.projectId, projectId))
  }

  const yearFilter = year
    ? sql`EXTRACT(YEAR FROM ${taskOccurrences.date}) = ${year}`
    : sql`true`

  const monthlyStats = await db
    .select({
      month: sql<string>`TO_CHAR(${taskOccurrences.date}, 'YYYY-MM')`,
      total: sql<number>`COUNT(*)`,
      completed: sql<number>`SUM(CASE WHEN ${taskOccurrences.completed} THEN 1 ELSE 0 END)`,
    })
    .from(taskOccurrences)
    .innerJoin(tasks, eq(tasks.id, taskOccurrences.taskId))
    .where(and(...conditions, yearFilter))
    .groupBy(sql`TO_CHAR(${taskOccurrences.date}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${taskOccurrences.date}, 'YYYY-MM')`)

  if (year) {
    const allMonths = []
    for (let m = 0; m < 12; m++) {
      const monthStr = `${year}-${String(m + 1).padStart(2, '0')}`
      const found = monthlyStats.find(s => s.month === monthStr)
      const total = found?.total || 0
      const completed = found?.completed || 0
      const percentage = total ? Math.round((completed / total) * 100) : 0
      allMonths.push({
        month: new Date(monthStr + '-01').toLocaleString('default', { month: 'short' }),
        year,
        percentage,
      })
    }
    return allMonths
  }

  return monthlyStats.map(stat => ({
    month: new Date(stat.month + '-01').toLocaleString('default', { month: 'short' }),
    year: parseInt(stat.month.split('-')[0]),
    percentage: stat.total ? Math.round((stat.completed / stat.total) * 100) : 0,
  }))
}

export interface HeatmapDataPoint {
  date: string
  count: number
}

export async function getHeatmapData(
  userId: string,
  year: number = new Date().getFullYear(),
  projectId?: string
): Promise<HeatmapDataPoint[]> {
  const conditions = [eq(tasks.userId, userId)]
  if (projectId && projectId !== 'all') {
    conditions.push(eq(tasks.projectId, projectId))
  }

  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  const result = await db
    .select({
      date: sql<string>`TO_CHAR(date_series.date, 'YYYY-MM-DD')`,
      count: sql<number>`COALESCE(completed_counts.count, 0)`,
    })
    .from(sql`
      (SELECT generate_series(${startDate}::date, ${endDate}::date, '1 day') AS date) AS date_series
    `)
    .leftJoin(
      sql`
        (SELECT
           ${taskOccurrences.date} AS occ_date,
           COUNT(*) AS count
         FROM ${taskOccurrences}
         INNER JOIN ${tasks} ON ${tasks.id} = ${taskOccurrences.taskId}
         WHERE ${and(...conditions)}
           AND ${taskOccurrences.completed} = true
           AND ${taskOccurrences.date} BETWEEN ${startDate} AND ${endDate}
         GROUP BY ${taskOccurrences.date}
        ) AS completed_counts`,
      sql`date_series.date = completed_counts.occ_date`
    )
    .orderBy(sql`date_series.date`)

  return result.map(row => ({
    date: row.date,
    count: Number(row.count),
  }))
}