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

export async function deleteTask(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  })
  const result = await res.json()
  if (!res.ok) throw new Error(result.error || 'Failed to delete task')
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

export interface Occurrence {
  occurrenceId: string
  taskId: string
  projectId: string
  taskName: string
  date: string
  taskType: 'one_time' | 'recurring'
  startDate: string
  endDate: string
  completed: boolean
  recurrenceDays: number[]
}

export async function fetchOccurrences(
  startDate: string,
  endDate: string,
  projectId?: string
): Promise<Record<string, Occurrence[]>> {
  const url = new URL('/api/tasks/occurrences', window.location.origin)
  url.searchParams.set('startDate', startDate)
  url.searchParams.set('endDate', endDate)
  url.searchParams.set('groupByDate', 'true')
  if (projectId && projectId !== 'all') {
    url.searchParams.set('projectId', projectId)
  }
  const res = await fetch(url.toString())
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch occurrences')
  return data.data
}

export interface DailyStat {
  date: string
  totalTasks: number
  completedTasks: number
  progressPercent: number
}

export async function fetchDailyStats(startDate: string, endDate: string): Promise<DailyStat[]> {
  const url = new URL('/api/tasks/stats', window.location.origin)
  url.searchParams.set('startDate', startDate)
  url.searchParams.set('endDate', endDate)
  const res = await fetch(url.toString())
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch stats')
  return data.data
}

export interface HeatmapDataPoint {
  date: string
  count: number
}

export async function fetchHeatmapData(year?: number, projectId?: string): Promise<HeatmapDataPoint[]> {
  const url = new URL('/api/tasks/heatmap', window.location.origin)
  if (year) url.searchParams.set('year', year.toString())
  if (projectId && projectId !== 'all') url.searchParams.set('projectId', projectId)
  const res = await fetch(url.toString())
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Failed to fetch heatmap data')

  return json.data
}

export interface ProjectStat {
  id: string
  name: string
  total: number
  completed: number
  percentage: number
}

export async function fetchProjectStats(
  startDate?: string,
  endDate?: string
): Promise<ProjectStat[]> {
  const url = new URL('/api/tasks/project-stats', window.location.origin)
  if (startDate) url.searchParams.set('startDate', startDate)
  if (endDate) url.searchParams.set('endDate', endDate)
  const res = await fetch(url.toString())
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Failed to fetch project stats')

  return json.data
}