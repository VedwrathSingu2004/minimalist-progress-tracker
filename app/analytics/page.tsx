'use client'

import CompletionLineChartView from '@/components/AnalyticsViews/CompletionLineChartView'
import MonthlyAvgHorizontalBarChartView from '@/components/AnalyticsViews/MonthlyAvgHorizontalBarChartView'

const AnalyticsPage = () => {
  return (
    <section className="w-full px-4 py-6 sm:px-6 md:px-8 lg:px-10">
      <div className='m-auto'>
        <CompletionLineChartView />
      </div>
      <div className='m-auto'>
        <MonthlyAvgHorizontalBarChartView />
      </div>
    </section>
  )
}

export default AnalyticsPage