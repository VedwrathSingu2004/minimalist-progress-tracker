'use client'

import { useState, useEffect } from "react"
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
import { Loader2 } from "lucide-react"
import { qualyFontFamily } from "@/lib/fonts"
import { fetchTodayTasks, toggleOccurrence, type TodayTask } from "@/lib/api/tasks"

const dayLabels: Record<number, string> = {
  0: "S",
  1: "M",
  2: "T",
  3: "W",
  4: "T",
  5: "F",
  6: "S",
}

const dayFullLabels: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
}

const allDays = [0, 1, 2, 3, 4, 5, 6]

interface TaskCardProps {
  task: TodayTask
  onToggle: (occurrenceId: string, checked: boolean) => void
}

function TaskCard({ task, onToggle }: TaskCardProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onToggle(task.occurrenceId, !task.completed)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onToggle(task.occurrenceId, !task.completed)
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
            id={`task-${task.occurrenceId}`}
            checked={task.completed}
            onCheckedChange={(checked) =>
              onToggle(task.occurrenceId, checked as boolean)
            }
            onClick={(e) => e.stopPropagation()}
          />
          <Label
            htmlFor={`task-${task.occurrenceId}`}
            className={`
              ${task.completed ? "line-through text-muted-foreground" : ""}
              text-2xl
              pointer-events-none
              select-none
              ${qualyFontFamily.className}
            `}
          >
            {task.taskName}
          </Label>

          <Badge variant="outline" className="ml-auto select-none">
            {task.taskType === "recurring" ? "Recurring" : "One-time"}
          </Badge>
        </div>

        {/* Recurring → Day Chips (if days available) */}
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
        {task.taskType === "one_time" && (
          <div className="pl-7">
            <Badge variant="secondary" className="select-none">
              {new Date(task.date + 'T00:00:00').toLocaleDateString()}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function TodayTaskView() {
  const [tasks, setTasks] = useState<TodayTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTasks = async () => {
      try {
        setLoading(true)
        const data = await fetchTodayTasks()
        setTasks(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tasks')
      } finally {
        setLoading(false)
      }
    }
    loadTasks()
  }, [])

  const handleToggle = async (occurrenceId: string, checked: boolean) => {
    // Optimistic update
    setTasks(prev =>
      prev.map(t =>
        t.occurrenceId === occurrenceId ? { ...t, completed: checked } : t
      )
    )

    try {
      await toggleOccurrence(occurrenceId)
    } catch (err) {
      // Revert on error
      setTasks(prev =>
        prev.map(t =>
          t.occurrenceId === occurrenceId ? { ...t, completed: !checked } : t
        )
      )
      console.error('Toggle failed:', err)
    }
  }

  const completedCount = tasks.filter(t => t.completed).length

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-destructive">
          Error: {error}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className={`text-2xl`}>Today's Tasks</CardTitle>
        <CardDescription>
          {completedCount} of {tasks.length} tasks completed
        </CardDescription>
      </CardHeader>

      <Separator />

      <CardContent>
        <ScrollArea className="h-125 pr-4">
          <div className="flex flex-col gap-3">
            {tasks.length === 0 && (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">
                    No tasks for today
                  </p>
                </CardContent>
              </Card>
            )}

            {tasks.map((task) => (
              <TaskCard
                key={task.occurrenceId}
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