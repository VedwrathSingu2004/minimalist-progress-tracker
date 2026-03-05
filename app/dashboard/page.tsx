'use client'

import AddTaskForm from "@/components/Forms/CreateTaskForm"
import TodayTaskView from "@/components/TaskViews/TodayTaskView"

const DashboardPage = () => {
  return (
    <section className="w-full px-4 py-6 sm:px-6 md:px-8 lg:px-10">
      <div
        className="
          mx-auto
          max-w-sm sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl
          grid
          grid-cols-1 md:grid-cols-2
          gap-6 lg:gap-8
        "
      >
        <div className="border rounded-xl px-6 py-5 sm:px-8 lg:px-10">
          <AddTaskForm />
        </div>
        <div className="sm:px-8 lg:px-10">
          <TodayTaskView />
        </div>
      </div>
    </section>
  )
}

export default DashboardPage