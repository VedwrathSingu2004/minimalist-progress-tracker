import { date, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import users from "./users.model"
import taskTypeEnum from "../enums/taskType.enum"

const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  taskType: taskTypeEnum('task_type').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export default tasks