import { relations } from 'drizzle-orm'
import projects from '../models/projects.model'
import tasks from '../models/tasks.model'
import { user } from '../auth'

const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(user, {
    fields: [projects.userId],
    references: [user.id],
  }),
  tasks: many(tasks),
}))

export default projectsRelations