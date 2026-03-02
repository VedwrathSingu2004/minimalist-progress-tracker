'use client'

import { useState, useMemo } from 'react'
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

// ── Icons (lucide-react, ships with ShadCN) ──────
import {
  ChevronLeft,
  ChevronRight,
  Repeat,
  Clock,
  CalendarDays,
  CalendarCheck,
} from 'lucide-react'
import { qualyFontFamily } from '@/lib/fonts'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface Task {
  id: string
  taskName: string
  taskType: 'one_time' | 'recurring'
  date?: string          // YYYY-MM-DD (one_time)
  startDate?: string     // YYYY-MM-DD (recurring)
  endDate?: string       // YYYY-MM-DD (recurring)
  daysOfWeek?: number[]  // 0=Sun … 6=Sat  (recurring)
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

const cKey = (taskId: string, dateStr: string) => `${taskId}::${dateStr}`

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Days-of-Week Indicator
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
// Mock Data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const buildMockTasks = (): Task[] => {
  const n = new Date()
  const y = n.getFullYear()
  const m = n.getMonth()
  const d = (day: number) => toDateStr(new Date(y, m, day))

  return [
    { id: '1',  taskName: 'Team standup',              taskType: 'recurring', startDate: d(1),  endDate: d(25), daysOfWeek: [1,2,3,4,5] },
    { id: '2',  taskName: 'Gym workout',               taskType: 'recurring', startDate: d(1),  endDate: d(28), daysOfWeek: [1,3,5] },
    { id: '3',  taskName: 'Submit quarterly report',   taskType: 'one_time',  date: d(5) },
    { id: '4',  taskName: 'Client presentation',       taskType: 'one_time',  date: d(10) },
    { id: '5',  taskName: 'Code review session',       taskType: 'recurring', startDate: d(3),  endDate: d(17), daysOfWeek: [2,4] },
    { id: '6',  taskName: 'Design system sync',        taskType: 'one_time',  date: d(12) },
    { id: '7',  taskName: 'Deploy v2.1 to production', taskType: 'one_time',  date: d(15) },
    { id: '8',  taskName: 'Write API documentation',   taskType: 'one_time',  date: d(15) },
    { id: '9',  taskName: 'Team lunch',                taskType: 'one_time',  date: d(20) },
    { id: '10', taskName: 'Sprint retrospective',      taskType: 'one_time',  date: d(22) },
    { id: '11', taskName: 'Update dependencies',       taskType: 'one_time',  date: d(8) },
    { id: '12', taskName: 'Performance review prep',   taskType: 'one_time',  date: d(18) },
    { id: '13', taskName: 'Read engineering blog',     taskType: 'recurring', startDate: d(1),  endDate: d(14), daysOfWeek: [0,6] },
  ]
}

