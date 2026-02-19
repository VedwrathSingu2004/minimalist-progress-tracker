import { integer, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core"
import tasks from "./tasks.model"

const taskRecurrenceDays = pgTable('task_recurrence_days', {
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  dayOfWeek: integer('day_of_week').notNull(),
}, (table) => ({
  pk: primaryKey(table.taskId, table.dayOfWeek),
}))

export default taskRecurrenceDays