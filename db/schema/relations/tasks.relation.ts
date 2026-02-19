import { relations } from "drizzle-orm";
import users from "../models/users.model";
import tasks from "../models/tasks.model";
import taskRecurrenceDays from "../models/taskRecurrenceDays.model";
import taskOccurrences from "../models/taskOccurences.model";

const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  recurrenceDays: many(taskRecurrenceDays),
  occurrences: many(taskOccurrences),
}));

export default tasksRelations