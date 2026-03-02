'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
  Logo,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  Settings,
  LogOut,
  Zap,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

// ── Navigation Links ─────────────────────────────

const topLinks = [
  { label: 'Dashboard',  href: '/dashboard', icon: <LayoutDashboard className='h-5 w-5 flex-shrink-0' /> },
  { label: 'Calendar',   href: '/calendar',  icon: <CalendarDays    className='h-5 w-5 shrink-0' /> },
  { label: 'Tasks',      href: '/tasks',     icon: <CheckSquare     className='h-5 w-5 shrink-0' /> },
  { label: 'Analytics',  href: '/analytics', icon: <BarChart3       className='h-5 w-5 shrink-0' /> },
]

const bottomLinks = [
  { label: 'Settings', href: '/settings', icon: <Settings className='h-5 w-5 shrink-0' /> },
  { label: 'Logout',   href: '/logout',   icon: <LogOut   className='h-5 w-5 shrink-0' /> },
]

// ── Helper: check if a link is active ────────────

const isLinkActive = (href: string, pathname: string) => {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

// ── User Card ────────────────────────────────────

const UserCard = () => {
  const { open, animate } = useSidebar()

  return (
    <div className='flex items-center gap-3 rounded-lg px-2 py-2'>
      <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary'>
        JD
      </div>
      <motion.div
        animate={{
          display: animate ? (open ? 'flex' : 'none') : 'flex',
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={{ duration: 0.2 }}
        className='flex flex-col'
      >
        <span className='text-sm font-medium leading-none text-foreground'>
          John Doe
        </span>
        <span className='mt-0.5 text-[11px] text-muted-foreground'>
          john@example.com
        </span>
      </motion.div>
    </div>
  )
}

// ── Main Export ───────────────────────────────────

export default function AppSidebar({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div
      className={cn(
        'mx-auto flex h-screen w-full flex-1 flex-col overflow-hidden md:flex-row',
        'bg-background',
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className='justify-between gap-6'>
          {/* ── Top section ── */}
          <div className='flex flex-1 flex-col overflow-y-auto overflow-x-hidden'>
            <Logo
              icon={<Zap className='h-6 w-6 shrink-0 text-primary' />}
              text='Minimalist Task Tracker'
            />

            <div className='mt-8 flex flex-col gap-1'>
              {topLinks.map((link, idx) => (
                <SidebarLink
                  key={idx}
                  link={link}
                  active={isLinkActive(link.href, pathname)}
                />
              ))}
            </div>
          </div>

          {/* ── Bottom section ── */}
          <div className='flex flex-col gap-1 border-t border-border pt-4'>
            {bottomLinks.map((link, idx) => (
              <SidebarLink
                key={idx}
                link={link}
                active={isLinkActive(link.href, pathname)}
              />
            ))}
            <div className='mt-2 border-t border-border pt-3'>
              <UserCard />
            </div>
          </div>
        </SidebarBody>
      </Sidebar>

      <main className='flex flex-1 flex-col overflow-auto'>
        {children}
      </main>
    </div>
  )
}