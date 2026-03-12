'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LineChart,
  LineSeries,
  Line,
  PointSeries,
  LinearXAxis,
  LinearXAxisTickSeries,
  LinearXAxisTickLabel,
  LinearYAxis,
  LinearYAxisTickSeries,
  LinearYAxisTickLabel,
  GridlineSeries,
  Gridline,
  TooltipArea,
  ChartTooltip,
} from 'reaviz'
import { useState, useRef, useEffect } from 'react'

const staticData = [
  { date: '2026-03-10', percentage: 45 },
  { date: '2026-03-11', percentage: 62 },
  { date: '2026-03-12', percentage: 38 },
  { date: '2026-03-13', percentage: 100 },
  { date: '2026-03-14', percentage: 55 },
  { date: '2026-03-15', percentage: 83 },
  { date: '2026-03-16', percentage: 67 },
]

const chartData = staticData.map((d) => ({
  key: new Date(d.date),
  data: d.percentage,
}))

const LINE_COLOR = '#BEF992'

export default function CompletionLineChartView() {
  const [range, setRange] = useState('week')
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 700, height: 300 })

  // Responsive: read container width on mount & resize
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

  return (
    <Card className='w-full'>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle>Task Completion Trend</CardTitle>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className='w-36'>
            <SelectValue placeholder='Range' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='week'>This Week</SelectItem>
            <SelectItem value='month'>This Month</SelectItem>
            <SelectItem value='year'>This Year</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className='h-80 w-full'>
          <LineChart
            width={dimensions.width}
            height={dimensions.height}
            data={chartData}
            series={
              <LineSeries
                colorScheme={LINE_COLOR}
                interpolation='linear'
                line={<Line strokeWidth={2} />}
                symbols={<PointSeries show={true} />}
                tooltip={
                  <TooltipArea
                    tooltip={
                      <ChartTooltip
                        content={(d: any) => (
                          <div className='bg-background border rounded-md p-2 shadow-md text-xs'>
                            <p className='font-medium'>
                              {new Date(d.key).toDateString()}
                            </p>
                            <p style={{ color: LINE_COLOR }}>
                              {d.data}% completed
                            </p>
                          </div>
                        )}
                      />
                    }
                  />
                }
              />
            }
            xAxis={
              <LinearXAxis
                type='time'
                tickSeries={
                  <LinearXAxisTickSeries
                    label={
                      <LinearXAxisTickLabel
                        format={(v: Date) =>
                          v.toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })
                        }
                      />
                    }
                  />
                }
              />
            }
            yAxis={
              <LinearYAxis
                type='value'
                domain={[0, 100]}
                tickSeries={
                  <LinearYAxisTickSeries
                    label={
                      <LinearYAxisTickLabel
                        format={(v: number) => `${v}%`}
                      />
                    }
                  />
                }
              />
            }
            gridlines={
              <GridlineSeries line={<Gridline direction='all' />} />
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}