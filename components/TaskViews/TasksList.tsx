'use client'

import { useState } from 'react'
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
  CalendarDays,
  LayoutGrid,
  List,
  Repeat,
  CalendarClock,
  SquarePen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

// ─── Types ───────────────────────────────────────────────────────────────────

interface BaseTask {
  id: string
  taskName: string
}

interface OneTimeTask extends BaseTask {
  taskType: 'one_time'
  date: string
}

interface RecurringTask extends BaseTask {
  taskType: 'recurring'
  startDate: string
  endDate: string
  days: number[] // 0 = Sun … 6 = Sat
}

type Task = OneTimeTask | RecurringTask

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

// ─── Sample data ─────────────────────────────────────────────────────────────

const sampleTasks: Task[] = [
  {
    id: '1',
    taskName:
      'Team Standup Meeting with Engineering, Design, Product & Marketing Departments',
    taskType: 'recurring',
    startDate: '2025-01-15',
    endDate: '2025-06-15',
    days: [1, 2, 3, 4, 5],
  },
  {
    id: '2',
    taskName: 'Project Deadline Review',
    taskType: 'one_time',
    date: '2025-02-28',
  },
  {
    id: '3',
    taskName: 'Yoga & Meditation',
    taskType: 'recurring',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    days: [1, 3, 5],
  },
  {
    id: '4',
    taskName:
      'Quarterly Report Submission for All Regional Offices Including International Branches and Subsidiaries',
    taskType: 'one_time',
    date: '2025-03-31',
  },
  {
    id: '5',
    taskName: 'Weekend Grocery Run',
    taskType: 'recurring',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    days: [0, 6],
  },
  {
    id: '6',
    taskName: 'Client Presentation',
    taskType: 'one_time',
    date: '2025-04-10',
  },
  {
    id: '7',
    taskName: 'Code Review Sessions',
    taskType: 'recurring',
    startDate: '2025-02-01',
    endDate: '2025-08-01',
    days: [2, 4],
  },
  {
    id: '8',
    taskName: 'Annual Health Checkup',
    taskType: 'one_time',
    date: '2025-05-20',
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

// ─── Sub-components ──────────────────────────────────────────────────────────

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

const DateDisplay = ({ task }: { task: Task }) => (
  <div className='flex items-center gap-2 text-sm text-muted-foreground min-w-0'>
    <CalendarDays className='h-4 w-4 shrink-0' />
    {task.taskType === 'one_time' ? (
      <span className='truncate'>{formatDate(task.date)}</span>
    ) : (
      <span className='truncate whitespace-nowrap'>
        {formatDate(task.startDate)} &mdash; {formatDate(task.endDate)}
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

// ─── Grid card ───────────────────────────────────────────────────────────────

const GridTaskCard = ({ task }: { task: Task }) => (
  <Card className='group relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-primary/30 flex flex-col'>
    <CardHeader className='pb-3 overflow-hidden'>
      {/* Top row: badge + edit (always visible, never pushed off) */}
      <div className='flex items-center justify-between gap-2 mb-2'>
        <TaskTypeBadge type={task.taskType} />
        <EditButton taskId={task.id} />
      </div>

      {/* Task name row: icon + title (title can wrap to 2 lines max) */}
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
                {task.taskName}
              </CardTitle>
            </TooltipTrigger>
            <TooltipContent
              side='top'
              className='text-xs max-w-72 text-wrap'
            >
              {task.taskName}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </CardHeader>

    <CardContent className='space-y-3 pt-0 flex-1 overflow-hidden'>
      <Separator />

      <DateDisplay task={task} />

      {task.taskType === 'recurring' && (
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

const ListTaskCard = ({ task }: { task: Task }) => (
  <Card className='group hover:shadow-lg transition-all duration-300 hover:border-primary/30 overflow-hidden'>
    <CardContent className='flex flex-col sm:flex-row sm:items-center gap-4 py-4 px-5 overflow-hidden'>
      {/* Icon + name + badge */}
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
                  {task.taskName}
                </p>
              </TooltipTrigger>
              <TooltipContent
                side='top'
                className='text-xs max-w-80 text-wrap'
              >
                {task.taskName}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TaskTypeBadge type={task.taskType} />
        </div>
      </div>

      <Separator orientation='vertical' className='hidden sm:block h-10' />
      <Separator className='sm:hidden' />

      {/* Date info */}
      <div className='sm:min-w-55 sm:max-w-64 min-w-0 shrink-0'>
        <DateDisplay task={task} />
      </div>

      {/* Day badges for recurring */}
      {task.taskType === 'recurring' && (
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

      {/* Edit button — desktop: pinned right */}
      <div className='hidden sm:flex items-center shrink-0 ml-auto'>
        <EditButton taskId={task.id} />
      </div>

      {/* Edit button — mobile: bottom-right */}
      <div className='sm:hidden flex justify-end'>
        <EditButton taskId={task.id} />
      </div>
    </CardContent>
  </Card>
)

// ─── Main component ──────────────────────────────────────────────────────────

const TasksList = () => {
  const [layout, setLayout] = useState<string>('grid')

  const recurringCount = sampleTasks.filter(
    (t) => t.taskType === 'recurring'
  ).length
  const oneTimeCount = sampleTasks.filter(
    (t) => t.taskType === 'one_time'
  ).length

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

      <Separator />

      {/* ── Summary ── */}
      <div className='flex items-center gap-3 text-sm flex-wrap'>
        <Badge variant='outline' className='gap-1 font-normal whitespace-nowrap'>
          {sampleTasks.length} total
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
      </div>

      {/* ── Task cards ── */}
      <div
        className={cn(
          'transition-all duration-300',
          layout === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'flex flex-col gap-3'
        )}
      >
        {sampleTasks.map((task) =>
          layout === 'grid' ? (
            <GridTaskCard key={task.id} task={task} />
          ) : (
            <ListTaskCard key={task.id} task={task} />
          )
        )}
      </div>
    </div>
  )
}

export default TasksList