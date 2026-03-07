'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CalendarDays,
  LayoutGrid,
  List,
  Repeat,
  CalendarClock,
  SquarePen,
  FolderOpen,
  Loader2,
  Check,
  Trash2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { fetchProjects } from '@/lib/api/projects'
import { fetchTasks, deleteTask, type Task } from '@/lib/api/tasks'

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = [
  { label: 'S', full: 'Sunday', index: 0 },
  { label: 'M', full: 'Monday', index: 1 },
  { label: 'T', full: 'Tuesday', index: 2 },
  { label: 'W', full: 'Wednesday', index: 3 },
  { label: 'T', full: 'Thursday', index: 4 },
  { label: 'F', full: 'Friday', index: 5 },
  { label: 'S', full: 'Saturday', index: 6 },
] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

// ─── Sub-components ─────────────────────────────────────────────────────────

const DayBadges = ({ activeDays }: { activeDays: number[] }) => (
  <TooltipProvider delayDuration={200}>
    <div className='flex items-center gap-1.5 flex-wrap'>
      {DAYS_OF_WEEK.map((day) => {
        const isActive = activeDays.includes(day.index)
        return (
          <Tooltip key={day.index}>
            <TooltipTrigger asChild>
              <Badge
                variant={isActive ? 'default' : 'outline'}
                className={cn(
                  'h-7 w-7 rounded-full p-0 flex items-center justify-center text-[11px] font-semibold cursor-default select-none transition-colors shrink-0',
                  !isActive && 'text-muted-foreground/50 border-dashed'
                )}
              >
                {day.label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side='bottom' className='text-xs'>
              {day.full}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  </TooltipProvider>
)

const TaskTypeBadge = ({ type }: { type: Task['taskType'] }) => (
  <Badge
    variant={type === 'recurring' ? 'default' : 'secondary'}
    className='shrink-0 gap-1 text-[11px] font-medium whitespace-nowrap'
  >
    {type === 'recurring' ? (
      <Repeat className='h-3 w-3 shrink-0' />
    ) : (
      <CalendarClock className='h-3 w-3 shrink-0' />
    )}
    {type === 'recurring' ? 'Recurring' : 'One-time'}
  </Badge>
)

const ProjectBadge = ({ projectId, projects }: { projectId: string; projects: { id: string; name: string }[] }) => {
  const projectName = projects.find(p => p.id === projectId)?.name ?? 'Unknown'
  return (
    <Badge
      variant='outline'
      className='shrink-0 gap-1 text-[11px] font-medium whitespace-nowrap text-muted-foreground'
    >
      <FolderOpen className='h-3 w-3 shrink-0' />
      {projectName}
    </Badge>
  )
}

const DateDisplay = ({ task }: { task: Task }) => (
  <div className='flex items-center gap-2 text-sm text-muted-foreground min-w-0'>
    <CalendarDays className='h-4 w-4 shrink-0' />
    {task.taskType === 'one_time' ? (
      <span className='truncate'>{task.startDate ? formatDate(task.startDate) : ''}</span>
    ) : (
      <span className='truncate whitespace-nowrap'>
        {task.startDate ? formatDate(task.startDate) : ''} &mdash; {task.endDate ? formatDate(task.endDate) : ''}
      </span>
    )}
  </div>
)

const EditButton = ({ taskId }: { taskId: string }) => {
  const router = useRouter()
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer'
            onClick={() => router.push(`/tasks/${taskId}`)}
            aria-label='Edit task'
          >
            <SquarePen className='h-4 w-4' />
          </Button>
        </TooltipTrigger>
        <TooltipContent side='bottom' className='text-xs'>
          Edit task
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const DeleteButton = ({ taskId, onDelete }: { taskId: string; onDelete: (id: string) => void }) => {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isConfirming) return

    const timeout = setTimeout(() => setIsConfirming(false), 4000)

    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsConfirming(false) }
    const onClickOutside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsConfirming(false) }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onClickOutside)
    
    return () => {
      clearTimeout(timeout)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onClickOutside)
    }
  }, [isConfirming])

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await deleteTask(taskId)
      onDelete(taskId)
    } catch (error) {
      console.error('Delete failed:', error)
      // Optionally show error toast
    } finally {
      setIsDeleting(false)
      setIsConfirming(false)
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div 
        ref={ref} 
        className='flex items-center overflow-hidden transition-all duration-250 ease-out'
        style={{ width: isConfirming ? 112 : 32 }}
      >
        <Tooltip open={isConfirming ? false : undefined}>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              disabled={isDeleting}
              className={cn(
                'h-8 w-8 shrink-0 transition-opacity duration-200 cursor-pointer',
                !isConfirming && 'opacity-0 group-hover:opacity-100',
                isConfirming && 'opacity-100',
              )}
              onClick={(e) => {
                e.stopPropagation()
                setIsConfirming(true)
              }}
              aria-label='Delete task'
            >
              {isDeleting 
                ? <Loader2 className='h-3.5 w-3.5 animate-spin' />
                : <Trash2 className='h-3.5 w-3.5' />
              }
            </Button>
          </TooltipTrigger>
          <TooltipContent side='bottom' className='text-xs'>
            Delete task
          </TooltipContent>
        </Tooltip>

        {isConfirming && !isDeleting && (
          <div className='flex items-center text-xs'>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-6 text-muted-foreground'
              onClick={(e) => {
                e.stopPropagation()
                setIsConfirming(false)
              }}
            >
              <X className='h-3.5 w-3.5' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-6 text-destructive hover:text-destructive hover:bg-destructive/10'
              onClick={(e) => {
                e.stopPropagation()
                void handleConfirm()
              }}
            >
              <Check className='h-3.5 w-3.5' />
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

// ─── Grid card ───────────────────────────────────────────────────────────────

const GridTaskCard = ({ 
  task, 
  projects,
  onDelete 
}: { 
  task: Task; 
  projects: { id: string; name: string }[];
  onDelete: (id: string) => void;
}) => (
  <Card className='group relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-primary/30 flex flex-col'>
    <CardHeader className='pb-3 overflow-hidden'>
      <div className='flex items-center justify-between gap-2 mb-2'>
        <div className='flex items-center gap-1.5 min-w-0 flex-wrap'>
          <TaskTypeBadge type={task.taskType} />
          <ProjectBadge projectId={task.projectId} projects={projects} />
        </div>
        <div className='flex items-center gap-1'>
          <EditButton taskId={task.id} />
          <DeleteButton taskId={task.id} onDelete={onDelete} />
        </div>
      </div>

      <div className='flex items-start gap-2.5 min-w-0'>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            task.taskType === 'recurring'
              ? 'bg-primary/10 text-primary'
              : 'bg-secondary text-muted-foreground'
          )}
        >
          {task.taskType === 'recurring' ? (
            <Repeat className='h-4 w-4' />
          ) : (
            <CalendarClock className='h-4 w-4' />
          )}
        </div>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <CardTitle className='text-sm font-semibold leading-snug line-clamp-2 min-w-0 wrap-break-word'>
                {task.name}
              </CardTitle>
            </TooltipTrigger>
            <TooltipContent
              side='top'
              className='text-xs max-w-72 text-wrap'
            >
              {task.name}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </CardHeader>

    <CardContent className='space-y-3 pt-0 flex-1 overflow-hidden'>
      <Separator />

      <DateDisplay task={task} />

      {task.taskType === 'recurring' && task.days && (
        <>
          <Separator className='my-2!' />
          <div className='space-y-1.5'>
            <p className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
              Scheduled Days
            </p>
            <DayBadges activeDays={task.days} />
          </div>
        </>
      )}
    </CardContent>
  </Card>
)

// ─── List card ───────────────────────────────────────────────────────────────

const ListTaskCard = ({ 
  task, 
  projects,
  onDelete 
}: { 
  task: Task; 
  projects: { id: string; name: string }[];
  onDelete: (id: string) => void;
}) => (
  <Card className='group hover:shadow-lg transition-all duration-300 hover:border-primary/30 overflow-hidden'>
    <CardContent className='flex flex-col sm:flex-row sm:items-center gap-4 py-4 px-5 overflow-hidden'>
      {/* Icon + name + badges */}
      <div className='flex items-center gap-3 sm:flex-1 min-w-0 overflow-hidden'>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            task.taskType === 'recurring'
              ? 'bg-primary/10 text-primary'
              : 'bg-secondary text-muted-foreground'
          )}
        >
          {task.taskType === 'recurring' ? (
            <Repeat className='h-4 w-4' />
          ) : (
            <CalendarClock className='h-4 w-4' />
          )}
        </div>
        <div className='min-w-0 space-y-1 overflow-hidden'>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className='text-sm font-semibold truncate'>
                  {task.name}
                </p>
              </TooltipTrigger>
              <TooltipContent
                side='top'
                className='text-xs max-w-80 text-wrap'
              >
                {task.name}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className='flex items-center gap-1.5 flex-wrap'>
            <TaskTypeBadge type={task.taskType} />
            <ProjectBadge projectId={task.projectId} projects={projects} />
          </div>
        </div>
      </div>

      <Separator orientation='vertical' className='hidden sm:block h-10' />
      <Separator className='sm:hidden' />

      {/* Date info */}
      <div className='sm:min-w-55 sm:max-w-64 min-w-0 shrink-0'>
        <DateDisplay task={task} />
      </div>

      {/* Day badges for recurring */}
      {task.taskType === 'recurring' && task.days && (
        <>
          <Separator
            orientation='vertical'
            className='hidden sm:block h-10'
          />
          <Separator className='sm:hidden' />
          <div className='space-y-1 shrink-0'>
            <p className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:hidden'>
              Scheduled Days
            </p>
            <DayBadges activeDays={task.days} />
          </div>
        </>
      )}

      {/* Edit + Delete buttons — desktop */}
      <div className='hidden sm:flex items-center shrink-0 ml-auto gap-1'>
        <EditButton taskId={task.id} />
        <DeleteButton taskId={task.id} onDelete={onDelete} />
      </div>

      {/* Edit + Delete buttons — mobile */}
      <div className='sm:hidden flex justify-end gap-1'>
        <EditButton taskId={task.id} />
        <DeleteButton taskId={task.id} onDelete={onDelete} />
      </div>
    </CardContent>
  </Card>
)

