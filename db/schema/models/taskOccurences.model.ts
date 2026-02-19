import { boolean, date, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core"
import tasks from "./tasks.model"

const taskOccurrences = pgTable('task_occurrences', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  completed: boolean('completed').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  unq: unique().on(table.taskId, table.date),
}))

export default taskOccurrences