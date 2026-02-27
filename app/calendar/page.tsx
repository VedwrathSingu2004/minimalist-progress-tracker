'use client'

import CalendarTaskView from "@/components/TaskViews/CalendarTaskView"

const CalendarViewPage = () => {
  return (
    <section className="w-full px-4 py-6 sm:px-6 md:px-8 lg:px-10">
      <CalendarTaskView />
    </section>
  )
}

export default CalendarViewPage