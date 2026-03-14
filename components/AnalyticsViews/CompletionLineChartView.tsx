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
import { TrendingUp, ArrowUpRight, ArrowDownRight, Spline, Minus } from 'lucide-react'

const LINE_COLOR = '#08CB00'

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

interface DataPoint {
  date: Date
  percentage: number
}

type Interpolation = 'linear' | 'smooth'

function getDaysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365
}

function generateData(range: string): DataPoint[] {
  if (range === 'week') {
    return [
      { date: new Date(2026, 2, 10), percentage: 45 },
      { date: new Date(2026, 2, 11), percentage: 62 },
      { date: new Date(2026, 2, 12), percentage: 38 },
      { date: new Date(2026, 2, 13), percentage: 100 },
      { date: new Date(2026, 2, 14), percentage: 55 },
      { date: new Date(2026, 2, 15), percentage: 83 },
      { date: new Date(2026, 2, 16), percentage: 67 },
    ]
  }
  if (range === 'month') {
    return Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2026, 2, i + 1),
      percentage: Math.floor(20 + seededRandom(i * 7 + 3) * 80),
    }))
  }
  // ─── Year: one data point for EVERY day ───
  const year = 2026
  const totalDays = getDaysInYear(year)
  return Array.from({ length: totalDays }, (_, i) => {
    const date = new Date(year, 0, 1 + i)
    const dow = date.getDay()
    const weekdayFactor = dow === 0 || dow === 6 ? 0.7 : 1.0
    const monthWave = 0.8 + 0.4 * Math.sin((date.getMonth() + 1) * 0.7)
    const base = seededRandom(i * 13 + 5) * 70 * weekdayFactor * monthWave
    return {
      date,
      percentage: Math.min(100, Math.floor(25 + base)),
    }
  })
}

// ─── Path generators ───

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

function catmullRomArea(pts: { x: number; y: number }[], bottomY: number): string {
  const line = catmullRomLine(pts)
  if (!line || pts.length === 0) return ''
  return `${line} L ${pts[pts.length - 1].x},${bottomY} L ${pts[0].x},${bottomY} Z`
}

const PADDING = { top: 24, right: 28, bottom: 44, left: 52 }

