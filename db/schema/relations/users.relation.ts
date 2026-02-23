import { relations } from 'drizzle-orm'
import accounts from '../models/accounts.model'
import sessions from '../models/sessions.model'
import users from '../models/users.model'

const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
}))

export default usersRelations