'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Toggle } from '@/components/ui/toggle'
import {
  CalendarDays,
  CalendarClock,
  Repeat,
  SquarePen,
  X,
  Check,
  ArrowLeft,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

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

// ─── Types ───────────────────────────────────────────────────────────────────

interface TaskFormData {
  taskName: string
  taskType: 'one_time' | 'recurring'
  date?: Date
  startDate?: Date
  endDate?: Date
  days: number[]
}

// ─── Initial data ────────────────────────────────────────────────────────────

const initialTask: TaskFormData = {
  taskName: 'Team Standup Meeting with Engineering & Design Departments',
  taskType: 'recurring',
  startDate: new Date('2025-01-15'),
  endDate: new Date('2025-06-15'),
  days: [1, 2, 3, 4, 5],
}

// ─── DatePicker sub-component ────────────────────────────────────────────────

const DatePicker = ({
  date,
  onSelect,
  placeholder,
}: {
  date?: Date
  onSelect: (date?: Date) => void
  placeholder: string
}) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant='outline'
        className={cn(
          'w-full justify-start text-left font-normal',
          !date && 'text-muted-foreground'
        )}
      >
        <CalendarDays className='mr-2 h-4 w-4 shrink-0' />
        <span className='truncate'>
          {date ? format(date, 'PPP') : placeholder}
        </span>
      </Button>
    </PopoverTrigger>
    <PopoverContent className='w-auto p-0' align='start'>
      <Calendar
        mode='single'
        selected={date}
        onSelect={onSelect}
        initialFocus
      />
    </PopoverContent>
  </Popover>
)

// ─── Section wrapper ─────────────────────────────────────────────────────────

