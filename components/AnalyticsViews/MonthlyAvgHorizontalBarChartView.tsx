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
import { Loader2 } from 'lucide-react'

const BAR_COLOR = '#FF6868'

interface MonthlyStat {
  month: string
  year: number
  percentage: number
}

export default function MonthlyCompletionBarChartView() {
  const [year, setYear] = useState('2026')
  const [data, setData] = useState<MonthlyStat[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 700, height: 500 })

  // Fetch data when year changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/tasks/stats/monthly?year=${year}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to fetch')
        setData(json.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [year])

  // Responsive sizing
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

  const chartData = data.map((d) => ({
    key: d.month,
    data: d.percentage,
  }))

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
        {loading ? (
          <div className='flex h-125 items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : error ? (
          <div className='flex h-125 items-center justify-center text-destructive'>
            Error: {error}
          </div>
        ) : data.length === 0 ? (
          <div className='flex h-125 items-center justify-center text-muted-foreground'>
            No data available for {year}
          </div>
        ) : (
          <div ref={containerRef} className='h-125 w-full'>
            <BarChart
              width={dimensions.width}
              height={dimensions.height}
              data={chartData}
              xAxis={
                <LinearXAxis
                  type='value'
                  domain={[0, 100]}
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
        )}
      </CardContent>
    </Card>
  )
}