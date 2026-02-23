import { relations } from 'drizzle-orm'
import users from '../models/users.model'
import accounts from '../models/accounts.model'

export const accountRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}))