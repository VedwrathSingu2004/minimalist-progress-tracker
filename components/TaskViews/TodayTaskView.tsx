'use client'

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { qualyFontFamily } from "@/lib/fonts"

type DayOfWeek = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat"

interface Task {
  id: string
  name: string
  taskType: "one_time" | "recurring"
  completed: boolean
  date?: string
  days?: DayOfWeek[]
}

const dayLabels: Record<DayOfWeek, string> = {
  sun: "S",
  mon: "M",
  tue: "T",
  wed: "W",
  thu: "T",
  fri: "F",
  sat: "S",
}

const dayFullLabels: Record<DayOfWeek, string> = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
}

const allDays: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]

const sampleTasks: Task[] = [
  {
    id: "1",
    name: "Morning Standup",
    taskType: "recurring",
    completed: false,
    days: ["mon", "tue", "wed", "thu", "fri"],
  },
  {
    id: "2",
    name: "Submit Report",
    taskType: "one_time",
    completed: false,
    date: "2025-01-15",
  },
  {
    id: "3",
    name: "Gym Workout",
    taskType: "recurring",
    completed: true,
    days: ["mon", "wed", "fri"],
  },
  {
    id: "4",
    name: "Dentist Appointment",
    taskType: "one_time",
    completed: false,
    date: "2025-01-15",
  },
  {
    id: "5",
    name: "Read 30 Minutes",
    taskType: "recurring",
    completed: false,
    days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
  },
  {
    id: "6",
    name: "Team Retrospective",
    taskType: "recurring",
    completed: false,
    days: ["fri"],
  },
]

interface TaskCardProps {
  task: Task
  onToggle: (id: string, checked: boolean) => void
}

function TaskCard({ task, onToggle }: TaskCardProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onToggle(task.id, !task.completed)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onToggle(task.id, !task.completed)
        }
      }}
      className={`
        cursor-pointer
        transition-colors
        duration-200
        hover:bg-accent
        active:bg-accent/80
        ${task.completed ? "bg-muted/50" : ""}
      `}
    >
      <CardContent className="flex flex-col gap-3">
        {/* Checkbox + Task Name */}
        <div className="flex items-center gap-3">
          <Checkbox
            id={`task-${task.id}`}
            checked={task.completed}
            onCheckedChange={(checked) =>
              onToggle(task.id, checked as boolean)
            }
            onClick={(e) => e.stopPropagation()}
          />
          <Label
            htmlFor={`task-${task.id}`}
            className={`
              ${
                task.completed
                  ? "line-through text-muted-foreground"
                  : ""
              }
              text-2xl
              pointer-events-none
              select-none
              ${qualyFontFamily.className}
            `}
          >
            {task.name}
          </Label>

          <Badge variant="outline" className="ml-auto select-none">
            {task.taskType === "recurring" ? "Recurring" : "One-time"}
          </Badge>
        </div>

        {/* Recurring → Day Chips */}
        {task.taskType === "recurring" && task.days && (
          <div className="flex items-center opacity-80 gap-1.5 pl-7">
            {allDays.map((day) => (
              <Badge
                key={day}
                variant={task.days!.includes(day) ? "default" : "secondary"}
                className="h-7 w-7 justify-center rounded-full p-0 text-xs select-none"
                title={dayFullLabels[day]}
              >
                {dayLabels[day]}
              </Badge>
            ))}
          </div>
        )}

        {/* One-time → Show date */}
        {task.taskType === "one_time" && task.date && (
          <div className="pl-7">
            <Badge variant="secondary" className="select-none">
              {task.date}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface TodayTaskViewProps {
  tasks?: Task[]
}

export default function TodayTaskView({
  tasks = sampleTasks,
}: TodayTaskViewProps) {
  const [taskList, setTaskList] = useState<Task[]>(tasks)

  const completedCount = taskList.filter((t) => t.completed).length

  const handleToggle = (id: string, checked: boolean) => {
    setTaskList((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: checked } : task
      )
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className={`text-2xl`}>Today&apos;</CardTitle>
        <CardDescription>
          {completedCount} of {taskList.length} tasks completed
        </CardDescription>
      </CardHeader>

      <Separator />

      <CardContent>
        <ScrollArea className="h-125 pr-4">
          <div className="flex flex-col gap-3">
            {taskList.length === 0 && (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">
                    No tasks for today
                  </p>
                </CardContent>
              </Card>
            )}

            {taskList.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}