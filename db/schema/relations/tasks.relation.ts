import { relations } from "drizzle-orm";
import { user } from "../auth";
import tasks from "../models/tasks.model";
import taskRecurrenceDays from "../models/taskRecurrenceDays.model";
import taskOccurrences from "../models/taskOccurences.model";
import projects from "../models/projects.model";

const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(user, { fields: [tasks.userId], references: [user.id] }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  recurrenceDays: many(taskRecurrenceDays),
  occurrences: many(taskOccurrences),
}));

export default tasksRelations