'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import {
  Plus,
  FolderOpen,
  Loader2,
  MoreHorizontal,
  ArrowDownUp,
  AlertCircle,
  RefreshCw,
  Trash2,
  X,
  Check,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { createProject, deleteProject, fetchProjects, Project } from '@/lib/api/projects'
import { cn } from '@/lib/utils'

type SortOrder = 'desc' | 'asc'

// ─── Delete Button Component ──────────────────────────────

const DeleteButton = ({ projectId, onDelete }: { projectId: string; onDelete: (id: string) => void }) => {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Auto reset after 4 seconds
  useEffect(() => {
    if (!isConfirming) return

    const timeout = setTimeout(() => setIsConfirming(false), 4000)

    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsConfirming(false) }
    const onClickOutside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsConfirming(false) }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onClickOutside)
    
    return () => {
      clearTimeout(timeout)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onClickOutside)
    }
  }, [isConfirming])

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await deleteProject(projectId)
      onDelete(projectId)
    } catch (error) {
      console.error('Delete failed:', error)
      // Optionally show error toast
    } finally {
      setIsDeleting(false)
      setIsConfirming(false)
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div 
        ref={ref} 
        className='flex items-center overflow-hidden transition-all duration-250 ease-out'
        style={{ width: isConfirming ? 112 : 32 }}
      >
        <Tooltip open={isConfirming ? false : undefined}>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              disabled={isDeleting}
              className={cn(
                'h-8 w-8 shrink-0 transition-opacity duration-200 cursor-pointer',
                !isConfirming && 'opacity-0 group-hover:opacity-100',
                isConfirming && 'opacity-100',
              )}
              onClick={(e) => {
                e.stopPropagation()
                setIsConfirming(true)
              }}
              aria-label='Delete project'
            >
              {isDeleting 
                ? <Loader2 className='h-3.5 w-3.5 animate-spin' />
                : <Trash2 className='h-3.5 w-3.5' />
              }
            </Button>
          </TooltipTrigger>
          <TooltipContent side='bottom' className='text-xs'>
            Delete project
          </TooltipContent>
        </Tooltip>

        {isConfirming && !isDeleting && (
          <div className='flex items-center text-xs'>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-6 text-muted-foreground'
              onClick={(e) => {
                e.stopPropagation()
                setIsConfirming(false)
              }}
            >
              <X className='h-3.5 w-3.5' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-6 text-destructive hover:text-destructive hover:bg-destructive/10'
              onClick={(e) => {
                e.stopPropagation()
                void handleConfirm()
              }}
            >
              <Check className='h-3.5 w-3.5' />
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

// ─── Main Page ────────────────────────────────────────────

const ProjectsPage = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [nameError, setNameError] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // ─── Sort state ───
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // ─── Derived sorted list ───
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime()
      const dateB = new Date(b.updatedAt).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })
  }, [projects, sortOrder])

  const loadProjects = async () => {
    setIsLoading(true)
    setFetchError(null)

    try {
      const data = await fetchProjects()
      setProjects(data)
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : 'Failed to load projects'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameError('')
    setSubmitError(null)

    if (!name.trim()) {
      setNameError('Project name is required.')
      return
    }

    setIsSubmitting(true)

    try {
      const newProject = await createProject(name.trim(), description.trim())
      setProjects((prev) => [newProject, ...prev])
      resetForm()
      setOpen(false)
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setNameError('')
    setSubmitError(null)
  }

  const handleDeleteProject = (deletedId: string) => {
    setProjects(prev => prev.filter(p => p.id !== deletedId))
  }

  // ─── Render helpers ───

  const renderLoading = () => (
    <div className='flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-24 text-center'>
      <Loader2 className='h-10 w-10 animate-spin text-muted-foreground' />
      <p className='mt-4 text-sm text-muted-foreground'>
        Loading projects…
      </p>
    </div>
  )

  const renderFetchError = () => (
    <div className='flex flex-col items-center justify-center rounded-xl border border-dashed border-destructive/40 px-6 py-24 text-center'>
      <div className='flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10'>
        <AlertCircle className='h-7 w-7 text-destructive' />
      </div>
      <h3 className='mt-6 text-lg font-semibold'>
        Failed to load projects
      </h3>
      <p className='mx-auto mt-2 max-w-sm text-sm text-muted-foreground'>
        {fetchError}
      </p>
      <Button variant='outline' className='mt-8' onClick={loadProjects}>
        <RefreshCw className='mr-2 h-4 w-4' />
        Try again
      </Button>
    </div>
  )

  const renderEmpty = () => (
    <div className='flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-24 text-center'>
      <div className='flex h-16 w-16 items-center justify-center rounded-full bg-muted'>
        <FolderOpen className='h-7 w-7 text-muted-foreground' />
      </div>
      <h3 className='mt-6 text-lg font-semibold'>No projects yet</h3>
      <p className='mx-auto mt-2 max-w-sm text-sm text-muted-foreground'>
        Get started by creating your first project.&nbsp;It only takes a
        few seconds.
      </p>
      <Button className='mt-8' onClick={() => setOpen(true)}>
        <Plus className='mr-2 h-4 w-4' />
        Create your first project
      </Button>
    </div>
  )

  const renderGrid = () => (
    <>
      {/* ── Sort control ── */}
      <div className='mb-6 flex items-center justify-between'>
        <p className='text-sm text-muted-foreground'>
          {projects.length} project{projects.length !== 1 && 's'}
        </p>

        <div className='flex items-center gap-2'>
          <ArrowDownUp className='h-4 w-4 text-muted-foreground' />
          <Select
            value={sortOrder}
            onValueChange={(val) => setSortOrder(val as SortOrder)}
          >
            <SelectTrigger className='w-50'>
              <SelectValue placeholder='Sort by' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='desc'>Last updated (newest)</SelectItem>
              <SelectItem value='asc'>Last updated (oldest)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Cards ── */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {sortedProjects.map((project) => (
          <Card
            key={project.id}
            className='group relative cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-foreground/15'
          >
            <CardHeader className='pb-3'>
              <div className='flex items-start justify-between gap-2'>
                <CardTitle className='line-clamp-1 text-base'>
                  {project.name}
                </CardTitle>
                <Badge
                  variant='secondary'
                  className='shrink-0 text-[11px] font-medium'
                >
                  New
                </Badge>
              </div>
              {project.description ? (
                <CardDescription className='line-clamp-2 text-[13px]'>
                  {project.description}
                </CardDescription>
              ) : (
                <CardDescription className='italic text-[13px]'>
                  No description
                </CardDescription>
              )}
            </CardHeader>

            <CardContent>
              <div className='flex items-center justify-between'>
                <p className='text-xs text-muted-foreground'>
                  {new Date(project.updatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                <div className='flex items-center gap-1'>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100'
                    onClick={(e) => {
                      e.stopPropagation()
                      // You could add an edit menu here later
                    }}
                  >
                    <MoreHorizontal className='h-4 w-4' />
                  </Button>
                  <DeleteButton
                    projectId={project.id}
                    onDelete={handleDeleteProject}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )

  return (
    <div className='min-h-screen bg-background'>
      <div className='mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8'>
        {/* ─── Header ─── */}
        <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
          <div className='space-y-1'>
            <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>
              Projects
            </h1>
            <p className='text-muted-foreground'>
              Create and manage your projects in one place.
            </p>
          </div>

          {/* ─── Dialog ─── */}
          <Dialog
            open={open}
            onOpenChange={(isOpen) => {
              setOpen(isOpen)
              if (!isOpen) resetForm()
            }}
          >
            <DialogTrigger asChild>
              <Button size='default'>
                <Plus className='mr-2 h-4 w-4' />
                New Project
              </Button>
            </DialogTrigger>

            <DialogContent className='sm:max-w-125'>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle className='text-3xl'>
                    Create a new project
                  </DialogTitle>
                  <DialogDescription>
                    Tasks in the respective projects will be isolated from
                    others...
                  </DialogDescription>
                </DialogHeader>

                {/* ─── Submit Error Alert ─── */}
                {submitError && (
                  <Alert variant='destructive' className='mt-4'>
                    <AlertCircle className='h-4 w-4' />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}

                {/* ─── Form Fields ─── */}
                <div className='mt-6 space-y-5'>
                  {/* Name */}
                  <div className='space-y-2'>
                    <Label htmlFor='project-name'>
                      Name&nbsp;
                      <span className='text-destructive'>*</span>
                    </Label>
                    <Input
                      id='project-name'
                      placeholder='e.g. Marketing Website'
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        if (nameError) setNameError('')
                        if (submitError) setSubmitError(null)
                      }}
                      className={
                        nameError
                          ? 'border-destructive focus-visible:ring-destructive/30'
                          : ''
                      }
                      autoFocus
                    />
                    {nameError && (
                      <p className='text-[13px] text-destructive'>
                        {nameError}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div className='space-y-2'>
                    <Label htmlFor='project-description'>
                      Description&nbsp;
                      <span className='font-normal text-muted-foreground'>
                        (optional)
                      </span>
                    </Label>
                    <Textarea
                      id='project-description'
                      placeholder='A short summary of what this project is about…'
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className='resize-none'
                    />
                  </div>
                </div>

                {/* ─── Actions ─── */}
                <DialogFooter className='mt-8 gap-2 sm:gap-0'>
                  <Button
                    type='button'
                    variant='ghost'
                    onClick={() => setOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type='submit' disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    ) : (
                      <Plus className='mr-2 h-4 w-4' />
                    )}
                    Create Project
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Separator className='my-8' />

        {/* ─── Content ─── */}
        {isLoading
          ? renderLoading()
          : fetchError
            ? renderFetchError()
            : projects.length === 0
              ? renderEmpty()
              : renderGrid()}
      </div>
    </div>
  )
}

export default ProjectsPage