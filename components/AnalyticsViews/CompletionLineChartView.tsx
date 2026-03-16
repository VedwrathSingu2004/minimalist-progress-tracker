'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState, useRef, useEffect, useMemo, useCallback, useId } from 'react'
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Spline,
  Minus,
  Loader2,
  CalendarIcon,
} from 'lucide-react'
import { fetchDailyStats } from '@/lib/api/tasks'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

const LINE_COLOR = '#08CB00'

interface DataPoint {
  date: Date
  percentage: number
}

type Interpolation = 'linear' | 'smooth'
type RangeOption = 'week' | 'month' | 'year' | 'custom'

// ─── Timezone-safe date helpers ──────────────────────────────────

/** Format a local Date to "YYYY-MM-DD" without UTC conversion */
function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse "YYYY-MM-DD" or "YYYY-MM-DD HH:mm:ss" as LOCAL time */
function parseLocalDate(s: string): Date | null {
  const datePart = s.trim().split(/[\sT]/)[0]
  const parts = datePart.split('-')
  if (parts.length !== 3) return null
  const y = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10) - 1
  const day = parseInt(parts[2], 10)
  const d = new Date(y, m, day)
  if (isNaN(d.getTime())) return null
  return d
}

// ─── Path generators ─────────────────────────────────────────────

function linearLine(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ')
}

function linearArea(pts: { x: number; y: number }[], bottomY: number): string {
  const line = linearLine(pts)
  if (!line || pts.length === 0) return ''
  return `${line} L ${pts[pts.length - 1].x},${bottomY} L ${pts[0].x},${bottomY} Z`
}

function catmullRomLine(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x},${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }
  return d
}

function catmullRomArea(
  pts: { x: number; y: number }[],
  bottomY: number
): string {
  const line = catmullRomLine(pts)
  if (!line || pts.length === 0) return ''
  return `${line} L ${pts[pts.length - 1].x},${bottomY} L ${pts[0].x},${bottomY} Z`
}

// ─── Responsive padding ─────────────────────────────────────────

function getPadding(w: number) {
  if (w < 400) return { top: 16, right: 12, bottom: 36, left: 38 }
  if (w < 640) return { top: 20, right: 20, bottom: 40, left: 44 }
  return { top: 24, right: 28, bottom: 44, left: 52 }
}

// ─── Component ───────────────────────────────────────────────────