const Section = ({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) => (
  <div className={cn('grid grid-cols-1 md:grid-cols-[220px_1fr] gap-x-12 gap-y-3', className)}>
    <div className='space-y-1 pt-1'>
      <h3 className='text-sm font-semibold text-foreground'>{title}</h3>
      {description && (
        <p className='text-xs text-muted-foreground leading-relaxed'>
          {description}
        </p>
      )}
    </div>
    <div className='max-w-xl'>{children}</div>
  </div>
)

// ─── Read-only value display ─────────────────────────────────────────────────

const ReadOnlyValue = ({
  icon: Icon,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) => (
  <div className='flex items-center gap-2.5 rounded-lg bg-muted/50 px-3.5 py-2.5 text-sm font-medium min-w-0'>
    {Icon && <Icon className='h-4 w-4 shrink-0 text-muted-foreground' />}
    <span className='truncate'>{children}</span>
  </div>
)

// ─── Main component ──────────────────────────────────────────────────────────

const TaskDetail = () => {
  const [isEditing, setIsEditing] = useState(false)
  const [taskData, setTaskData] = useState<TaskFormData>(initialTask)
  const [editData, setEditData] = useState<TaskFormData>(initialTask)

  const handleEdit = () => {
    setEditData({ ...taskData })
    setIsEditing(true)
  }

  const handleCancel = () => {
    setEditData({ ...taskData })
    setIsEditing(false)
  }

  const handleSave = () => {
    setTaskData({ ...editData })
    setIsEditing(false)
    console.log('Saved:', editData)
  }

  const handleTaskTypeChange = (value: 'one_time' | 'recurring') => {
    setEditData((prev) => ({
      ...prev,
      taskType: value,
      ...(value === 'one_time'
        ? {
            date: prev.startDate || new Date(),
            startDate: undefined,
            endDate: undefined,
            days: [],
          }
        : {
            startDate: prev.date || new Date(),
            endDate: undefined,
            date: undefined,
            days: [],
          }),
    }))
  }

  const toggleDay = (dayIndex: number) => {
    setEditData((prev) => ({
      ...prev,
      days: prev.days.includes(dayIndex)
        ? prev.days.filter((d) => d !== dayIndex)
        : [...prev.days, dayIndex].sort(),
    }))
  }

  const updateField = <K extends keyof TaskFormData>(
    key: K,
    value: TaskFormData[K]
  ) => {
    setEditData((prev) => ({ ...prev, [key]: value }))
  }
  const router = useRouter()
  const data = isEditing ? editData : taskData

  return (
    <div className='min-h-screen'>
      {/* ── Top bar ── */}
      <div className='sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60'>
        <div className='mx-auto max-w-4xl px-6 sm:px-10 lg:px-16'>
          <div className='flex h-16 items-center justify-between'>
            <Button
              variant='ghost'
              size='sm'
              className='gap-2 -ml-2 text-muted-foreground hover:text-foreground'
              onClick={() => router.back()}
            >
              <ArrowLeft className='h-4 w-4' />
              Back to Tasks
            </Button>

            <div className='flex items-center gap-2'>
              {isEditing ? (
                <>
                  <Badge
                    variant='outline'
                    className='gap-1.5 text-[11px] font-medium border-primary/30 text-primary bg-primary/5 mr-2'
                  >
                    <SquarePen className='h-3 w-3' />
                    Editing
                  </Badge>
                  <Button
                    variant='outline'
                    size='sm'
                    className='gap-1.5 cursor-pointer'
                    onClick={handleCancel}
                  >
                    <X className='h-4 w-4' />
                    Discard
                  </Button>
                  <Button
                    size='sm'
                    className='gap-1.5 cursor-pointer'
                    onClick={handleSave}
                  >
                    <Check className='h-4 w-4' />
                    Save
                  </Button>
                </>
              ) : (
                <Button
                  variant='outline'
                  size='sm'
                  className='gap-1.5 cursor-pointer'
                  onClick={handleEdit}
                >
                  <SquarePen className='h-4 w-4' />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Page content ── */}
      <div className='mx-auto max-w-4xl px-6 sm:px-10 lg:px-16 py-10 space-y-2'>
        {/* ── Page heading ── */}
        <div className='space-y-4 mb-10'>
          <div className='flex items-start gap-4'>
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors',
                data.taskType === 'recurring'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-secondary text-muted-foreground'
              )}
            >
              {data.taskType === 'recurring' ? (
                <Repeat className='h-5 w-5' />
              ) : (
                <CalendarClock className='h-5 w-5' />
              )}
            </div>

            <div className='min-w-0 space-y-1 flex-1'>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h1 className='text-2xl font-bold tracking-tight leading-snug wrap-break-word line-clamp-2'>
                      {data.taskName || 'Untitled Task'}
                    </h1>
                  </TooltipTrigger>
                  {data.taskName && data.taskName.length > 50 && (
                    <TooltipContent
                      side='bottom'
                      className='text-xs max-w-80 text-wrap'
                    >
                      {data.taskName}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <p className='text-sm text-muted-foreground'>
                {data.taskType === 'recurring'
                  ? 'This task repeats on selected days'
                  : 'This task is scheduled once'}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* ── Sections ── */}
        <div className='space-y-10 pt-8'>
          {/* ── Task Name ── */}
          <Section
            title='Task Name'
            description='The display name for this task.'
          >
            {isEditing ? (
              <Input
                value={editData.taskName}
                onChange={(e) => updateField('taskName', e.target.value)}
                placeholder='Enter task name'
                className='h-10'
              />
            ) : (
              <ReadOnlyValue>{data.taskName}</ReadOnlyValue>
            )}
          </Section>

          <Separator />

          {/* ── Task Type ── */}
          <Section
            title='Task Type'
            description='Determines whether this task runs once or repeats.'
          >
            <div className='space-y-2'>
              {isEditing ? (
                <Select
                  value={editData.taskType}
                  onValueChange={(v) =>
                    handleTaskTypeChange(v as 'one_time' | 'recurring')
                  }
                >
                  <SelectTrigger className='w-full sm:w-64 h-10'>
                    <SelectValue placeholder='Select type' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='one_time'>
                      <span className='flex items-center gap-2'>
                        <CalendarClock className='h-4 w-4' />
                        One-time
                      </span>
                    </SelectItem>
                    <SelectItem value='recurring'>
                      <span className='flex items-center gap-2'>
                        <Repeat className='h-4 w-4' />
                        Recurring
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <ReadOnlyValue
                  icon={data.taskType === 'recurring' ? Repeat : CalendarClock}
                >
                  {data.taskType === 'recurring' ? 'Recurring' : 'One-time'}
                </ReadOnlyValue>
              )}

              {isEditing && (
                <p className='text-[11px] text-muted-foreground flex items-start gap-1.5 mt-1'>
                  <Info className='h-3 w-3 shrink-0 mt-0.5' />
                  Changing task type will reset schedule fields.
                </p>
              )}
            </div>
          </Section>

          <Separator />

          {/* ── Schedule ── */}
          <Section
            title='Schedule'
            description={
              data.taskType === 'one_time'
                ? 'The date this task is scheduled for.'
                : 'The date range for this recurring task.'
            }
          >
            {data.taskType === 'one_time' ? (
              <div className='space-y-1.5'>
                <Label className='text-sm text-muted-foreground'>Date</Label>
                {isEditing ? (
                  <DatePicker
                    date={editData.date}
                    onSelect={(d) => updateField('date', d)}
                    placeholder='Pick a date'
                  />
                ) : (
                  <ReadOnlyValue icon={CalendarDays}>
                    {data.date ? format(data.date, 'PPP') : '—'}
                  </ReadOnlyValue>
                )}
              </div>
            ) : (
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div className='space-y-1.5'>
                  <Label className='text-sm text-muted-foreground'>
                    Start Date
                  </Label>
                  {isEditing ? (
                    <DatePicker
                      date={editData.startDate}
                      onSelect={(d) => updateField('startDate', d)}
                      placeholder='Pick start date'
                    />
                  ) : (
                    <ReadOnlyValue icon={CalendarDays}>
                      {data.startDate
                        ? format(data.startDate, 'PPP')
                        : '—'}
                    </ReadOnlyValue>
                  )}
                </div>
                <div className='space-y-1.5'>
                  <Label className='text-sm text-muted-foreground'>
                    End Date
                  </Label>
                  {isEditing ? (
                    <DatePicker
                      date={editData.endDate}
                      onSelect={(d) => updateField('endDate', d)}
                      placeholder='Pick end date'
                    />
                  ) : (
                    <ReadOnlyValue icon={CalendarDays}>
                      {data.endDate ? format(data.endDate, 'PPP') : '—'}
                    </ReadOnlyValue>
                  )}
                </div>
              </div>
            )}
          </Section>

          {/* ── Scheduled Days ── */}
          {data.taskType === 'recurring' && (
            <>
              <Separator />

              <Section
                title='Scheduled Days'
                description='Select which days of the week this task should repeat on.'
              >
                <div className='space-y-3'>
                  <TooltipProvider delayDuration={200}>
                    <div className='flex items-center gap-2 flex-wrap'>
                      {DAYS_OF_WEEK.map((day) => {
                        const isActive = data.days.includes(day.index)

                        return isEditing ? (
                          <Tooltip key={day.index}>
                            <TooltipTrigger asChild>
                              <Toggle
                                pressed={isActive}
                                onPressedChange={() => toggleDay(day.index)}
                                className={cn(
                                  'h-10 w-10 rounded-full p-0 text-xs font-semibold transition-all cursor-pointer',
                                  'data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-md',
                                  !isActive &&
                                    'border border-dashed border-muted-foreground/30 text-muted-foreground/50 hover:border-primary/50 hover:text-primary/70'
                                )}
                                aria-label={day.full}
                              >
                                {day.label}
                              </Toggle>
                            </TooltipTrigger>
                            <TooltipContent
                              side='bottom'
                              className='text-xs'
                            >
                              {isActive
                                ? `Remove ${day.full}`
                                : `Add ${day.full}`}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip key={day.index}>
                            <TooltipTrigger asChild>
                              <Badge
                                variant={isActive ? 'default' : 'outline'}
                                className={cn(
                                  'h-9 w-9 rounded-full p-0 flex items-center justify-center text-xs font-semibold cursor-default select-none transition-colors shrink-0',
                                  !isActive &&
                                    'text-muted-foreground/50 border-dashed'
                                )}
                              >
                                {day.label}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent
                              side='bottom'
                              className='text-xs'
                            >
                              {day.full}
                            </TooltipContent>
                          </Tooltip>
                        )
                      })}
                    </div>
                  </TooltipProvider>

                  {!isEditing && data.days.length > 0 && (
                    <p className='text-xs text-muted-foreground'>
                      Active on{' '}
                      <span className='font-medium text-foreground'>
                        {data.days
                          .map(
                            (d) =>
                              DAYS_OF_WEEK.find((day) => day.index === d)
                                ?.full
                          )
                          .join(', ')}
                      </span>
                    </p>
                  )}

                  {isEditing && editData.days.length === 0 && (
                    <p className='text-xs text-destructive flex items-center gap-1.5'>
                      <Info className='h-3 w-3 shrink-0' />
                      Please select at least one day
                    </p>
                  )}
                </div>
              </Section>
            </>
          )}

          {/* ── Bottom actions (edit mode) ── */}
          {isEditing && (
            <>
              <Separator />
              <div className='flex items-center justify-end gap-3 pb-6'>
                <Button
                  variant='outline'
                  className='gap-1.5 cursor-pointer'
                  onClick={handleCancel}
                >
                  <X className='h-4 w-4' />
                  Discard
                </Button>
                <Button
                  className='gap-1.5 cursor-pointer'
                  onClick={handleSave}
                >
                  <Check className='h-4 w-4' />
                  Save Changes
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default TaskDetail