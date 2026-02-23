import { relations } from 'drizzle-orm'
import users from '../models/users.model'
import sessions from '../models/sessions.model'

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))