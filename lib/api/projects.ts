export interface Project {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch('/api/projects')
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Failed to fetch projects')
  }
  const { data } = await res.json()
  return data || []
}

export async function createProject(name: string, description: string) {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create project')
  return data.data
}

export async function deleteProject(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/projects/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to delete project')
  return data
}