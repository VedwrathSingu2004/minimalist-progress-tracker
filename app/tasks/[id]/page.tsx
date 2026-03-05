import { fetchTaskById } from '@/lib/api/tasks'
import TaskDetail from '@/components/TaskViews/TaskDetailView'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TaskPage({ params }: PageProps) {
  const { id } = await params

  try {
    return <TaskDetail />
  } catch (error: any) {
    if (error.message?.toLowerCase().includes('not found')) {
      notFound()
    }

    return (
      <div className="flex min-h-screen items-center justify-center text-destructive">
        Error loading task: {error.message}
      </div>
    )
  }
}