export interface Task {
  id: string
  name: string
  taskType: 'one_time' | 'recurring'
  projectId: string
  date?: string
  startDate?: string
  endDate?: string
  days?: number[]
}

export async function fetchTasks(projectId?: string): Promise<Task[]> {
  const url = projectId 
    ? `/api/tasks?projectId=${encodeURIComponent(projectId)}`
    : '/api/tasks'
  
  const res = await fetch(url)
  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch tasks')
  }

  console.log(data.data)
  return data.data || []
}

export async function fetchTaskById(id: string): Promise<Task> {
  const res = await fetch(`/api/tasks?taskId=${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch task')
  }

  return data.data
}

export interface CreateTaskData {
  name: string
  projectId: string
  taskType: 'one_time' | 'recurring'
  startDate: string
  endDate?: string | null
  recurrenceDays?: number[]
}

export interface CreateTaskResponse {
  success: boolean
  taskId: string
}

export async function createTask(
  taskData: CreateTaskData
): Promise<CreateTaskResponse> {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || 'Failed to create task')
  }

  return data
}

export async function updateTask(
  id: string,
  data: Partial<{
    name: string
    startDate: string | null
    endDate: string | null
    recurrenceDays: number[]
    projectId: string
  }>
): Promise<{ success: boolean }> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  const result = await res.json()
  if (!res.ok) {
    throw new Error(result.error || 'Failed to update task')
  }
  return result
}

export interface TodayTask {
  occurrenceId: string
  taskId: string
  taskName: string
  taskType: 'one_time' | 'recurring'
  date: string
  completed: boolean
  days?: number[]
}

export async function fetchTodayTasks(): Promise<TodayTask[]> {
  const res = await fetch('/api/tasks/today')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch today\'s tasks')
  return data.data
}

export async function toggleOccurrence(occurrenceId: string): Promise<{ success: boolean; data: any }> {
  const res = await fetch(`/api/tasks/occurrences/${occurrenceId}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to toggle task')
  return data
}