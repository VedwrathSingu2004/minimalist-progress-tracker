'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Flame,
  Trophy,
  BarChart3,
  CalendarCheck,
  TrendingUp,
  Loader2,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { fetchHeatmapData } from '@/lib/api/tasks'

const MONTH_LABELS = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
]

const HEAT_COLORS_DARK = ['#1a1e2b', '#0e4429', '#006d32', '#26a641', '#39d353']
const HEAT_COLORS_LIGHT = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']

interface DayData {
  date: Date
  count: number
  dayOfWeek: number
  weekIndex: number
  inYear: boolean
  isToday: boolean
}

const CELL_SIZE = 14
const CELL_GAP = 3
const DAY_LABEL_WIDTH = 36
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function TaskCompletionHeatmapView() {
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [data, setData] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)

  const { resolvedTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted ? resolvedTheme === 'dark' : true
  const heatColors = isDark ? HEAT_COLORS_DARK : HEAT_COLORS_LIGHT

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const points = await fetchHeatmapData(parseInt(year))
        const map = new Map<string, number>()
        points.forEach(p => map.set(p.date, p.count))
        setData(map)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load heatmap data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [year])

  const { grid, totalWeeks, monthPositions, maxCount, stats } = useMemo(() => {
    if (!data.size) {
      const jan1 = new Date(parseInt(year), 0, 1)
      const dec31 = new Date(parseInt(year), 11, 31)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const jan1Dow = jan1.getDay()
      const daysToMonday = jan1Dow === 0 ? 6 : jan1Dow - 1
      const gridStart = new Date(parseInt(year), 0, 1 - daysToMonday)

      const dec31Dow = dec31.getDay()
      const daysToSunday = dec31Dow === 0 ? 0 : 7 - dec31Dow
      const gridEnd = new Date(parseInt(year), 11, 31 + daysToSunday)

      const days: DayData[] = []
      const current = new Date(gridStart)

      while (current <= gridEnd) {
        const inYear = current.getFullYear() === parseInt(year)
        const jsDay = current.getDay()
        const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1
        const diffDays = Math.round(
          (current.getTime() - gridStart.getTime()) / 86400000
        )
        const weekIndex = Math.floor(diffDays / 7)

        const isToday =
          current.getFullYear() === today.getFullYear() &&
          current.getMonth() === today.getMonth() &&
          current.getDate() === today.getDate()

        days.push({
          date: new Date(current),
          count: 0,
          dayOfWeek,
          weekIndex,
          inYear,
          isToday,
        })
        current.setDate(current.getDate() + 1)
      }

      const totalWeeks = Math.max(...days.map((d) => d.weekIndex)) + 1

      const grid: (DayData | null)[][] = Array.from({ length: 7 }, () =>
        Array(totalWeeks).fill(null)
      )
      days.forEach((d) => {
        grid[d.dayOfWeek][d.weekIndex] = d
      })

      const monthPositions: { label: string; weekIndex: number }[] = []
      for (let m = 0; m < 12; m++) {
        const firstOfMonth = new Date(parseInt(year), m, 1)
        const diffMs = firstOfMonth.getTime() - gridStart.getTime()
        const weekIdx = Math.floor(diffMs / (7 * 86400000))
        monthPositions.push({ label: MONTH_LABELS[m], weekIndex: weekIdx })
      }

      const stats = {
        total: 0,
        activeDays: 0,
        maxCount: 0,
        average: '0.0',
        longestStreak: 0,
        totalDays: days.filter(d => d.inYear).length,
        completionRate: '0',
      }

      return { grid, totalWeeks, monthPositions, maxCount: 0, stats }
    }

    const jan1 = new Date(parseInt(year), 0, 1)
    const dec31 = new Date(parseInt(year), 11, 31)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const jan1Dow = jan1.getDay()
    const daysToMonday = jan1Dow === 0 ? 6 : jan1Dow - 1
    const gridStart = new Date(parseInt(year), 0, 1 - daysToMonday)

    const dec31Dow = dec31.getDay()
    const daysToSunday = dec31Dow === 0 ? 0 : 7 - dec31Dow
    const gridEnd = new Date(parseInt(year), 11, 31 + daysToSunday)

    const days: DayData[] = []
    const current = new Date(gridStart)

    while (current <= gridEnd) {
      const inYear = current.getFullYear() === parseInt(year)
      const jsDay = current.getDay()
      const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1
      const diffDays = Math.round(
        (current.getTime() - gridStart.getTime()) / 86400000
      )
      const weekIndex = Math.floor(diffDays / 7)

      const isToday =
        current.getFullYear() === today.getFullYear() &&
        current.getMonth() === today.getMonth() &&
        current.getDate() === today.getDate()

      const dateStr = current.toISOString().split('T')[0]
      const count = data.get(dateStr) || 0

      days.push({
        date: new Date(current),
        count,
        dayOfWeek,
        weekIndex,
        inYear,
        isToday,
      })
      current.setDate(current.getDate() + 1)
    }

    const totalWeeks = Math.max(...days.map((d) => d.weekIndex)) + 1

    const grid: (DayData | null)[][] = Array.from({ length: 7 }, () =>
      Array(totalWeeks).fill(null)
    )
    days.forEach((d) => {
      grid[d.dayOfWeek][d.weekIndex] = d
    })

    const monthPositions: { label: string; weekIndex: number }[] = []
    for (let m = 0; m < 12; m++) {
      const firstOfMonth = new Date(parseInt(year), m, 1)
      const diffMs = firstOfMonth.getTime() - gridStart.getTime()
      const weekIdx = Math.floor(diffMs / (7 * 86400000))
      monthPositions.push({ label: MONTH_LABELS[m], weekIndex: weekIdx })
    }

    const yearDays = days.filter((d) => d.inYear)
    const counts = yearDays.map((d) => d.count)
    const total = counts.reduce((a, b) => a + b, 0)
    const activeDays = counts.filter((c) => c > 0).length
    const maxCount = Math.max(...counts)
    const average = (total / counts.length).toFixed(1)

    let longestStreak = 0
    let streak = 0
    yearDays
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .forEach((d) => {
        if (d.count > 0) {
          streak++
          longestStreak = Math.max(longestStreak, streak)
        } else {
          streak = 0
        }
      })

    const completionRate = ((activeDays / counts.length) * 100).toFixed(0)

    const stats = {
      total,
      activeDays,
      maxCount,
      average,
      longestStreak,
      totalDays: counts.length,
      completionRate,
    }

    return { grid, totalWeeks, monthPositions, maxCount, stats }
  }, [data, year])

  const getColor = useCallback(
    (cell: DayData | null): string => {
      if (!cell || !cell.inYear) return 'transparent'
      if (cell.count === 0) return heatColors[0]
      if (maxCount === 0) return heatColors[0]
      const ratio = cell.count / maxCount
      if (ratio < 0.25) return heatColors[1]
      if (ratio < 0.5) return heatColors[2]
      if (ratio < 0.75) return heatColors[3]
      return heatColors[4]
    },
    [maxCount, heatColors]
  )

  const handleMouseEnter = useCallback(
    (day: DayData, e: React.MouseEvent) => {
      setHoveredDay(day)
      const rect = (e.target as HTMLElement).getBoundingClientRect()
      setTooltipPos({
        x: rect.left + rect.width / 2,
        y: rect.top,
      })
    },
    []
  )

  const handleMouseLeave = useCallback(() => {
    setHoveredDay(null)
  }, [])

  const gridWidth = totalWeeks * (CELL_SIZE + CELL_GAP)

  const statCards = [
    {
      icon: <Flame className='w-4 h-4' />,
      label: 'Longest Streak',
      value: stats.longestStreak,
      unit: 'days',
      accent: 'from-orange-500/20 to-red-500/20 dark:from-orange-500/20 dark:to-red-500/20',
      iconColor: 'text-orange-500 dark:text-orange-400',
      borderAccent: 'border-orange-500/30 dark:border-orange-500/20',
    },
    {
      icon: <Trophy className='w-4 h-4' />,
      label: 'Peak Day',
      value: stats.maxCount,
      unit: 'tasks',
      accent: 'from-yellow-500/20 to-amber-500/20 dark:from-yellow-500/20 dark:to-amber-500/20',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      borderAccent: 'border-yellow-500/30 dark:border-yellow-500/20',
    },
    {
      icon: <BarChart3 className='w-4 h-4' />,
      label: 'Daily Average',
      value: stats.average,
      unit: 'tasks',
      accent: 'from-blue-500/20 to-cyan-500/20 dark:from-blue-500/20 dark:to-cyan-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      borderAccent: 'border-blue-500/30 dark:border-blue-500/20',
    },
    {
      icon: <CalendarCheck className='w-4 h-4' />,
      label: 'Active Days',
      value: stats.activeDays,
      unit: `/ ${stats.totalDays}`,
      accent: 'from-emerald-500/20 to-green-500/20 dark:from-emerald-500/20 dark:to-green-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      borderAccent: 'border-emerald-500/30 dark:border-emerald-500/20',
    },
  ]

  if (loading) {
    return (
      <Card className='w-full h-96 flex items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </Card>
    )
  }

  if (error) {
    return (
      <Card className='w-full h-96 flex items-center justify-center'>
        <p className='text-destructive'>Error: {error}</p>
      </Card>
    )
  }

  return (
    <Card className='w-full overflow-hidden border-border/50
                     bg-linear-to-br from-background via-background to-muted/30'>
      {/* Decorative top accent line */}
      <div className='h-0.5 w-full bg-linear-to-r from-transparent via-emerald-500/60 to-transparent' />

      <CardHeader className='pb-3 pt-5'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
          <div className='space-y-1.5'>
            <div className='flex items-center gap-2.5'>
              <div className='flex items-center justify-center w-8 h-8 rounded-lg
                              bg-emerald-500/10 border border-emerald-500/20
                              dark:bg-emerald-500/10 dark:border-emerald-500/20'>
                <TrendingUp className='w-4 h-4 text-emerald-600 dark:text-emerald-400' />
              </div>
              <CardTitle className='text-xl font-semibold tracking-tight'>
                Task Completion Activity
              </CardTitle>
            </div>
            <p className='text-sm text-muted-foreground pl-10.5'>
              Daily task completions throughout {year}
            </p>
          </div>

          <div className='flex items-center gap-3'>
            {/* Total badge */}
            <div className='hidden md:flex items-center gap-2 rounded-full
                            bg-emerald-500/10 border border-emerald-500/20
                            px-4 py-2 backdrop-blur-sm'>
              <div className='w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse' />
              <span className='text-sm font-bold text-emerald-600 dark:text-emerald-400'>
                {stats.total.toLocaleString()}
              </span>
              <span className='text-xs text-muted-foreground'>completed</span>
            </div>

            {/* Completion rate badge */}
            <div className='hidden lg:flex items-center gap-2 rounded-full
                            bg-blue-500/10 border border-blue-500/20
                            px-4 py-2 backdrop-blur-sm'>
              <span className='text-sm font-bold text-blue-600 dark:text-blue-400'>
                {stats.completionRate}%
              </span>
              <span className='text-xs text-muted-foreground'>active rate</span>
            </div>

            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className='w-28 bg-muted/50 border-border/50'>
                <SelectValue placeholder='Year' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='2023'>2023</SelectItem>
                <SelectItem value='2024'>2024</SelectItem>
                <SelectItem value='2025'>2025</SelectItem>
                <SelectItem value='2026'>2026</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className='space-y-5 pb-6'>
        {/* Stat Cards */}
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
          {statCards.map((s) => (
            <div
              key={s.label}
              className={`group relative rounded-xl border ${s.borderAccent}
                         bg-linear-to-br ${s.accent}
                         p-4 transition-all duration-300
                         hover:scale-[1.02] hover:shadow-lg
                         hover:shadow-black/5 dark:hover:shadow-black/10`}
            >
              <div className='absolute inset-0 rounded-xl bg-linear-to-br
                              from-white/5 to-transparent
                              dark:from-white/2 dark:to-transparent
                              pointer-events-none' />
              <div className='relative'>
                <div className='flex items-center gap-2 mb-2'>
                  <div className={`${s.iconColor} opacity-80`}>{s.icon}</div>
                  <span className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
                    {s.label}
                  </span>
                </div>
                <p className='text-2xl font-bold tracking-tight'>
                  {s.value}
                  <span className='text-sm font-normal text-muted-foreground ml-1.5'>
                    {s.unit}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Heatmap Grid */}
        <div className='w-full overflow-x-auto rounded-2xl border border-border/40
                        bg-linear-to-br from-muted/30 via-muted/10 to-muted/30
                        p-5 shadow-inner'>
          <div style={{ minWidth: DAY_LABEL_WIDTH + gridWidth + 16 }}>
            {/* Month Labels */}
            <div
              className='flex'
              style={{ paddingLeft: DAY_LABEL_WIDTH, marginBottom: 10 }}
            >
              {monthPositions.map((mp, i) => {
                const nextStart =
                  i < monthPositions.length - 1
                    ? monthPositions[i + 1].weekIndex
                    : totalWeeks
                const spanWeeks = nextStart - mp.weekIndex
                return (
                  <div
                    key={mp.label}
                    className='text-[11px] text-muted-foreground font-semibold uppercase tracking-wider'
                    style={{
                      width: spanWeeks * (CELL_SIZE + CELL_GAP),
                      flexShrink: 0,
                    }}
                  >
                    {mp.label}
                  </div>
                )
              })}
            </div>

            {/* Day Rows */}
            {grid.map((row, dayIdx) => (
              <div
                key={dayIdx}
                className='flex items-center'
                style={{ height: CELL_SIZE + CELL_GAP }}
              >
                <div
                  className='text-[11px] text-muted-foreground/70 font-medium shrink-0 select-none'
                  style={{ width: DAY_LABEL_WIDTH }}
                >
                  {DAY_LABELS[dayIdx]}
                </div>
                <div className='flex' style={{ gap: CELL_GAP }}>
                  {row.map((cell, weekIdx) => {
                    const isToday = cell?.isToday ?? false
                    return (
                      <div
                        key={weekIdx}
                        className={`rounded-[3px] transition-all duration-150
                          ${cell && cell.inYear
                            ? `hover:scale-[1.4] hover:z-10 cursor-pointer
                               hover:ring-2 hover:ring-foreground/20 hover:shadow-lg`
                            : ''
                          }
                          ${isToday
                            ? 'ring-2 ring-foreground/60 ring-offset-1 ring-offset-background z-10'
                            : ''
                          }
                        `}
                        style={{
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          backgroundColor: getColor(cell),
                        }}
                        onMouseEnter={(e) =>
                          cell && cell.inYear && handleMouseEnter(cell, e)
                        }
                        onMouseLeave={handleMouseLeave}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tooltip */}
        {hoveredDay && (
          <div
            className='fixed z-50 pointer-events-none'
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y - 12,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className='relative rounded-xl bg-popover/95 backdrop-blur-md
                            border border-border shadow-2xl
                            shadow-black/10 dark:shadow-black/30
                            px-4 py-3 text-xs'>
              <div className='absolute -bottom-1.25 left-1/2 -translate-x-1/2
                              w-2.5 h-2.5 rotate-45
                              bg-popover/95 border-r border-b border-border' />
              <p className='font-semibold text-foreground text-[13px]'>
                {hoveredDay.date.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <div className='flex items-center gap-1.5 mt-1.5'>
                <div
                  className='w-2.5 h-2.5 rounded-sm'
                  style={{ backgroundColor: getColor(hoveredDay) }}
                />
                <p className='text-emerald-600 dark:text-emerald-400 font-medium'>
                  {hoveredDay.count}{' '}
                  {hoveredDay.count === 1 ? 'task' : 'tasks'} completed
                </p>
              </div>
              {hoveredDay.isToday && (
                <p className='text-blue-600 dark:text-blue-400 mt-1 font-medium'>
                  📍 Today
                </p>
              )}
            </div>
          </div>
        )}

        {/* Bottom Bar: Legend + Today indicator */}
        <div className='flex items-center justify-between pt-1'>
          {/* Today indicator */}
          <div className='flex items-center gap-2'>
            <div className='w-3.5 h-3.5 rounded-[3px] bg-muted
                            ring-2 ring-foreground/60
                            ring-offset-1 ring-offset-background' />
            <span className='text-[11px] text-muted-foreground font-medium'>Today</span>
          </div>

          {/* Legend */}
          <div className='flex items-center gap-2'>
            <span className='text-[11px] text-muted-foreground font-medium mr-0.5'>
              Less
            </span>
            <div className='flex items-center gap-0.75'>
              {heatColors.map((color, i) => (
                <div
                  key={i}
                  className='w-3.5 h-3.5 rounded-[3px] transition-transform hover:scale-125
                             border border-black/5 dark:border-white/5'
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <span className='text-[11px] text-muted-foreground font-medium ml-0.5'>
              More
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}