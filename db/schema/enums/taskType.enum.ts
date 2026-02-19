import { pgEnum } from "drizzle-orm/pg-core"

const taskTypeEnum = pgEnum('task_type', ['recurring', 'one_time'])

export default taskTypeEnum