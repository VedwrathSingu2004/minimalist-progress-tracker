import db from '@/db';
import tasks from '@/db/schema/models/tasks.model'
import taskRecurrenceDays from '@/db/schema/models/taskRecurrenceDays.model'
import taskOccurrences from '@/db/schema/models/taskOccurences.model';
import { and, eq, gte } from 'drizzle-orm';

// Helper: get today's date at midnight
function getTodayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper: generate occurrence objects for a date range
function generateOccurrences(
  taskId: string,
  start: Date,
  end: Date,
  recurrenceDays: Set<number>
): { taskId: string; date: string; completed: boolean }[] {
  const occurrences = [];
  const current = new Date(start);
  while (current <= end) {
    if (recurrenceDays.has(current.getDay())) {
      occurrences.push({
        taskId,
        date: current.toISOString().split('T')[0],
        completed: false,
      });
    }
    current.setDate(current.getDate() + 1);
  }
  return occurrences;
}

export interface ICreateTask {
  userId: string;
  name: string;
  taskType: 'recurring' | 'one_time';
  startDate: string;
  endDate?: string | null;
  recurrenceDays?: number[];
}

export async function createTask(input: ICreateTask) {
  const { userId, name, taskType, startDate, endDate, recurrenceDays = [] } = input;

  if (taskType === 'recurring' && recurrenceDays.length === 0) {
    throw new Error('Recurring tasks must have at least one recurrence day');
  }

  return await db.transaction(async (tx) => {
    // 1. Insert task
    const [newTask] = await tx
      .insert(tasks)
      .values({
        userId,
        name,
        taskType,
        startDate,
        endDate: taskType === 'one_time' ? startDate : endDate,
      })
      .returning({ id: tasks.id });

    const taskId = newTask.id;

    // 2. Insert recurrence days
    if (taskType === 'recurring' && recurrenceDays.length > 0) {
      const daysToInsert = recurrenceDays.map((day) => ({
        taskId,
        dayOfWeek: day,
      }));
      await tx.insert(taskRecurrenceDays).values(daysToInsert);
    }

    // 3. Generate occurrences
    const today = getTodayDate();
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    let effectiveEndDate: Date | null = null;
    if (taskType === 'one_time') {
      effectiveEndDate = start;
    } else if (endDate) {
      effectiveEndDate = new Date(endDate);
      effectiveEndDate.setHours(0, 0, 0, 0);
    }

    const recurrenceSet = new Set(recurrenceDays);
    const occurrencesToInsert: { taskId: string; date: string; completed: boolean }[] = [];

    if (taskType === 'one_time') {
      occurrencesToInsert.push({ taskId, date: startDate, completed: false });
    } else {
      // Past segment
      if (start < today) {
        const pastEnd = effectiveEndDate && effectiveEndDate < today
          ? effectiveEndDate
          : new Date(today.getTime() - 86400000); // yesterday
        if (start <= pastEnd) {
          const pastOccurrences = generateOccurrences(taskId, start, pastEnd, recurrenceSet);
          occurrencesToInsert.push(...pastOccurrences);
        }
      }

      // Future segment (up to 1 year ahead)
      const futureStart = start > today ? start : today;
      const oneYearFromNow = new Date(today);
      oneYearFromNow.setFullYear(today.getFullYear() + 1);

      let futureEnd: Date;
      if (effectiveEndDate && effectiveEndDate < oneYearFromNow) {
        futureEnd = effectiveEndDate;
      } else {
        futureEnd = oneYearFromNow;
      }

      if (futureStart <= futureEnd) {
        const futureOccurrences = generateOccurrences(taskId, futureStart, futureEnd, recurrenceSet);
        occurrencesToInsert.push(...futureOccurrences);
      }
    }

    if (occurrencesToInsert.length > 0) {
      await tx.insert(taskOccurrences).values(occurrencesToInsert);
    }

    return taskId;
  });
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

  // 1. Verify task exists and belongs to user (using standard query)
  const existingTasks = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .limit(1)

  if (existingTasks.length === 0) {
    throw new Error('Task not found')
  }

  const existingTask = existingTasks[0]

  // 2. Start a transaction
  return await db.transaction(async (tx) => {
    // 3. Update basic task fields
    const updateData: Partial<typeof tasks.$inferInsert> = {}
    if (name !== undefined) updateData.name = name
    if (endDate !== undefined) updateData.endDate = endDate

    if (Object.keys(updateData).length > 0) {
      await tx
        .update(tasks)
        .set(updateData)
        .where(eq(tasks.id, id))
    }

    // 4. If recurrenceDays provided, update recurrence pattern
    if (recurrenceDays !== undefined) {
      // Delete old recurrence days
      await tx
        .delete(taskRecurrenceDays)
        .where(eq(taskRecurrenceDays.taskId, id))

      // Insert new ones
      if (recurrenceDays.length > 0) {
        const daysToInsert = recurrenceDays.map(day => ({
          taskId: id,
          dayOfWeek: day
        }))
        await tx.insert(taskRecurrenceDays).values(daysToInsert)
      }

      // 5. Re‑generate future occurrences (date >= today)
      const today = getTodayDate()
      const todayStr = today.toISOString().split('T')[0]

      // Delete all future occurrences for this task
      await tx
        .delete(taskOccurrences)
        .where(
          and(
            eq(taskOccurrences.taskId, id),
            gte(taskOccurrences.date, todayStr)
          )
        )

      // Determine generation end date
      const finalEndDate = endDate !== undefined ? endDate : existingTask.endDate
      const effectiveEndDate = finalEndDate ? new Date(finalEndDate) : null

      const oneYearFromNow = new Date(today)
      oneYearFromNow.setFullYear(today.getFullYear() + 1)

      let generationEnd: Date
      if (effectiveEndDate && effectiveEndDate < oneYearFromNow) {
        generationEnd = effectiveEndDate
      } else {
        generationEnd = oneYearFromNow
      }

      if (today <= generationEnd) {
        const recurrenceSet = new Set(recurrenceDays)
        const newOccurrences = generateOccurrences(
          id,
          today,
          generationEnd,
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