export default function CompletionLineChartView() {
  const [range, setRange] = useState<RangeOption>('week')
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [interpolation, setInterpolation] = useState<Interpolation>('linear')
  const [chartData, setChartData] = useState<DataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 320 })
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const rawId = useId()
  const uid = rawId.replace(/:/g, '')

  // ── Compute date range ─────────────────────────────────────────
  const getDateRange = useCallback((): { start: Date; end: Date } => {
    const now = new Date()
    let start: Date
    let end: Date

    if (range === 'week') {
      const day = now.getDay()
      const diffToMonday = day === 0 ? 6 : day - 1
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday)
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
    } else if (range === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    } else if (range === 'year') {
      start = new Date(now.getFullYear(), 0, 1)
      end = new Date(now.getFullYear(), 11, 31)
    } else {
      if (startDate && endDate) {
        start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
        end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
      } else {
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 30)
      }
    }
    return { start, end }
  }, [range, startDate, endDate])

  // ── Fetch data ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      const { start, end } = getDateRange()

      try {
        const stats = await fetchDailyStats(
          toLocalDateString(start),
          toLocalDateString(end)
        )

        if (cancelled) return

        const points: DataPoint[] = stats
          .map((item) => {
            const date = parseLocalDate(item.date)
            if (!date) {
              console.warn('Invalid date from API:', item.date)
              return null
            }
            return { date, percentage: Number(item.progressPercent) }
          })
          .filter(Boolean) as DataPoint[]

        points.sort((a, b) => a.date.getTime() - b.date.getTime())
        setChartData(points)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load data')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [range, startDate, endDate, getDateRange])

  useEffect(() => { setHoveredIndex(null) }, [chartData])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function measure() {
      if (!el) return
      const w = el.offsetWidth
      const h = el.offsetHeight
      if (w > 0 && h > 0) {
        setDimensions({ width: w, height: h })
      }
    }

    measure()

    const timer = setTimeout(measure, 50)

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure)
      ro.observe(el)
      return () => {
        clearTimeout(timer)
        ro.disconnect()
      }
    }

    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', measure)
    }
  }, [])

  // ── Derived chart geometry ─────────────────────────────────────
  const { width, height } = dimensions
  const PADDING = getPadding(width)
  const chartW = Math.max(0, width - PADDING.left - PADDING.right)
  const chartH = Math.max(0, height - PADDING.top - PADDING.bottom)

  const xScale = useCallback(
    (i: number) =>
      PADDING.left +
      (chartData.length <= 1 ? chartW / 2 : (i / (chartData.length - 1)) * chartW),
    [chartData.length, chartW, PADDING.left]
  )

  const yScale = useCallback(
    (v: number) => PADDING.top + chartH * (1 - v / 100),
    [chartH, PADDING.top]
  )

  const points = useMemo(
    () => chartData.map((d, i) => ({ x: xScale(i), y: yScale(d.percentage) })),
    [chartData, xScale, yScale]
  )

  const linePath = useMemo(
    () => (interpolation === 'smooth' ? catmullRomLine(points) : linearLine(points)),
    [points, interpolation]
  )

  const areaPath = useMemo(
    () =>
      interpolation === 'smooth'
        ? catmullRomArea(points, PADDING.top + chartH)
        : linearArea(points, PADDING.top + chartH),
    [points, chartH, interpolation, PADDING.top]
  )

  const yTicks = [0, 25, 50, 75, 100]

  const xLabels = useMemo(() => {
    if (chartData.length === 0) return []

    if (range === 'year') {
      const labels: { i: number; label: string }[] = []
      chartData.forEach((d, i) => {
        if (d.date.getDate() === 1) {
          labels.push({
            i,
            label: d.date.toLocaleDateString(undefined, { month: 'short' }),
          })
        }
      })
      return labels
    }

    if (range === 'month') {
      const step = Math.max(1, Math.floor(chartData.length / 5))
      return chartData
        .map((d, i) => ({
          i,
          label: d.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
        }))
        .filter(({ i }) => i % step === 0 || i === chartData.length - 1)
    }

    // week / custom
    const maxLabels = width < 400 ? 5 : 10
    const step = Math.max(1, Math.ceil(chartData.length / maxLabels))
    return chartData
      .map((d, i) => ({
        i,
        label:
          chartData.length <= 14
            ? d.date.toLocaleDateString(undefined, { weekday: 'short' })
            : d.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      }))
      .filter(({ i }) => i % step === 0)
  }, [chartData, range, width])

  const stats = useMemo(() => {
    if (chartData.length === 0) return { avg: '0.0', max: 0, min: 0, trend: 0 }
    const avg = (chartData.reduce((s, d) => s + d.percentage, 0) / chartData.length).toFixed(1)
    const max = Math.max(...chartData.map((d) => d.percentage))
    const min = Math.min(...chartData.map((d) => d.percentage))
    const first = chartData[0]?.percentage ?? 0
    const last = chartData[chartData.length - 1]?.percentage ?? 0
    return { avg, max, min, trend: last - first }
  }, [chartData])

  // ── Interaction handlers ───────────────────────────────────────

  const findClosest = useCallback(
    (clientX: number) => {
      if (!svgRef.current || chartData.length === 0) return null
      const rect = svgRef.current.getBoundingClientRect()
      const mouseX = clientX - rect.left

      if (mouseX < PADDING.left - 10 || mouseX > PADDING.left + chartW + 10) return null

      let closestIdx = 0
      let closestDist = Infinity
      points.forEach((p, i) => {
        const dist = Math.abs(p.x - mouseX)
        if (dist < closestDist) {
          closestDist = dist
          closestIdx = i
        }
      })
      return closestIdx
    },
    [points, chartW, chartData.length, PADDING.left]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const idx = findClosest(e.clientX)
      setHoveredIndex(idx)
      if (idx !== null) setTooltipPos({ x: e.clientX, y: e.clientY })
    },
    [findClosest]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      const touch = e.touches[0]
      if (!touch) return
      const idx = findClosest(touch.clientX)
      setHoveredIndex(idx)
      if (idx !== null) setTooltipPos({ x: touch.clientX, y: touch.clientY })
    },
    [findClosest]
  )

  const handleMouseLeave = useCallback(() => setHoveredIndex(null), [])

  const hoveredData = hoveredIndex !== null ? chartData[hoveredIndex] : null
  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null
  const showAllPoints = chartData.length <= 30

  const fontSize = width < 400 ? 9 : width < 640 ? 10 : 11
  const lineStrokeWidth = chartData.length > 60 ? 1.2 : chartData.length > 30 ? 1.8 : 2.5

  // ── Loading / error / empty states ─────────────────────────────
  if (loading) {
    return (
      <Card className="w-full h-80 sm:h-96 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full h-80 sm:h-96 flex items-center justify-center">
        <p className="text-destructive text-sm px-4 text-center">Error: {error}</p>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card className="w-full h-80 sm:h-96 flex items-center justify-center">
        <p className="text-muted-foreground text-sm px-4 text-center">
          No data available for this period
        </p>
      </Card>
    )
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <Card className="w-full overflow-hidden border-border/50 bg-linear-to-br from-background via-background to-muted/30">
      {/* Accent line */}
      <div className="h-0.5 w-full bg-linear-to-r from-transparent via-[#BEF992]/60 to-transparent" />

      <CardHeader className="pb-3 pt-4 sm:pt-5 px-3 sm:px-6">
        <div className="flex flex-col gap-4">
          {/* Title + trend badge */}
          <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2.5">
                <div className="flex shrink-0 items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#BEF992]/10 border border-[#BEF992]/20">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#BEF992]" />
                </div>
                <CardTitle className="text-base sm:text-xl font-semibold tracking-tight">
                  Task Completion Trend
                </CardTitle>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground pl-9.5 sm:pl-10.5">
                {range === 'year'
                  ? 'Daily completion percentage for every day of the year'
                  : 'Completion percentage over time'}
              </p>
            </div>

            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 border backdrop-blur-sm shrink-0 ${
                stats.trend >= 0
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}
            >
              {stats.trend >= 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
              )}
              <span
                className={`text-sm font-bold ${
                  stats.trend >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {stats.trend > 0 ? '+' : ''}
                {stats.trend}%
              </span>
            </div>
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Interpolation toggle */}
            <div className="flex items-center rounded-lg border border-border/50 bg-muted/40 p-0.5">
              <button
                onClick={() => setInterpolation('linear')}
                className={`flex items-center gap-1 sm:gap-1.5 rounded-md px-2 sm:px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  interpolation === 'linear'
                    ? 'bg-background text-foreground shadow-sm border border-border/60'
                    : 'text-muted-foreground hover:text-foreground border border-transparent'
                }`}
              >
                <Minus className="w-3 h-3" />
                <span className="hidden sm:inline">Linear</span>
              </button>
              <button
                onClick={() => setInterpolation('smooth')}
                className={`flex items-center gap-1 sm:gap-1.5 rounded-md px-2 sm:px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  interpolation === 'smooth'
                    ? 'bg-background text-foreground shadow-sm border border-border/60'
                    : 'text-muted-foreground hover:text-foreground border border-transparent'
                }`}
              >
                <Spline className="w-3 h-3" />
                <span className="hidden sm:inline">Smooth</span>
              </button>
            </div>

            {/* Range selector */}
            <Select value={range} onValueChange={(v: RangeOption) => setRange(v)}>
              <SelectTrigger className="w-28 sm:w-36 bg-muted/50 border-border/50">
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            {/* Custom date pickers */}
            {range === 'custom' && (
              <div className="flex items-center gap-1 flex-wrap">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'h-9 w-auto justify-start text-left font-normal border-border/50 bg-muted/50 text-xs sm:text-sm',
                        !startDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {startDate ? format(startDate, 'LLL dd, y') : 'Start'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground text-xs">–</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'h-9 w-auto justify-start text-left font-normal border-border/50 bg-muted/50 text-xs sm:text-sm',
                        !endDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {endDate ? format(endDate, 'LLL dd, y') : 'End'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 sm:space-y-5 pb-4 sm:pb-6 px-3 sm:px-6">
        {/* Stat pills */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {[
            { label: 'Average', value: `${stats.avg}%`, color: 'text-[#BEF992]' },
            { label: 'Highest', value: `${stats.max}%`, color: 'text-emerald-400' },
            { label: 'Lowest', value: `${stats.min}%`, color: 'text-amber-400' },
            ...(range === 'year'
              ? [{ label: 'Days', value: `${chartData.length}`, color: 'text-blue-400' }]
              : []),
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-muted/40 border border-border/40 px-3 sm:px-4 py-1 sm:py-1.5"
            >
              <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                {s.label}
              </span>
              <span className={`text-xs sm:text-sm font-bold ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Chart container — fixed height so SVG always has space */}
        <div
          ref={containerRef}
          className="h-56 sm:h-72 md:h-80 w-full rounded-xl sm:rounded-2xl border border-border/40
                     bg-linear-to-br from-muted/30 via-muted/10 to-muted/30
                     shadow-inner overflow-hidden touch-none"
        >
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className="select-none block"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseLeave}
          >
            <defs>
              <linearGradient id={`ag-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.4} />
                <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id={`mg-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="white" stopOpacity={1} />
                <stop offset="55%" stopColor="white" stopOpacity={0.5} />
                <stop offset="100%" stopColor="white" stopOpacity={0} />
              </linearGradient>
              <mask id={`m-${uid}`}>
                <rect
                  x={PADDING.left}
                  y={PADDING.top}
                  width={chartW > 0 ? chartW : 0}
                  height={chartH > 0 ? chartH : 0}
                  fill={`url(#mg-${uid})`}
                />
              </mask>
              <filter id={`gl-${uid}`}>
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id={`pg-${uid}`}>
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Hit area */}
            <rect
              x={PADDING.left}
              y={PADDING.top}
              width={chartW > 0 ? chartW : 0}
              height={chartH > 0 ? chartH : 0}
              fill="transparent"
            />

            {/* Gridlines + Y labels */}
            {yTicks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PADDING.left}
                  y1={yScale(tick)}
                  x2={PADDING.left + chartW}
                  y2={yScale(tick)}
                  stroke="currentColor"
                  strokeOpacity={0.07}
                  strokeDasharray={tick === 0 ? undefined : '4 4'}
                />
                <text
                  x={PADDING.left - 8}
                  y={yScale(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-muted-foreground/50"
                  fontSize={fontSize}
                  fontWeight={500}
                >
                  {tick}%
                </text>
              </g>
            ))}

            {/* X labels */}
            {xLabels.map(({ i, label }) => (
              <text
                key={`${i}-${label}`}
                x={xScale(i)}
                y={PADDING.top + chartH + (width < 400 ? 20 : 28)}
                textAnchor="middle"
                className="fill-muted-foreground/50"
                fontSize={fontSize}
                fontWeight={500}
              >
                {label}
              </text>
            ))}

            {/* Masked area fill */}
            {areaPath && (
              <path d={areaPath} fill={`url(#ag-${uid})`} mask={`url(#m-${uid})`} />
            )}

            {/* Line with glow */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke={LINE_COLOR}
                strokeWidth={lineStrokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={`url(#gl-${uid})`}
              />
            )}

            {/* Hover crosshair */}
            {hoveredPoint && (
              <>
                <line
                  x1={hoveredPoint.x}
                  y1={PADDING.top}
                  x2={hoveredPoint.x}
                  y2={PADDING.top + chartH}
                  stroke={LINE_COLOR}
                  strokeOpacity={0.15}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <line
                  x1={PADDING.left}
                  y1={hoveredPoint.y}
                  x2={PADDING.left + chartW}
                  y2={hoveredPoint.y}
                  stroke={LINE_COLOR}
                  strokeOpacity={0.08}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              </>
            )}

            {/* Data points */}
            {points.map((p, i) => {
              const isHovered = hoveredIndex === i
              if (!showAllPoints && !isHovered) return null
              return (
                <g key={i}>
                  {isHovered && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={12}
                      fill={LINE_COLOR}
                      fillOpacity={0.1}
                      filter={`url(#pg-${uid})`}
                    />
                  )}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 5.5 : 3}
                    fill={isHovered ? LINE_COLOR : 'var(--background)'}
                    stroke={LINE_COLOR}
                    strokeWidth={2}
                    style={{ transition: 'r 150ms ease, fill 150ms ease' }}
                  />
                </g>
              )
            })}
          </svg>
        </div>

        {/* Tooltip */}
        {hoveredData && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y - 16,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="relative rounded-xl bg-popover/95 backdrop-blur-md border border-border/80 shadow-2xl shadow-black/30 px-3 sm:px-4 py-2.5 sm:py-3 text-xs">
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-popover/95 border-r border-b border-border/80" />
              <p className="font-semibold text-foreground text-xs sm:text-[13px]">
                {hoveredData.date.toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LINE_COLOR }} />
                <p style={{ color: LINE_COLOR }} className="font-medium">
                  {hoveredData.percentage}% completed
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}