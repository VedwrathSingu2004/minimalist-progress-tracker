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
  BarChart,
  BarSeries,
  Bar,
  LinearXAxis,
  LinearXAxisTickSeries,
  LinearXAxisTickLabel,
  LinearYAxis,
  LinearYAxisTickSeries,
  LinearYAxisTickLabel,
  GridlineSeries,
  Gridline,
  ChartTooltip,
} from 'reaviz'
import { useState, useRef, useEffect } from 'react'

const BAR_COLOR = '#FF6868'

const staticData = [
  { month: 'Jan', percentage: 72 },
  { month: 'Feb', percentage: 65 },
  { month: 'Mar', percentage: 80 },
  { month: 'Apr', percentage: 58 },
  { month: 'May', percentage: 90 },
  { month: 'Jun', percentage: 45 },
  { month: 'Jul', percentage: 78 },
  { month: 'Aug', percentage: 85 },
  { month: 'Sep', percentage: 62 },
  { month: 'Oct', percentage: 73 },
  { month: 'Nov', percentage: 88 },
  { month: 'Dec', percentage: 55 },
]

const chartData = staticData.map((d) => ({
  key: d.month,
  data: d.percentage,
}))

export default function MonthlyCompletionBarChartView() {
  const [year, setYear] = useState('2026')
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 700, height: 500 })

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
        <CardTitle>Avg. Task Completion by Month</CardTitle>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className='w-28'>
            <SelectValue placeholder='Year' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='2024'>2024</SelectItem>
            <SelectItem value='2025'>2025</SelectItem>
            <SelectItem value='2026'>2026</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className='h-125 w-full'>
          <BarChart
            width={dimensions.width}
            height={dimensions.height}
            data={chartData}
            xAxis={
              <LinearXAxis
                type='value'
                tickSeries={
                  <LinearXAxisTickSeries
                    label={
                      <LinearXAxisTickLabel
                        format={(v: any) => `${v}%`}
                      />
                    }
                  />
                }
              />
            }
            yAxis={
              <LinearYAxis
                type='category'
                tickSeries={
                  <LinearYAxisTickSeries
                    label={<LinearYAxisTickLabel />}
                  />
                }
              />
            }
            series={
              <BarSeries
                layout='horizontal'
                colorScheme={BAR_COLOR}
                padding={0.3}
                bar={
                  <Bar
                    tooltip={
                      <ChartTooltip
                        content={(d: any) =>
                          `${d.key}: ${d.data}% avg completed`
                        }
                      />
                    }
                  />
                }
              />
            }
            gridlines={
              <GridlineSeries line={<Gridline direction='x' />} />
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}