// ─── Main component ──────────────────────────────────────────────────────────

const TasksList = () => {
  const [layout, setLayout] = useState<string>('grid')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [tasksError, setTasksError] = useState<string | null>(null)

  // Fetch projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await fetchProjects()
        setProjects(data)
      } catch (err) {
        setProjectsError(err instanceof Error ? err.message : 'An unknown error occurred')
      } finally {
        setLoadingProjects(false)
      }
    }
    loadProjects()
  }, [])

  // Fetch tasks when selected project changes
  useEffect(() => {
    const loadTasks = async () => {
      setLoadingTasks(true)
      setTasksError(null)
      try {
        const projectId = selectedProjectId === 'all' ? undefined : selectedProjectId
        const data = await fetchTasks(projectId)
        setTasks(data)
      } catch (err) {
        setTasksError(err instanceof Error ? err.message : 'An unknown error occurred')
      } finally {
        setLoadingTasks(false)
      }
    }
    if (!loadingProjects) {
      loadTasks()
    }
  }, [selectedProjectId, loadingProjects])

  const handleDeleteTask = (deletedId: string) => {
    setTasks(prev => prev.filter(task => task.id !== deletedId))
  }

  const recurringCount = tasks.filter(t => t.taskType === 'recurring').length
  const oneTimeCount = tasks.filter(t => t.taskType === 'one_time').length

  if (loadingProjects) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (projectsError) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-2">
        <p className="text-destructive">Error loading projects: {projectsError}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className='w-full max-w-6xl mx-auto p-6 space-y-6 overflow-hidden'>
      {/* ── Header ── */}
      <div className='flex items-center justify-between gap-4 flex-wrap'>
        <div className='space-y-1 min-w-0'>
          <h1 className='text-3xl font-bold tracking-tight truncate'>
            Tasks
          </h1>
          <p className='text-sm text-muted-foreground truncate'>
            Manage and track your scheduled tasks
          </p>
        </div>

        <div className='flex items-center gap-3 shrink-0 flex-wrap'>
          {/* Project filter dropdown */}
          <Select
            value={selectedProjectId}
            onValueChange={setSelectedProjectId}
          >
            <SelectTrigger className='w-50'>
              <div className='flex items-center gap-2'>
                <FolderOpen className='h-4 w-4 shrink-0 text-muted-foreground' />
                <SelectValue placeholder='Filter by project' />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Layout toggle */}
          <ToggleGroup
            type='single'
            value={layout}
            onValueChange={(v) => {
              if (v) setLayout(v)
            }}
            className='border rounded-lg p-1 bg-muted/40 shrink-0'
          >
            <ToggleGroupItem
              value='grid'
              aria-label='Grid view'
              className='gap-1.5 px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm'
            >
              <LayoutGrid className='h-4 w-4' />
            </ToggleGroupItem>
            <ToggleGroupItem
              value='list'
              aria-label='List view'
              className='gap-1.5 px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm'
            >
              <List className='h-4 w-4' />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <Separator />

      {/* ── Summary ── */}
      <div className='flex items-center gap-3 text-sm flex-wrap'>
        <Badge variant='outline' className='gap-1 font-normal whitespace-nowrap'>
          {tasks.length} total
        </Badge>
        <Separator orientation='vertical' className='h-4' />
        <Badge
          variant='outline'
          className='gap-1 font-normal text-primary border-primary/30 whitespace-nowrap'
        >
          <Repeat className='h-3 w-3 shrink-0' />
          {recurringCount} recurring
        </Badge>
        <Separator orientation='vertical' className='h-4' />
        <Badge variant='outline' className='gap-1 font-normal whitespace-nowrap'>
          <CalendarClock className='h-3 w-3 shrink-0' />
          {oneTimeCount} one-time
        </Badge>
        {selectedProjectId !== 'all' && (
          <>
            <Separator orientation='vertical' className='h-4' />
            <Badge
              variant='outline'
              className='gap-1 font-normal whitespace-nowrap text-muted-foreground'
            >
              <FolderOpen className='h-3 w-3 shrink-0' />
              {projects.find(p => p.id === selectedProjectId)?.name ?? 'Unknown'}
            </Badge>
          </>
        )}
      </div>

      {/* ── Loading / Error / Task cards ── */}
      {loadingTasks ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : tasksError ? (
        <div className="flex h-[40vh] flex-col items-center justify-center gap-2">
          <p className="text-destructive">Error loading tasks: {tasksError}</p>
          <Button onClick={() => {
            const projectId = selectedProjectId === 'all' ? undefined : selectedProjectId
            fetchTasks(projectId).then(setTasks).catch(e => setTasksError(e.message))
          }}>Retry</Button>
        </div>
      ) : tasks.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-16 text-center'>
          <FolderOpen className='h-12 w-12 text-muted-foreground/40 mb-4' />
          <p className='text-lg font-medium text-muted-foreground'>
            No tasks found
          </p>
          <p className='text-sm text-muted-foreground/70'>
            {selectedProjectId === 'all'
              ? 'Get started by creating your first task.'
              : 'No tasks match the selected project filter.'}
          </p>
        </div>
      ) : (
        <div
          className={cn(
            'transition-all duration-300',
            layout === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'flex flex-col gap-3'
          )}
        >
          {tasks.map((task) =>
            layout === 'grid' ? (
              <GridTaskCard
                key={task.id}
                task={task}
                projects={projects}
                onDelete={handleDeleteTask}
              />
            ) : (
              <ListTaskCard
                key={task.id}
                task={task}
                projects={projects}
                onDelete={handleDeleteTask}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}

export default TasksList