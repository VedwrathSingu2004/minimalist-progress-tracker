'use client'

import AddTaskForm from "@/components/Forms/CreateTaskForm"
import CalendarTaskView from "@/components/TaskViews/CalendarTaskView"
import TasksList from "@/components/TaskViews/TasksList"
import TodayTaskView from "@/components/TaskViews/TodayTaskView"

const DashboardPage = () => {
  return (
    <section className="w-full px-4 py-6 sm:px-6 md:px-8 lg:px-10">
      <TasksList />
    </section>
  )
}

export default DashboardPage