'use client'

import { useState, useMemo, useEffect } from 'react'
import { cn } from '@/lib/utils'

// ── ShadCN Components ────────────────────────────
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

// ── Icons ────────────────────────────────────────
import {
  ChevronLeft,
  ChevronRight,
  Repeat,
  Clock,
  CalendarDays,
  CalendarCheck,
  ChevronsUpDown,
  Check,
  FolderKanban,
  Loader2,
} from 'lucide-react'
import { qualyFontFamily } from '@/lib/fonts'

// ── API ───────────────────────────────────────────
import { fetchProjects } from '@/lib/api/projects'
import { fetchOccurrences, toggleOccurrence, Occurrence } from '@/lib/api/tasks'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface Project {
  id: string
  name: string
  color?: string
}

interface CalendarDay {
  date: Date
  dateStr: string
  isCurrentMonth: boolean
  isToday: boolean
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constants & Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DOW       = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DOW_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const pad = (n: number) => String(n).padStart(2, '0')

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Days-of-Week Indicator (unchanged)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DaysOfWeekIndicator = ({
  activeDays,
  size = 'default',
}: {
  activeDays: number[]
  size?: 'compact' | 'default'
}) => (
  <div className={cn('inline-flex items-center', size === 'compact' ? 'gap-px' : 'gap-0.5')}>
    {DOW_SHORT.map((label, i) => (
      <span
        key={i}
        className={cn(
          'inline-flex items-center justify-center rounded-full font-semibold',
          size === 'compact' ? 'h-3.5 w-3.5 text-[7px]' : 'h-5 w-5 text-[10px]',
          activeDays.includes(i)
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
            : 'text-muted-foreground/20',
        )}
      >
        {label}
      </span>
    ))}
  </div>
)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MAX_VISIBLE = 3

const CalendarTaskView = () => {
  const today = useMemo(() => new Date(), [])
  const [month, setMonth]               = useState(today.getMonth())
  const [year, setYear]                 = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [sheetOpen, setSheetOpen]       = useState(false)

  // ── Projects ─────────────────────────────────────
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')

  // ── Occurrences ─────────────────────────────────
  const [occurrences, setOccurrences] = useState<Record<string, Occurrence[]>>({})
  const [loadingOccurrences, setLoadingOccurrences] = useState(false)
  const [occurrencesError, setOccurrencesError] = useState<string | null>(null)

  // ── Toggle tracking ──────────────────────────────
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  // Load projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoadingProjects(true)
        const data = await fetchProjects()
        const allProjects: Project[] = [
          { id: 'all', name: 'All Projects', color: 'bg-gray-400' },
          ...data.map((p: any) => ({ ...p, color: 'bg-primary' }))
        ]
        setProjects(allProjects)
      } catch (err) {
        setProjectsError(err instanceof Error ? err.message : 'Failed to load projects')
      } finally {
        setLoadingProjects(false)
      }
    }
    loadProjects()
  }, [])

  // Compute first and last day of current month for API
  const monthStart = useMemo(() => new Date(year, month, 1), [year, month])
  const monthEnd = useMemo(() => new Date(year, month + 1, 0), [year, month])
  const startDateStr = toDateStr(monthStart)
  const endDateStr = toDateStr(monthEnd)

  // Fetch occurrences when month, year, or selected project changes
  useEffect(() => {
    const loadOccurrences = async () => {
      if (loadingProjects) return // wait until projects are loaded
      setLoadingOccurrences(true)
      setOccurrencesError(null)
      try {
        const data = await fetchOccurrences(
          startDateStr,
          endDateStr,
          selectedProjectId === 'all' ? undefined : selectedProjectId
        )
        setOccurrences(data)
      } catch (err) {
        setOccurrencesError(err instanceof Error ? err.message : 'Failed to load tasks')
      } finally {
        setLoadingOccurrences(false)
      }
    }
    loadOccurrences()
  }, [month, year, selectedProjectId, loadingProjects, startDateStr, endDateStr])

  // ── Calendar grid ───────────────────────────────
  const days = useMemo<CalendarDay[]>(() => {
    const first    = new Date(year, month, 1)
    const last     = new Date(year, month + 1, 0)
    const startDow = first.getDay()
    const dim      = last.getDate()
    const out: CalendarDay[] = []

    const prevLast = new Date(year, month, 0).getDate()
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevLast - i)
      out.push({ date: d, dateStr: toDateStr(d), isCurrentMonth: false, isToday: isSameDay(d, today) })
    }
    for (let i = 1; i <= dim; i++) {
      const d = new Date(year, month, i)
      out.push({ date: d, dateStr: toDateStr(d), isCurrentMonth: true, isToday: isSameDay(d, today) })
    }
    const rem = 42 - out.length
    for (let i = 1; i <= rem; i++) {
      const d = new Date(year, month + 1, i)
      out.push({ date: d, dateStr: toDateStr(d), isCurrentMonth: false, isToday: isSameDay(d, today) })
    }
    return out
  }, [month, year, today])

  // ── Stats ───────────────────────────────────────
  const stats = useMemo(() => {
    let total = 0
    let completed = 0
    Object.values(occurrences).forEach(dayOccs => {
      total += dayOccs.length
      completed += dayOccs.filter(o => o.completed).length
    })
    return {
      total,
      completed,
      pct: total ? Math.round((completed / total) * 100) : 0
    }
  }, [occurrences])

  // ── Task helpers ───────────────────────────────
  const tasksOnDate = (dateStr: string) => occurrences[dateStr] || []

  // ── Toggle (with optimistic update + API) ───────
  const toggleTask = async (occurrenceId: string, dateStr: string) => {
    // Prevent double toggling
    if (togglingIds.has(occurrenceId)) return

    // Find current occurrence to get its current completed status
    const currentOccurrence = occurrences[dateStr]?.find(o => o.occurrenceId === occurrenceId)
    if (!currentOccurrence) return

    const newCompleted = !currentOccurrence.completed
    const previousCompleted = currentOccurrence.completed

    // Optimistic update
    setOccurrences(prev => {
      const updated = { ...prev }
      if (updated[dateStr]) {
        updated[dateStr] = updated[dateStr].map(occ =>
          occ.occurrenceId === occurrenceId
            ? { ...occ, completed: newCompleted }
            : occ
        )
      }
      return updated
    })

    // Mark as toggling
    setTogglingIds(prev => new Set(prev).add(occurrenceId))

    try {
      await toggleOccurrence(occurrenceId)
    } catch (error) {
      // Revert on error
      setOccurrences(prev => {
        const updated = { ...prev }
        if (updated[dateStr]) {
          updated[dateStr] = updated[dateStr].map(occ =>
            occ.occurrenceId === occurrenceId
              ? { ...occ, completed: previousCompleted }
              : occ
          )
        }
        return updated
      })
      console.error('Toggle failed:', error)
    } finally {
      // Remove from toggling set
      setTogglingIds(prev => {
        const next = new Set(prev)
        next.delete(occurrenceId)
        return next
      })
    }
  }

  // ── Navigation ──────────────────────────────────
  const nav = (delta: number) => {
    const d = new Date(year, month + delta, 1)
    setMonth(d.getMonth())
    setYear(d.getFullYear())
  }
  const goToday = () => {
    setMonth(today.getMonth())
    setYear(today.getFullYear())
  }

  // ── Selection ───────────────────────────────────
  const openSheet = (day: CalendarDay) => {
    setSelectedDate(day.date)
    setSheetOpen(true)
  }
  const selDs = selectedDate ? toDateStr(selectedDate) : ''
  const selOccurrences = selectedDate ? tasksOnDate(selDs) : []

  // ── Project dropdown ────────────────────────────
  const selectedProject = projects.find(p => p.id === selectedProjectId) ?? {
    id: 'all',
    name: 'All Projects',
    color: 'bg-gray-400'
  }

  if (loadingProjects) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (projectsError) {
    return (
      <div className='flex h-screen flex-col items-center justify-center gap-2'>
        <p className='text-destructive'>Error loading projects: {projectsError}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className='mx-auto w-full space-y-4 p-4 md:p-6'>

        {/* ───── Header Card ───── */}
        <Card>
          <CardContent className='space-y-4 p-4 md:p-6'>
            <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
              <div className='flex items-center gap-4'>
                <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10'>
                  <CalendarDays className='h-5 w-5 text-primary' />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold tracking-tight md:text-4xl ${qualyFontFamily.className}`}>
                    {MONTHS[month]} {year}
                  </h1>
                  {loadingOccurrences ? (
                    <p className='text-sm text-muted-foreground'>Loading tasks…</p>
                  ) : (
                    <p className='text-sm text-muted-foreground'>
                      {stats.completed} of {stats.total} task-days completed
                    </p>
                  )}
                </div>
              </div>

              <div className='flex items-center gap-2'>
                {/* Project Selector */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant='outline'
                      size='sm'
                      role='combobox'
                      className='h-9 w-50 justify-between gap-2 font-medium shadow-sm transition-all hover:shadow-md'
                    >
                      <span className='flex items-center gap-2 truncate'>
                        <span className={cn('h-2 w-2 shrink-0 rounded-full', selectedProject.color)} />
                        <FolderKanban className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
                        <span className='truncate text-xs'>{selectedProject.name}</span>
                      </span>
                      <ChevronsUpDown className='h-3.5 w-3.5 shrink-0 opacity-50' />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-55 p-0' align='end'>
                    <Command>
                      <CommandInput placeholder='Search projects…' className='h-9 text-xs' />
                      <CommandList>
                        <CommandEmpty className='py-4 text-center text-xs text-muted-foreground'>
                          No project found.
                        </CommandEmpty>
                        <CommandGroup>
                          {projects.map((project) => (
                            <CommandItem
                              key={project.id}
                              value={project.name}
                              onSelect={() => {
                                setSelectedProjectId(project.id)
                              }}
                              className='flex items-center gap-2 text-xs'
                            >
                              <span className={cn('h-2 w-2 shrink-0 rounded-full', project.color)} />
                              <span className='flex-1 truncate'>{project.name}</span>
                              <Check
                                className={cn(
                                  'h-3.5 w-3.5 shrink-0',
                                  selectedProjectId === project.id ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <Separator orientation='vertical' className='mx-1 h-5' />

                <Button variant='outline' size='sm' className='text-xs' onClick={goToday}>
                  Today
                </Button>
                <div className='flex items-center rounded-lg border'>
                  <Button variant='ghost' size='icon' className='h-8 w-8 rounded-r-none' onClick={() => nav(-1)}>
                    <ChevronLeft className='h-4 w-4' />
                  </Button>
                  <Separator orientation='vertical' className='h-4' />
                  <Button variant='ghost' size='icon' className='h-8 w-8 rounded-l-none' onClick={() => nav(1)}>
                    <ChevronRight className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            </div>

            <div className='border-t pt-4'>
              <div className='mb-2 flex items-center justify-between'>
                <span className='text-xs font-medium text-muted-foreground'>Monthly Progress</span>
                {loadingOccurrences ? (
                  <Loader2 className='h-3 w-3 animate-spin' />
                ) : (
                  <span className={`text-2xl font-semibold ${qualyFontFamily.className}`}>{stats.pct}%</span>
                )}
              </div>
              {loadingOccurrences ? (
                <div className='h-2 w-full animate-pulse rounded-full bg-muted' />
              ) : (
                <Progress value={stats.pct} className='h-2' />
              )}
            </div>

            <div className='flex items-center gap-6 border-t pt-3'>
              {[
                { color: 'bg-blue-500',    label: 'Recurring' },
                { color: 'bg-amber-500',   label: 'One-time'  },
                { color: 'bg-emerald-500', label: 'Completed' },
              ].map((l) => (
                <div key={l.label} className='flex items-center gap-2 text-xs text-muted-foreground'>
                  <span className={cn('h-2.5 w-2.5 rounded-full', l.color)} />
                  {l.label}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ───── Calendar Grid ───── */}
        <Card className='overflow-hidden'>
          <CardContent className='p-0'>
            <div className='grid grid-cols-7 bg-muted/50'>
              {DOW.map((d) => (
                <div key={d} className='py-3 text-center text-[18px] font-semibold uppercase tracking-wider text-muted-foreground'>
                  {d}
                </div>
              ))}
            </div>

            <div className='grid grid-cols-7'>
              {days.map((day, i) => {
                const dayOccurrences = tasksOnDate(day.dateStr)
                const doneCount = dayOccurrences.filter(o => o.completed).length
                const visible = dayOccurrences.slice(0, MAX_VISIBLE)
                const overflow = dayOccurrences.length - MAX_VISIBLE
                const isSel = selectedDate && isSameDay(day.date, selectedDate)
                const allDone = dayOccurrences.length > 0 && doneCount === dayOccurrences.length

                return (
                  <div
                    key={i}
                    role='button'
                    tabIndex={0}
                    onClick={() => openSheet(day)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openSheet(day) }}
                    className={cn(
                      'relative flex min-h-27.5 flex-col border-r border-t p-1.5 transition-colors md:min-h-33 md:p-2',
                      'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                      'hover:bg-muted/40',
                      !day.isCurrentMonth && 'bg-muted/25 opacity-40',
                      isSel && 'bg-primary/5 ring-2 ring-inset ring-primary/50',
                      (i + 1) % 7 === 0 && 'border-r-0',
                    )}
                  >
                    {/* date number + badge */}
                    <div className='mb-1 flex items-center justify-between'>
                      <span
                        className={cn(
                          'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
                          day.isToday && 'bg-primary font-bold text-primary-foreground',
                          !day.isToday && day.isCurrentMonth && 'text-foreground',
                          !day.isCurrentMonth && 'text-muted-foreground',
                        )}
                      >
                        {day.date.getDate()}
                      </span>

                      {dayOccurrences.length > 0 && day.isCurrentMonth && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant='secondary'
                              className={cn(
                                'h-5 px-1.5 text-[10px] font-semibold tabular-nums',
                                allDone && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
                              )}
                            >
                              {doneCount}/{dayOccurrences.length}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side='top' className='text-xs'>
                            {doneCount} of {dayOccurrences.length} done
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>

                    {/* inline task list */}
                    {day.isCurrentMonth && (
                      <div className='flex-1 space-y-px'>
                        {visible.map((occ) => {
                          const d = occ.completed
                          const isToggling = togglingIds.has(occ.occurrenceId)

                          return (
                            <label
                              key={occ.occurrenceId}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                              className={cn(
                                'flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.75 transition-colors hover:bg-background/80',
                                d && 'opacity-50',
                              )}
                            >
                              {isToggling ? (
                                <Loader2 className='h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground' />
                              ) : (
                                <Checkbox
                                  checked={d}
                                  onCheckedChange={() => toggleTask(occ.occurrenceId, day.dateStr)}
                                  className='h-3.5 w-3.5 shrink-0 rounded-lg'
                                />
                              )}
                              <span
                                className={cn(
                                  'h-1.5 w-1.5 shrink-0 rounded-full',
                                  d ? 'bg-emerald-500' : occ.taskType === 'recurring' ? 'bg-blue-500' : 'bg-amber-500',
                                )}
                              />
                              <span className={cn('truncate text-[16px] leading-tight', d && 'text-muted-foreground line-through')}>
                                {occ.taskName}
                              </span>
                            </label>
                          )
                        })}

                        {overflow > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openSheet(day) }}
                            className='pl-1 text-[11px] font-medium text-primary transition-colors hover:text-primary/80 hover:underline'
                          >
                            +{overflow} more
                          </button>
                        )}
                      </div>
                    )}

                    {/* thin progress bar at bottom */}
                    {dayOccurrences.length > 0 && day.isCurrentMonth && (
                      <div className='absolute inset-x-0 bottom-0 h-0.75 overflow-hidden'>
                        <div
                          className={cn('h-full transition-all duration-300', allDone ? 'bg-emerald-500/60' : 'bg-primary/25')}
                          style={{ width: `${(doneCount / dayOccurrences.length) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* ───── Detail Sheet ───── */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className='w-full sm:max-w-xl'>
            <SheetHeader>
              <SheetTitle className='flex items-center gap-2'>
                <CalendarCheck className='h-5 w-5 text-primary' />
                {selectedDate?.toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                })}
              </SheetTitle>
              <SheetDescription>
                {selOccurrences.length === 0
                  ? 'No tasks scheduled for this date.'
                  : `${selOccurrences.filter(o => o.completed).length} of ${selOccurrences.length} tasks completed`}
              </SheetDescription>
            </SheetHeader>

            <Separator className='my-4' />

            <ScrollArea className='h-[calc(100vh-200px)] pr-4'>
              {selOccurrences.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-16 text-center'>
                  <div className='mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted'>
                    <CalendarDays className='h-8 w-8 text-muted-foreground/40' />
                  </div>
                  <p className='text-sm font-medium text-muted-foreground'>Nothing scheduled</p>
                  <p className='mt-1 text-xs text-muted-foreground/70'>No tasks are due on this date.</p>
                </div>
              ) : (
                <div className='space-y-3 w-full px-4'>
                  {selOccurrences.map((occ) => {
                    const d = occ.completed
                    const isToggling = togglingIds.has(occ.occurrenceId)

                    return (
                      <Card
                        key={occ.occurrenceId}
                        role='button'
                        tabIndex={0}
                        onClick={() => toggleTask(occ.occurrenceId, selDs)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTask(occ.occurrenceId, selDs) }
                        }}
                        className={cn(
                          'cursor-pointer select-none transition-colors duration-200',
                          'hover:bg-muted/50 hover:border-primary/20 py-2',
                          'active:bg-muted',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          d && 'bg-emerald-50/50 opacity-60 hover:bg-emerald-50 hover:opacity-75 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40',
                        )}
                      >
                        <CardContent className='p-5'>
                          <div className='flex items-start gap-3'>
                            {isToggling ? (
                              <Loader2 className='mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground' />
                            ) : (
                              <Checkbox
                                checked={d}
                                onCheckedChange={() => toggleTask(occ.occurrenceId, selDs)}
                                onClick={(e) => e.stopPropagation()}
                                className='mt-0.5'
                              />
                            )}
                            <div className='min-w-0 flex-1 space-y-2'>
                              <div className='flex flex-wrap items-center gap-2'>
                                <p
                                  className={cn(
                                    'text-xl font-medium leading-snug transition-colors duration-200',
                                    d && 'text-muted-foreground line-through',
                                  )}
                                >
                                  {occ.taskName}
                                </p>
                              </div>

                              <Badge
                                variant='outline'
                                className={cn(
                                  'h-5 gap-1 text-[10px]',
                                  occ.taskType === 'recurring'
                                    ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-400'
                                    : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400',
                                )}
                              >
                                {occ.taskType === 'recurring' ? <Repeat className='h-3 w-3' /> : <Clock className='h-3 w-3' />}
                                {occ.taskType === 'recurring' ? 'Recurring' : 'One-time'}
                              </Badge>

                              {occ.taskType === 'recurring' && occ.recurrenceDays.length > 0 && (
                                  <DaysOfWeekIndicator activeDays={occ.recurrenceDays} />
                                )}

                              {occ.taskType === 'recurring' && occ.startDate && occ.endDate && (
                                <p className='flex items-center gap-1 text-[11px] text-muted-foreground'>
                                  <CalendarDays className='h-3 w-3' />
                                  {new Date(occ.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  {' → '}
                                  {new Date(occ.endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  )
}

export default CalendarTaskView