const buildInitialCompletions = (): Set<string> => {
  const n = new Date()
  const y = n.getFullYear()
  const m = n.getMonth()
  const today = n.getDate()
  const s = new Set<string>()

  for (let day = 1; day < Math.min(today, 6); day++) {
    const ds = toDateStr(new Date(y, m, day))
    s.add(cKey('1', ds))
    s.add(cKey('2', ds))
  }
  if (today > 5)  s.add(cKey('3',  toDateStr(new Date(y, m, 5))))
  if (today > 8)  s.add(cKey('11', toDateStr(new Date(y, m, 8))))
  if (today > 10) s.add(cKey('4',  toDateStr(new Date(y, m, 10))))
  return s
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MAX_VISIBLE = 3

const CalendarTaskView = () => {
  /* ── state ─────────────────────────────────── */
  const today = useMemo(() => new Date(), [])
  const [month, setMonth]               = useState(today.getMonth())
  const [year, setYear]                 = useState(today.getFullYear())
  const [tasks]                         = useState<Task[]>(buildMockTasks)
  const [completions, setCompletions]   = useState<Set<string>>(buildInitialCompletions)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [sheetOpen, setSheetOpen]       = useState(false)

  /* ── calendar grid ─────────────────────────── */
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

  /* ── task helpers (now respects daysOfWeek) ── */
  const tasksOn = (ds: string) => {
    const date = new Date(ds + 'T00:00:00')
    const dow  = date.getDay()
    return tasks.filter((t) => {
      if (t.taskType === 'one_time') return t.date === ds
      if (ds >= t.startDate! && ds <= t.endDate!) {
        if (t.daysOfWeek && t.daysOfWeek.length > 0) return t.daysOfWeek.includes(dow)
        return true
      }
      return false
    })
  }

  const done = (id: string, ds: string) => completions.has(cKey(id, ds))

  const toggle = (id: string, ds: string) =>
    setCompletions((prev) => {
      const next = new Set(prev)
      const k = cKey(id, ds)
      next.has(k) ? next.delete(k) : next.add(k)
      return next
    })

  /* ── stats (respects daysOfWeek) ─────────── */
  const stats = useMemo(() => {
    const firstDs  = toDateStr(new Date(year, month, 1))
    const lastDate = new Date(year, month + 1, 0)
    const lastDs   = toDateStr(lastDate)
    const dim      = lastDate.getDate()
    let total = 0
    let comp  = 0

    for (const t of tasks) {
      if (t.taskType === 'one_time') {
        if (t.date! >= firstDs && t.date! <= lastDs) {
          total++
          if (completions.has(cKey(t.id, t.date!))) comp++
        }
      } else {
        for (let d = 1; d <= dim; d++) {
          const ds  = toDateStr(new Date(year, month, d))
          if (ds >= t.startDate! && ds <= t.endDate!) {
            const dow = new Date(year, month, d).getDay()
            if (t.daysOfWeek && t.daysOfWeek.length > 0 && !t.daysOfWeek.includes(dow)) continue
            total++
            if (completions.has(cKey(t.id, ds))) comp++
          }
        }
      }
    }

    return { total, comp, pct: total ? Math.round((comp / total) * 100) : 0 }
  }, [tasks, completions, month, year])

  /* ── navigation ────────────────────────────── */
  const nav     = (delta: number) => { const d = new Date(year, month + delta, 1); setMonth(d.getMonth()); setYear(d.getFullYear()) }
  const goToday = () => { setMonth(today.getMonth()); setYear(today.getFullYear()) }

  /* ── selection ─────────────────────────────── */
  const openSheet = (day: CalendarDay) => { setSelectedDate(day.date); setSheetOpen(true) }
  const selDs     = selectedDate ? toDateStr(selectedDate) : ''
  const selTasks  = selectedDate ? tasksOn(selDs) : []

  /* ── render ────────────────────────────────── */
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
                  <p className='text-sm text-muted-foreground'>
                    {stats.comp} of {stats.total} task-days completed
                  </p>
                </div>
              </div>

              <div className='flex items-center gap-2'>
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
                <span className='text-xs font-semibold'>{stats.pct}%</span>
              </div>
              <Progress value={stats.pct} className='h-2' />
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
                const dt        = tasksOn(day.dateStr)
                const doneCount = dt.filter((t) => done(t.id, day.dateStr)).length
                const visible   = dt.slice(0, MAX_VISIBLE)
                const overflow  = dt.length - MAX_VISIBLE
                const isSel     = selectedDate && isSameDay(day.date, selectedDate)
                const allDone   = dt.length > 0 && doneCount === dt.length

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

                      {dt.length > 0 && day.isCurrentMonth && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant='secondary'
                              className={cn(
                                'h-5 px-1.5 text-[10px] font-semibold tabular-nums',
                                allDone && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
                              )}
                            >
                              {doneCount}/{dt.length}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side='top' className='text-xs'>
                            {doneCount} of {dt.length} done
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>

                    {/* inline task list */}
                    {day.isCurrentMonth && (
                      <div className='flex-1 space-y-px'>
                        {visible.map((t) => {
                          const d = done(t.id, day.dateStr)
                          return (
                            <label
                              key={t.id}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                              className={cn(
                                'flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.75 transition-colors hover:bg-background/80',
                                d && 'opacity-50',
                              )}
                            >
                              <Checkbox
                                checked={d}
                                onCheckedChange={() => toggle(t.id, day.dateStr)}
                                className='h-3.5 w-3.5 shrink-0 rounded-lg'
                              />
                              <span
                                className={cn(
                                  'h-1.5 w-1.5 shrink-0 rounded-full',
                                  d ? 'bg-emerald-500' : t.taskType === 'recurring' ? 'bg-blue-500' : 'bg-amber-500',
                                )}
                              />
                              <span className={cn('truncate text-[16px] leading-tight', d && 'text-muted-foreground line-through')}>
                                {t.taskName}
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
                    {dt.length > 0 && day.isCurrentMonth && (
                      <div className='absolute inset-x-0 bottom-0 h-0.75 overflow-hidden'>
                        <div
                          className={cn('h-full transition-all duration-300', allDone ? 'bg-emerald-500/60' : 'bg-primary/25')}
                          style={{ width: `${(doneCount / dt.length) * 100}%` }}
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
                {selTasks.length === 0
                  ? 'No tasks scheduled for this date.'
                  : `${selTasks.filter((t) => done(t.id, selDs)).length} of ${selTasks.length} tasks completed`}
              </SheetDescription>
            </SheetHeader>

            <Separator className='my-4' />

            <ScrollArea className='h-[calc(100vh-200px)] pr-4'>
              {selTasks.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-16 text-center'>
                  <div className='mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted'>
                    <CalendarDays className='h-8 w-8 text-muted-foreground/40' />
                  </div>
                  <p className='text-sm font-medium text-muted-foreground'>Nothing scheduled</p>
                  <p className='mt-1 text-xs text-muted-foreground/70'>No tasks are due on this date.</p>
                </div>
              ) : (
                <div className='space-y-3 w-full px-4'>
                  {selTasks.map((t) => {
                    const d = done(t.id, selDs)
                    return (
                      <Card
                        key={t.id}
                        role='button'
                        tabIndex={0}
                        onClick={() => toggle(t.id, selDs)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(t.id, selDs) }
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
                            <Checkbox
                              checked={d}
                              onCheckedChange={() => toggle(t.id, selDs)}
                              onClick={(e) => e.stopPropagation()}
                              className='mt-0.5'
                            />
                            <div className='min-w-0 flex-1 space-y-2'>
                              {/* ★ task name + DOW indicator inline */}
                              <div className='flex flex-wrap items-center gap-2'>
                                <p
                                  className={cn(
                                    'text-xl font-medium leading-snug transition-colors duration-200',
                                    d && 'text-muted-foreground line-through',
                                  )}
                                >
                                  {t.taskName}
                                </p>

                                {/* {t.taskType === 'recurring' && t.daysOfWeek && (
                                  <DaysOfWeekIndicator activeDays={t.daysOfWeek} />
                                )} */}
                              </div>

                              <Badge
                                variant='outline'
                                className={cn(
                                  'h-5 gap-1 text-[10px]',
                                  t.taskType === 'recurring'
                                    ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-400'
                                    : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400',
                                )}
                              >
                                {t.taskType === 'recurring' ? <Repeat className='h-3 w-3' /> : <Clock className='h-3 w-3' />}
                                {t.taskType === 'recurring' ? 'Recurring' : 'One-time'}
                              </Badge>

                              {t.taskType === 'recurring' && t.daysOfWeek && (
                                  <DaysOfWeekIndicator activeDays={t.daysOfWeek} />
                                )}

                              {t.taskType === 'recurring' && t.startDate && t.endDate && (
                                <p className='flex items-center gap-1 text-[11px] text-muted-foreground'>
                                  <CalendarDays className='h-3 w-3' />
                                  {new Date(t.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  {' → '}
                                  {new Date(t.endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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