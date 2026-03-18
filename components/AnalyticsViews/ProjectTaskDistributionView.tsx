'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTheme } from 'next-themes'
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  TrendingUp,
  Layers,
  LayoutList,
  BarChart3,
  Loader2,
} from 'lucide-react'
import { fetchProjectStats, type ProjectStat } from '@/lib/api/tasks'

// Predefined colors and emojis for visual variety
const PROJECT_COLORS = [
  'bg-indigo-500',
  'bg-violet-500',
  'bg-cyan-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-emerald-500',
  'bg-blue-500',
  'bg-purple-500',
]
const PROJECT_EMOJIS = ['🌐', '📱', '🔗', '📊', '🎯', '📝', '⚙️', '📦']

type ViewMode = 'stacked' | 'grouped'

export default function ProjectTaskDistributionView() {
  const [viewMode, setViewMode] = useState<ViewMode>('stacked')
  const [hoveredProject, setHoveredProject] = useState<number | null>(null)
  const [hoveredSegment, setHoveredSegment] = useState<'completed' | 'pending' | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)

  // API states
  const [projectStats, setProjectStats] = useState<ProjectStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { resolvedTheme } = useTheme()

  useEffect(() => setMounted(true), [])

  // Fetch data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchProjectStats() // no date range for now
        setProjectStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project stats')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const isDark = mounted ? resolvedTheme === 'dark' : true

  const completedColor = isDark ? '#34d399' : '#059669'
  const pendingColor = isDark ? '#fb923c' : '#ea580c'

  // Transform API data to UI-friendly format
  const projects = useMemo(() => {
    return projectStats.map((stat, idx) => ({
      name: stat.name,
      emoji: PROJECT_EMOJIS[idx % PROJECT_EMOJIS.length],
      completed: stat.completed,
      pending: stat.total - stat.completed,
      accentDot: PROJECT_COLORS[idx % PROJECT_COLORS.length],
    }))
  }, [projectStats])

  const maxTotal = Math.max(...projects.map((p) => p.completed + p.pending), 0)
  const maxSingle = Math.max(...projects.map((p) => Math.max(p.completed, p.pending)), 0)
  const totalCompleted = projects.reduce((s, p) => s + p.completed, 0)
  const totalPending = projects.reduce((s, p) => s + p.pending, 0)
  const totalTasks = totalCompleted + totalPending
  const overallRate = totalTasks > 0 ? ((totalCompleted / totalTasks) * 100).toFixed(1) : '0'

  const scaleMax = viewMode === 'stacked' ? maxTotal : maxSingle
  const niceMax = Math.ceil(scaleMax / 10) * 10 || 100 // fallback to 100 if all zero

  const ticks = useMemo(() => {
    const count = 5
    const step = niceMax / (count - 1)
    return Array.from({ length: count }, (_, i) => Math.round(i * step))
  }, [niceMax])

  const getBarWidth = useCallback(
    (value: number) => `${(value / niceMax) * 100}%`,
    [niceMax]
  )

  const handleSegmentHover = useCallback(
    (
      projectIdx: number,
      segment: 'completed' | 'pending',
      e: React.MouseEvent
    ) => {
      setHoveredProject(projectIdx)
      setHoveredSegment(segment)
      setTooltipPos({ x: e.clientX, y: e.clientY })
    },
    []
  )

  const handleRowEnter = useCallback((idx: number) => {
    setHoveredProject(idx)
    setHoveredSegment(null)
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (hoveredProject !== null) {
        setTooltipPos({ x: e.clientX, y: e.clientY })
      }
    },
    [hoveredProject]
  )

  const handleMouseLeave = useCallback(() => {
    setHoveredProject(null)
    setHoveredSegment(null)
  }, [])

  const hoveredData = hoveredProject !== null ? projects[hoveredProject] : null

  const statCards = [
    {
      icon: <FolderKanban className='w-4 h-4' />,
      label: 'Total Tasks',
      value: totalTasks,
      unit: 'tasks',
      accent: 'from-indigo-500/20 to-violet-500/20',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      borderAccent: 'border-indigo-500/30 dark:border-indigo-500/20',
    },
    {
      icon: <CheckCircle2 className='w-4 h-4' />,
      label: 'Completed',
      value: totalCompleted,
      unit: 'tasks',
      accent: 'from-emerald-500/20 to-green-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      borderAccent: 'border-emerald-500/30 dark:border-emerald-500/20',
    },
    {
      icon: <Clock className='w-4 h-4' />,
      label: 'Pending',
      value: totalPending,
      unit: 'tasks',
      accent: 'from-orange-500/20 to-amber-500/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      borderAccent: 'border-orange-500/30 dark:border-orange-500/20',
    },
    {
      icon: <TrendingUp className='w-4 h-4' />,
      label: 'Completion Rate',
      value: overallRate,
      unit: '%',
      accent: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      borderAccent: 'border-blue-500/30 dark:border-blue-500/20',
    },
  ]

  const RING_R = 9
  const RING_CIRC = 2 * Math.PI * RING_R

  // Loading / error states
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

  if (projects.length === 0) {
    return (
      <Card className='w-full h-96 flex items-center justify-center'>
        <p className='text-muted-foreground'>No project data available</p>
      </Card>
    )
  }

  return (
    <Card
      className='w-full overflow-hidden border-border/50
                 bg-linear-to-br from-background via-background to-muted/30'
    >
      {/* Accent line */}
      <div className='h-0.5 w-full bg-linear-to-r from-transparent via-indigo-500/60 to-transparent' />

      <CardHeader className='pb-3 pt-5'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
          <div className='space-y-1.5'>
            <div className='flex items-center gap-2.5'>
              <div
                className='flex items-center justify-center w-8 h-8 rounded-lg
                            bg-indigo-500/10 border border-indigo-500/20'
              >
                <BarChart3 className='w-4 h-4 text-indigo-600 dark:text-indigo-400' />
              </div>
              <CardTitle className='text-xl font-semibold tracking-tight'>
                Project Task Distribution
              </CardTitle>
            </div>
            <p className='text-sm text-muted-foreground pl-10.5'>
              Completed vs pending tasks across projects
            </p>
          </div>

          <div className='flex items-center gap-3'>
            {/* Overall completion badge */}
            <div
              className='hidden md:flex items-center gap-2 rounded-full
                          bg-emerald-500/10 border border-emerald-500/20
                          px-4 py-2 backdrop-blur-sm'
            >
              <div className='w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse' />
              <span className='text-sm font-bold text-emerald-600 dark:text-emerald-400'>
                {overallRate}%
              </span>
              <span className='text-xs text-muted-foreground'>completed</span>
            </div>

            {/* View mode toggle */}
            <div className='flex items-center rounded-lg border border-border/50 bg-muted/40 p-0.5'>
              <button
                onClick={() => setViewMode('stacked')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium
                  transition-all duration-200 ${
                    viewMode === 'stacked'
                      ? 'bg-background text-foreground shadow-sm border border-border/60'
                      : 'text-muted-foreground hover:text-foreground border border-transparent'
                  }`}
              >
                <Layers className='w-3 h-3' />
                <span className='hidden sm:inline'>Stacked</span>
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium
                  transition-all duration-200 ${
                    viewMode === 'grouped'
                      ? 'bg-background text-foreground shadow-sm border border-border/60'
                      : 'text-muted-foreground hover:text-foreground border border-transparent'
                  }`}
              >
                <LayoutList className='w-3 h-3' />
                <span className='hidden sm:inline'>Grouped</span>
              </button>
            </div>
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
              <div
                className='absolute inset-0 rounded-xl bg-linear-to-br
                            from-white/5 to-transparent dark:from-white/2
                            dark:to-transparent pointer-events-none'
              />
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

        {/* Bar Chart */}
        <div
          className='w-full rounded-2xl border border-border/40
                     bg-linear-to-br from-muted/30 via-muted/10 to-muted/30
                     p-5 shadow-inner'
          onMouseLeave={handleMouseLeave}
        >
          <div className='space-y-1'>
            {projects.map((project, idx) => {
              const total = project.completed + project.pending
              const rateNum = total > 0 ? parseFloat(((project.completed / total) * 100).toFixed(0)) : 0
              const rate = rateNum.toFixed(0)
              const isHovered = hoveredProject === idx
              const isDimmed = hoveredProject !== null && hoveredProject !== idx

              const rateColorClass =
                rateNum >= 70
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : rateNum >= 50
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-600 dark:text-red-400'

              const ringStroke =
                rateNum >= 70
                  ? completedColor
                  : rateNum >= 50
                  ? pendingColor
                  : isDark
                  ? '#f87171'
                  : '#dc2626'

              return (
                <div
                  key={project.name}
                  className={`py-3.5 px-3 rounded-xl transition-all duration-300
                    ${isDimmed ? 'opacity-30 scale-[0.99]' : ''}
                    ${
                      isHovered
                        ? 'bg-muted/50 dark:bg-muted/40'
                        : 'hover:bg-muted/30 dark:hover:bg-muted/20'
                    }`}
                  onMouseEnter={() => handleRowEnter(idx)}
                  onMouseMove={handleMouseMove}
                >
                  {/* Project header */}
                  <div className='flex items-center justify-between mb-2.5'>
                    <div className='flex items-center gap-2.5'>
                      <div
                        className={`w-2 h-2 rounded-full ${project.accentDot} shrink-0`}
                      />
                      <span className='text-sm font-semibold text-foreground truncate max-w-45 sm:max-w-none'>
                        {project.name}
                      </span>
                      <span
                        className='text-[11px] text-muted-foreground font-medium
                                     px-2 py-0.5 rounded-full
                                     bg-muted/60 dark:bg-muted/40 whitespace-nowrap'
                      >
                        {total} tasks
                      </span>
                    </div>

                    {/* Mini ring + percentage */}
                    <div className='flex items-center gap-2 shrink-0'>
                      <svg
                        className='w-6 h-6 -rotate-90'
                        viewBox='0 0 24 24'
                      >
                        <circle
                          cx='12'
                          cy='12'
                          r={RING_R}
                          fill='none'
                          className='stroke-muted/50 dark:stroke-muted/30'
                          strokeWidth='2.5'
                        />
                        <circle
                          cx='12'
                          cy='12'
                          r={RING_R}
                          fill='none'
                          stroke={ringStroke}
                          strokeWidth='2.5'
                          strokeLinecap='round'
                          strokeDasharray={`${(rateNum / 100) * RING_CIRC} ${RING_CIRC}`}
                          className='transition-all duration-500'
                        />
                      </svg>
                      <span
                        className={`text-sm font-bold tabular-nums ${rateColorClass}`}
                      >
                        {rate}%
                      </span>
                    </div>
                  </div>

                  {/* ── Stacked Bar ── */}
                  {viewMode === 'stacked' ? (
                    <div className='relative h-9 rounded-lg bg-muted/50 dark:bg-muted/20 overflow-hidden'>
                      {/* Inner gridlines */}
                      {[0.25, 0.5, 0.75].map((pct) => (
                        <div
                          key={pct}
                          className='absolute top-0 bottom-0 w-px bg-foreground/4'
                          style={{ left: `${pct * 100}%` }}
                        />
                      ))}

                      <div className='relative h-full flex z-10'>
                        {/* Completed */}
                        <div
                          className='h-full flex items-center transition-all duration-500
                                     cursor-pointer hover:brightness-110'
                          style={{
                            width: getBarWidth(project.completed),
                            backgroundColor: completedColor,
                            borderRadius:
                              project.pending === 0
                                ? '0.5rem'
                                : '0.5rem 0 0 0.5rem',
                          }}
                          onMouseEnter={(e) =>
                            handleSegmentHover(idx, 'completed', e)
                          }
                        >
                          {project.completed / niceMax > 0.08 && (
                            <span
                              className='px-2.5 text-[11px] font-bold text-white
                                         dark:text-gray-950 drop-shadow-sm
                                         whitespace-nowrap'
                            >
                              {project.completed}
                            </span>
                          )}
                        </div>

                        {/* Pending */}
                        <div
                          className='h-full flex items-center transition-all duration-500
                                     cursor-pointer hover:brightness-110'
                          style={{
                            width: getBarWidth(project.pending),
                            backgroundColor: pendingColor,
                            borderRadius:
                              project.completed === 0
                                ? '0.5rem'
                                : '0 0.5rem 0.5rem 0',
                          }}
                          onMouseEnter={(e) =>
                            handleSegmentHover(idx, 'pending', e)
                          }
                        >
                          {project.pending / niceMax > 0.08 && (
                            <span
                              className='px-2.5 text-[11px] font-bold text-white
                                         dark:text-gray-950 drop-shadow-sm
                                         whitespace-nowrap'
                            >
                              {project.pending}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ── Grouped Bars ── */
                    <div className='space-y-1.5'>
                      {/* Completed */}
                      <div className='flex items-center gap-2'>
                        <div className='relative h-4.5 flex-1 rounded-md bg-muted/50 dark:bg-muted/20 overflow-hidden'>
                          {[0.25, 0.5, 0.75].map((pct) => (
                            <div
                              key={pct}
                              className='absolute top-0 bottom-0 w-px bg-foreground/4'
                              style={{ left: `${pct * 100}%` }}
                            />
                          ))}
                          <div
                            className='relative z-10 h-full rounded-md flex items-center
                                       transition-all duration-500 cursor-pointer
                                       hover:brightness-110'
                            style={{
                              width: getBarWidth(project.completed),
                              backgroundColor: completedColor,
                            }}
                            onMouseEnter={(e) =>
                              handleSegmentHover(idx, 'completed', e)
                            }
                          >
                            {project.completed / niceMax > 0.1 && (
                              <span
                                className='px-2 text-[10px] font-bold text-white
                                           dark:text-gray-950 drop-shadow-sm
                                           whitespace-nowrap'
                              >
                                {project.completed}
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className='text-[11px] font-semibold
                                     text-emerald-600 dark:text-emerald-400
                                     w-7 text-right tabular-nums'
                        >
                          {project.completed}
                        </span>
                      </div>

                      {/* Pending */}
                      <div className='flex items-center gap-2'>
                        <div className='relative h-4.5 flex-1 rounded-md bg-muted/50 dark:bg-muted/20 overflow-hidden'>
                          {[0.25, 0.5, 0.75].map((pct) => (
                            <div
                              key={pct}
                              className='absolute top-0 bottom-0 w-px bg-foreground/4'
                              style={{ left: `${pct * 100}%` }}
                            />
                          ))}
                          <div
                            className='relative z-10 h-full rounded-md flex items-center
                                       transition-all duration-500 cursor-pointer
                                       hover:brightness-110'
                            style={{
                              width: getBarWidth(project.pending),
                              backgroundColor: pendingColor,
                            }}
                            onMouseEnter={(e) =>
                              handleSegmentHover(idx, 'pending', e)
                            }
                          >
                            {project.pending / niceMax > 0.1 && (
                              <span
                                className='px-2 text-[10px] font-bold text-white
                                           dark:text-gray-950 drop-shadow-sm
                                           whitespace-nowrap'
                              >
                                {project.pending}
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className='text-[11px] font-semibold
                                     text-orange-600 dark:text-orange-400
                                     w-7 text-right tabular-nums'
                        >
                          {project.pending}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Scale ticks */}
          <div className='mt-3 px-3'>
            <div className='relative h-5'>
              {ticks.map((tick, i) => (
                <span
                  key={tick}
                  className='absolute text-[10px] text-muted-foreground/50
                             font-medium tabular-nums'
                  style={{
                    left: `${(tick / niceMax) * 100}%`,
                    transform:
                      i === 0
                        ? 'translateX(0)'
                        : i === ticks.length - 1
                        ? 'translateX(-100%)'
                        : 'translateX(-50%)',
                  }}
                >
                  {tick}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Tooltip */}
        {hoveredData && hoveredSegment && (
          <div
            className='fixed z-50 pointer-events-none'
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y - 16,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div
              className='relative rounded-xl bg-popover/95 backdrop-blur-md
                          border border-border shadow-2xl
                          shadow-black/10 dark:shadow-black/30
                          px-4 py-3 text-xs'
            >
              <div
                className='absolute -bottom-1.25 left-1/2 -translate-x-1/2
                            w-2.5 h-2.5 rotate-45
                            bg-popover/95 border-r border-b border-border'
              />

              <p className='font-semibold text-foreground text-[13px] mb-2'>
                {hoveredData.emoji} {hoveredData.name}
              </p>

              <div className='space-y-1'>
                <div className='flex items-center gap-2'>
                  <div
                    className='w-2.5 h-2.5 rounded-sm'
                    style={{ backgroundColor: completedColor }}
                  />
                  <span
                    className={`font-medium ${
                      hoveredSegment === 'completed'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {hoveredData.completed} completed
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <div
                    className='w-2.5 h-2.5 rounded-sm'
                    style={{ backgroundColor: pendingColor }}
                  />
                  <span
                    className={`font-medium ${
                      hoveredSegment === 'pending'
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {hoveredData.pending} pending
                  </span>
                </div>
              </div>

              {/* Mini proportion bar */}
              <div className='mt-2.5 pt-2 border-t border-border/50'>
                <div className='flex items-center gap-2'>
                  <div className='flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden flex'>
                    <div
                      className='h-full rounded-l-full'
                      style={{
                        width: `${(
                          hoveredData.completed /
                          (hoveredData.completed + hoveredData.pending)
                        ) * 100}%`,
                        backgroundColor: completedColor,
                      }}
                    />
                    <div
                      className='h-full rounded-r-full'
                      style={{
                        width: `${(
                          hoveredData.pending /
                          (hoveredData.completed + hoveredData.pending)
                        ) * 100}%`,
                        backgroundColor: pendingColor,
                      }}
                    />
                  </div>
                  <span className='text-muted-foreground tabular-nums'>
                    {(
                      (hoveredData.completed /
                        (hoveredData.completed + hoveredData.pending)) *
                      100
                    ).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className='flex items-center justify-center gap-6 pt-1'>
          <div className='flex items-center gap-2'>
            <div
              className='w-3.5 h-3.5 rounded-[3px] border border-black/5 dark:border-white/5'
              style={{ backgroundColor: completedColor }}
            />
            <span className='text-[11px] text-muted-foreground font-medium'>
              Completed
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <div
              className='w-3.5 h-3.5 rounded-[3px] border border-black/5 dark:border-white/5'
              style={{ backgroundColor: pendingColor }}
            />
            <span className='text-[11px] text-muted-foreground font-medium'>
              Pending
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}