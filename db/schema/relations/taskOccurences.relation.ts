import { relations } from "drizzle-orm"
import taskOccurrences from "../models/taskOccurences.model"
import tasks from "../models/tasks.model"

const taskOccurrencesRelations = relations(taskOccurrences, ({ one }) => ({
  task: one(tasks, { fields: [taskOccurrences.taskId], references: [tasks.id] }),
}))

export default taskOccurrencesRelations