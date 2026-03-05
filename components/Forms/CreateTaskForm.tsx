'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fetchProjects } from '@/lib/api/projects'
import { createTask } from '@/lib/api/tasks'

// Map day IDs (from form) to numbers (0-6, where 0 = Sunday)
const dayToNumber: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

const daysOfWeek = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' },
] as const

const formSchema = z
  .object({
    name: z.string().min(1, { message: 'Task name is required.' }),
    project_id: z.string().min(1, { message: 'Please select a project.' }),
    task_type: z.enum(['one_time', 'recurring'], {
      message: 'Please select a task type.',
    }),
    date: z.date().optional(),
    start_date: z.date().optional(),
    end_date: z.date().optional(),
    days: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.task_type === 'one_time') {
      if (!data.date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Date is required.',
          path: ['date'],
        })
      }
    }
    if (data.task_type === 'recurring') {
      if (!data.start_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Start date is required.',
          path: ['start_date'],
        })
      }
      if (!data.end_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End date is required.',
          path: ['end_date'],
        })
      }
      if (
        data.start_date &&
        data.end_date &&
        data.end_date <= data.start_date
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End date must be after start date.',
          path: ['end_date'],
        })
      }
      if (!data.days || data.days.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select at least one day.',
          path: ['days'],
        })
      }
    }
  })

type FormData = z.infer<typeof formSchema>

interface Project {
  id: string
  name: string
}

export default function AddTaskForm() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      project_id: '',
      task_type: 'one_time',
      date: undefined,
      start_date: undefined,
      end_date: undefined,
      days: [],
    },
  })

  const taskType = form.watch('task_type')

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await fetchProjects()
        setProjects(data)
      } catch (err) {
        setProjectsError(err instanceof Error ? err.message : 'An unknown error occurred')
      } finally {
        setIsLoadingProjects(false)
      }
    }
    loadProjects()
  }, [])

  const onSubmit = async (data: FormData) => {
    setSubmitError(null)
    setIsSubmitting(true)

    try {
      const apiData: {
        name: string
        taskType: 'one_time' | 'recurring'
        startDate: string
        endDate?: string | null
        recurrenceDays?: number[]
        projectId: string
      } = {
        name: data.name,
        taskType: data.task_type,
        projectId: data.project_id,
        startDate: '',
      }

      if (data.task_type === 'one_time' && data.date) {
        apiData.startDate = format(data.date, 'yyyy-MM-dd')
        apiData.endDate = null
      } else if (data.task_type === 'recurring' && data.start_date) {
        apiData.startDate = format(data.start_date, 'yyyy-MM-dd')
        apiData.endDate = data.end_date
          ? format(data.end_date, 'yyyy-MM-dd')
          : null
        apiData.recurrenceDays = data.days?.map((dayId) => dayToNumber[dayId]) || []
      }

      await createTask(apiData)
      console.log(data)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingProjects) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (projectsError) {
    return (
      <div className="text-center py-8 text-destructive">
        Error loading projects: {projectsError}
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <h2 className={`text-2xl font-bold`}>Create New Task</h2>

        {/* Task Name */}
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel className={`text-xl`}>Task Name</FormLabel>
              <FormControl>
                <Input
                  className={`text-xl`}
                  placeholder='Enter task name'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Project */}
        <FormField
          control={form.control}
          name='project_id'
          render={({ field }) => (
            <FormItem>
              <FormLabel className={`text-xl`}>Project</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className='w-full text-xl'>
                    <SelectValue placeholder='Select a project' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem
                      key={project.id}
                      value={project.id}
                      className='text-xl'
                    >
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Task Type */}
        <FormField
          control={form.control}
          name='task_type'
          render={({ field }) => (
            <FormItem>
              <FormLabel className={`text-xl`}>Task Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => {
                    field.onChange(value)
                    if (value === 'one_time') {
                      form.setValue('start_date', undefined)
                      form.setValue('end_date', undefined)
                      form.setValue('days', [])
                    } else {
                      form.setValue('date', undefined)
                    }
                  }}
                  defaultValue={field.value}
                  className='flex flex-col space-y-1'
                >
                  <FormItem className='flex items-center space-x-3 space-y-0'>
                    <FormControl>
                      <RadioGroupItem value='one_time' />
                    </FormControl>
                    <FormLabel className='font-thin text-xl'>
                      One Time
                    </FormLabel>
                  </FormItem>
                  <FormItem className='flex items-center space-x-3 space-y-0'>
                    <FormControl>
                      <RadioGroupItem value='recurring' />
                    </FormControl>
                    <FormLabel className='font-thin text-xl'>
                      Recurring
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* One Time → Single Date */}
        {taskType === 'one_time' && (
          <FormField
            control={form.control}
            name='date'
            render={({ field }) => (
              <FormItem className='flex flex-col'>
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant='outline'
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP')
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className='w-auto p-0' align='start'>
                    <Calendar
                      mode='single'
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Recurring → Start Date, End Date, Days */}
        {taskType === 'recurring' && (
          <>
            <FormField
              control={form.control}
              name='start_date'
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <FormLabel>Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant='outline'
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick start date</span>
                          )}
                          <CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className='w-auto p-0' align='start'>
                      <Calendar
                        mode='single'
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='end_date'
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <FormLabel>End Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant='outline'
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick end date</span>
                          )}
                          <CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className='w-auto p-0' align='start'>
                      <Calendar
                        mode='single'
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => {
                          const startDate = form.getValues('start_date')
                          return startDate ? date <= startDate : false
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='days'
              render={() => (
                <FormItem>
                  <FormLabel>Days of Week</FormLabel>
                  {daysOfWeek.map((day) => (
                    <FormField
                      key={day.id}
                      control={form.control}
                      name='days'
                      render={({ field }) => (
                        <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(day.id)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([
                                      ...(field.value || []),
                                      day.id,
                                    ])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value) => value !== day.id
                                      )
                                    )
                              }}
                            />
                          </FormControl>
                          <FormLabel className='font-normal'>
                            {day.label}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {/* Submit error */}
        {submitError && (
          <p className="text-sm text-destructive">{submitError}</p>
        )}

        <Button className={`text-xl`} type='submit' disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='28'
              height='28'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className='lucide lucide-plus-icon lucide-plus'
            >
              <path d='M5 12h14' />
              <path d='M12 5v14' />
            </svg>
          )}
          Add
        </Button>
      </form>
    </Form>
  )
}