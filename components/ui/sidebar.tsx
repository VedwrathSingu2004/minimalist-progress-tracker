'use client'

import { cn } from '@/lib/utils'
import Link, { LinkProps } from 'next/link'
import React, { useState, createContext, useContext, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Context
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface SidebarContextProps {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  animate: boolean
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined)

export const useSidebar = () => {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within a SidebarProvider')
  return ctx
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Provider
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
  animate?: boolean
}) => {
  const [openState, setOpenState] = useState(false)
  const open = openProp !== undefined ? openProp : openState
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sidebar Wrapper
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
  animate?: boolean
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SidebarBody — renders both Desktop & Mobile
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<'div'>)} />
    </>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Desktop Sidebar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar()

  return (
    <>
      {/* Spacer — always occupies 60px so main content doesn't shift */}
      <div className='hidden h-full w-15 shrink-0 md:block' />

      {/* Actual sidebar — fixed, overlays content when expanded */}
      <motion.div
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden h-full w-15 shrink-0 flex-col border-r border-border bg-background px-4 py-4 shadow-none md:flex',
          className,
        )}
        animate={{
          width: animate ? (open ? '250px' : '75px') : '250px',
          boxShadow: animate
            ? open
              ? '4px 0 24px rgba(0, 0, 0, 0.08)'
              : 'none'
            : 'none',
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        {...props}
      >
        {children}
      </motion.div>
    </>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Mobile Sidebar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) => {
  const { open, setOpen } = useSidebar()

  return (
    <>
      {/* top bar */}
      <div
        className={cn(
          'flex h-14 w-full flex-row items-center justify-between border-b border-border bg-background px-4 md:hidden',
        )}
        {...props}
      >
        <div className='z-20 flex w-full items-center justify-end'>
          <button
            aria-label='Open sidebar'
            onClick={() => setOpen(!open)}
            className='text-foreground'
          >
            <Menu className='h-5 w-5' />
          </button>
        </div>
      </div>

      {/* overlay + drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={cn(
              'fixed inset-0 z-100 flex h-full w-full flex-col bg-background p-6 md:hidden',
              className,
            )}
          >
            <button
              aria-label='Close sidebar'
              onClick={() => setOpen(false)}
              className='absolute right-6 top-6 z-50 text-foreground'
            >
              <X className='h-5 w-5' />
            </button>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SidebarLink
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface SidebarLinkType {
  label: string
  href: string
  icon: React.JSX.Element
}

export const SidebarLink = ({
  link,
  active = false,
  className,
  ...props
}: {
  link: SidebarLinkType
  active?: boolean
  className?: string
  props?: LinkProps
}) => {
  const { open, animate } = useSidebar()

  return (
    <Link
      href={link.href}
      className={cn(
        'group/sidebar-link flex items-center justify-start gap-3 rounded-lg px-2 py-2 transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted',
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          'shrink-0 transition-colors',
          active
            ? '[&>svg]:text-primary'
            : '[&>svg]:text-muted-foreground group-hover/sidebar-link:[&>svg]:text-foreground',
        )}
      >
        {link.icon}
      </div>
      <motion.span
        animate={{
          display: animate ? (open ? 'inline-block' : 'none') : 'inline-block',
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={{ duration: 0.2 }}
        className={cn(
          'm-0! inline-block whitespace-pre p-0! text-sm font-medium transition duration-150 group-hover/sidebar-link:translate-x-0.5',
          active ? 'text-primary font-semibold' : 'text-foreground',
        )}
      >
        {link.label}
      </motion.span>

      {/* Active indicator bar (visible only when collapsed on desktop) */}
      {active && (
        <motion.div
          layoutId='active-sidebar-indicator'
          className='absolute left-0 h-6 w-0.75 rounded-r-full bg-primary'
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
    </Link>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Logo helpers (optional convenience)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const Logo = ({
  icon,
  text,
}: {
  icon: React.ReactNode
  text: string
}) => {
  const { open, animate } = useSidebar()

  return (
    <Link
      href='/'
      className='relative z-20 flex items-center gap-2 px-2 py-1 text-sm font-bold text-foreground'
    >
      <div className='shrink-0'>{icon}</div>
      <motion.span
        animate={{
          display: animate ? (open ? 'inline-block' : 'none') : 'inline-block',
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={{ duration: 0.2 }}
        className='whitespace-pre font-bold'
      >
        {text}
      </motion.span>
    </Link>
  )
}

export const LogoIcon = ({ icon }: { icon: React.ReactNode }) => {
  return (
    <Link
      href='/'
      className='relative z-20 flex items-center px-2 py-1'
    >
      <div className='shrink-0'>{icon}</div>
    </Link>
  )
}