export default function CompletionLineChartView() {
  const [range, setRange] = useState('week')
  const [interpolation, setInterpolation] = useState<Interpolation>('linear')
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 700, height: 320 })
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const rawId = useId()
  const uid = rawId.replace(/:/g, '')

  const data = useMemo(() => generateData(range), [range])

  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Reset hover when range changes
  useEffect(() => {
    setHoveredIndex(null)
  }, [range])

  const { width, height } = dimensions
  const chartW = width - PADDING.left - PADDING.right
  const chartH = height - PADDING.top - PADDING.bottom

  const xScale = useCallback(
    (i: number) =>
      PADDING.left +
      (data.length <= 1 ? chartW / 2 : (i / (data.length - 1)) * chartW),
    [data.length, chartW]
  )

  const yScale = useCallback(
    (v: number) => PADDING.top + chartH * (1 - v / 100),
    [chartH]
  )

  const points = useMemo(
    () => data.map((d, i) => ({ x: xScale(i), y: yScale(d.percentage) })),
    [data, xScale, yScale]
  )

  const linePath = useMemo(
    () =>
      interpolation === 'smooth'
        ? catmullRomLine(points)
        : linearLine(points),
    [points, interpolation]
  )

  const areaPath = useMemo(
    () =>
      interpolation === 'smooth'
        ? catmullRomArea(points, PADDING.top + chartH)
        : linearArea(points, PADDING.top + chartH),
    [points, chartH, interpolation]
  )

  const yTicks = [0, 25, 50, 75, 100]

  const xLabels = useMemo(() => {
    if (range === 'year') {
      // Place a label at the first day of each month
      const labels: { i: number; label: string }[] = []
      data.forEach((d, i) => {
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
      return data
        .map((d, i) => ({
          i,
          label: d.date.toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
          }),
        }))
        .filter(({ i }) => i % 7 === 0)
    }
    return data.map((d, i) => ({
      i,
      label: d.date.toLocaleDateString(undefined, { weekday: 'short' }),
    }))
  }, [data, range])

  const stats = useMemo(() => {
    const avg = (
      data.reduce((s, d) => s + d.percentage, 0) / data.length
    ).toFixed(1)
    const max = Math.max(...data.map((d) => d.percentage))
    const min = Math.min(...data.map((d) => d.percentage))
    const first = data[0]?.percentage ?? 0
    const last = data[data.length - 1]?.percentage ?? 0
    const trend = last - first
    return { avg, max, min, trend }
  }, [data])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left

      if (mouseX < PADDING.left - 10 || mouseX > PADDING.left + chartW + 10) {
        setHoveredIndex(null)
        return
      }

      let closestIdx = 0
      let closestDist = Infinity
      points.forEach((p, i) => {
        const dist = Math.abs(p.x - mouseX)
        if (dist < closestDist) {
          closestDist = dist
          closestIdx = i
        }
      })

      setHoveredIndex(closestIdx)
      setTooltipPos({ x: e.clientX, y: e.clientY })
    },
    [points, chartW]
  )

  const handleMouseLeave = useCallback(() => setHoveredIndex(null), [])

  const hoveredData = hoveredIndex !== null ? data[hoveredIndex] : null
  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null

  // Only show all dot markers for week; month & year show only on hover
  const showAllPoints = range === 'week'

  return (
    <Card className='w-full overflow-hidden border-border/50 bg-linear-to-br from-background via-background to-muted/30'>
      {/* Accent line */}
      <div className='h-0.5 w-full bg-linear-to-r from-transparent via-[#BEF992]/60 to-transparent' />

      <CardHeader className='pb-3 pt-5'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
          <div className='space-y-1.5'>
            <div className='flex items-center gap-2.5'>
              <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-[#BEF992]/10 border border-[#BEF992]/20'>
                <TrendingUp className='w-4 h-4 text-[#BEF992]' />
              </div>
              <CardTitle className='text-xl font-semibold tracking-tight'>
                Task Completion Trend
              </CardTitle>
            </div>
            <p className='text-sm text-muted-foreground pl-10.5'>
              {range === 'year'
                ? 'Daily completion percentage for every day of the year'
                : 'Completion percentage over time'}
            </p>
          </div>

          <div className='flex items-center gap-3'>
            {/* Trend badge */}
            <div
              className={`hidden md:flex items-center gap-1.5 rounded-full px-3 py-1.5 border backdrop-blur-sm ${
                stats.trend >= 0
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}
            >
              {stats.trend >= 0 ? (
                <ArrowUpRight className='w-3.5 h-3.5 text-emerald-400' />
              ) : (
                <ArrowDownRight className='w-3.5 h-3.5 text-red-400' />
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

            {/* Interpolation Toggle */}
            <div className='flex items-center rounded-lg border border-border/50 bg-muted/40 p-0.5'>
              <button
                onClick={() => setInterpolation('linear')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium
                  transition-all duration-200 ${
                    interpolation === 'linear'
                      ? 'bg-background text-foreground shadow-sm border border-border/60'
                      : 'text-muted-foreground hover:text-foreground border border-transparent'
                  }`}
              >
                <Minus className='w-3 h-3' />
                <span className='hidden sm:inline'>Linear</span>
              </button>
              <button
                onClick={() => setInterpolation('smooth')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium
                  transition-all duration-200 ${
                    interpolation === 'smooth'
                      ? 'bg-background text-foreground shadow-sm border border-border/60'
                      : 'text-muted-foreground hover:text-foreground border border-transparent'
                  }`}
              >
                <Spline className='w-3 h-3' />
                <span className='hidden sm:inline'>Smooth</span>
              </button>
            </div>

            {/* Range selector */}
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className='w-36 bg-muted/50 border-border/50'>
                <SelectValue placeholder='Range' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='week'>This Week</SelectItem>
                <SelectItem value='month'>This Month</SelectItem>
                <SelectItem value='year'>This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className='space-y-5 pb-6'>
        {/* Stat pills */}
        <div className='flex flex-wrap gap-3'>
          {[
            { label: 'Average', value: `${stats.avg}%`, color: 'text-[#BEF992]' },
            { label: 'Highest', value: `${stats.max}%`, color: 'text-emerald-400' },
            { label: 'Lowest', value: `${stats.min}%`, color: 'text-amber-400' },
            ...(range === 'year'
              ? [
                  {
                    label: 'Days',
                    value: `${data.length}`,
                    color: 'text-blue-400',
                  },
                ]
              : []),
          ].map((s) => (
            <div
              key={s.label}
              className='flex items-center gap-2 rounded-full bg-muted/40 border border-border/40 px-4 py-1.5'
            >
              <span className='text-[11px] text-muted-foreground font-medium uppercase tracking-wider'>
                {s.label}
              </span>
              <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div
          ref={containerRef}
          className='h-80 w-full rounded-2xl border border-border/40
                     bg-linear-to-br from-muted/30 via-muted/10 to-muted/30
                     shadow-inner'
        >
          <svg
            ref={svgRef}
            width={width}
            height={height}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id={`ag-${uid}`} x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor={LINE_COLOR} stopOpacity={0.4} />
                <stop
                  offset='100%'
                  stopColor={LINE_COLOR}
                  stopOpacity={0.02}
                />
              </linearGradient>
              <linearGradient id={`mg-${uid}`} x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor='white' stopOpacity={1} />
                <stop offset='55%' stopColor='white' stopOpacity={0.5} />
                <stop offset='100%' stopColor='white' stopOpacity={0} />
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
                <feGaussianBlur stdDeviation='3.5' result='blur' />
                <feMerge>
                  <feMergeNode in='blur' />
                  <feMergeNode in='SourceGraphic' />
                </feMerge>
              </filter>
              <filter id={`pg-${uid}`}>
                <feGaussianBlur stdDeviation='2' result='blur' />
                <feMerge>
                  <feMergeNode in='blur' />
                  <feMergeNode in='SourceGraphic' />
                </feMerge>
              </filter>
            </defs>

            {/* Hit area */}
            <rect
              x={PADDING.left}
              y={PADDING.top}
              width={chartW > 0 ? chartW : 0}
              height={chartH > 0 ? chartH : 0}
              fill='transparent'
            />

            {/* Gridlines + Y labels */}
            {yTicks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PADDING.left}
                  y1={yScale(tick)}
                  x2={PADDING.left + chartW}
                  y2={yScale(tick)}
                  stroke='currentColor'
                  strokeOpacity={0.07}
                  strokeDasharray={tick === 0 ? undefined : '4 4'}
                />
                <text
                  x={PADDING.left - 10}
                  y={yScale(tick)}
                  textAnchor='end'
                  dominantBaseline='middle'
                  className='fill-muted-foreground/50'
                  fontSize={11}
                  fontWeight={500}
                >
                  {tick}%
                </text>
              </g>
            ))}

            {/* X labels */}
            {xLabels.map(({ i, label }) => (
              <text
                key={i}
                x={xScale(i)}
                y={PADDING.top + chartH + 28}
                textAnchor='middle'
                className='fill-muted-foreground/50'
                fontSize={11}
                fontWeight={500}
              >
                {label}
              </text>
            ))}

            {/* Masked area */}
            {areaPath && (
              <path
                d={areaPath}
                fill={`url(#ag-${uid})`}
                mask={`url(#m-${uid})`}
              />
            )}

            {/* Line with glow — thinner stroke for dense year view */}
            {linePath && (
              <path
                d={linePath}
                fill='none'
                stroke={LINE_COLOR}
                strokeWidth={range === 'year' ? 1.5 : 2.5}
                strokeLinecap='round'
                strokeLinejoin='round'
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
                  strokeDasharray='4 4'
                />
                <line
                  x1={PADDING.left}
                  y1={hoveredPoint.y}
                  x2={PADDING.left + chartW}
                  y2={hoveredPoint.y}
                  stroke={LINE_COLOR}
                  strokeOpacity={0.08}
                  strokeWidth={1}
                  strokeDasharray='4 4'
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
                    style={{
                      transition: 'r 150ms ease, fill 150ms ease',
                    }}
                  />
                </g>
              )
            })}
          </svg>
        </div>

        {/* Tooltip */}
        {hoveredData && (
          <div
            className='fixed z-50 pointer-events-none'
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y - 16,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className='relative rounded-xl bg-popover/95 backdrop-blur-md border border-border/80 shadow-2xl shadow-black/30 px-4 py-3 text-xs'>
              <div className='absolute -bottom-1.25 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-popover/95 border-r border-b border-border/80' />
              <p className='font-semibold text-foreground text-[13px]'>
                {hoveredData.date.toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <div className='flex items-center gap-1.5 mt-1.5'>
                <div
                  className='w-2.5 h-2.5 rounded-full'
                  style={{ backgroundColor: LINE_COLOR }}
                />
                <p style={{ color: LINE_COLOR }} className='font-medium'>
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