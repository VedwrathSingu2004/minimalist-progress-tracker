import { pgTable, uuid, text, timestamp, date } from 'drizzle-orm/pg-core'
import { user } from '../auth'
import projects from './projects.model'
import taskTypeEnum from '../enums/taskType.enum'

const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => user.id, { onDelete: 'cascade' })
    .notNull(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  taskType: taskTypeEnum('task_type').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export default tasks