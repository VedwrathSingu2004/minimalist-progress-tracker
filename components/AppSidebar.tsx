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
  NotebookText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { authClient } from '@/lib/auth/client'

// ── Navigation Links ─────────────────────────────

const topLinks = [
  { label: 'Dashboard',  href: '/dashboard', icon: <LayoutDashboard className='h-5 w-5 flex-shrink-0' /> },
  { label: 'Projects',  href: '/projects', icon: <NotebookText      className='h-5 w-5 shrink-0' /> },
  { label: 'Tasks',      href: '/tasks',     icon: <CheckSquare     className='h-5 w-5 shrink-0' /> },
  { label: 'Calendar',   href: '/calendar',  icon: <CalendarDays    className='h-5 w-5 shrink-0' /> },
  { label: 'Analytics',  href: '/analytics', icon: <BarChart3       className='h-5 w-5 shrink-0' /> },
]

const bottomLinks = [
  { label: 'Settings', href: '/settings', icon: <Settings className='h-5 w-5 shrink-0' /> },
  { label: 'Logout',   href: '/#',   icon: <LogOut   className='h-5 w-5 shrink-0' /> },
]

const isLinkActive = (href: string, pathname: string) => {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

const UserCard = () => {
  const { open, animate } = useSidebar()
  const { data: session, isPending } = authClient.useSession()
  const user = session?.user

  if (isPending) {
    return (
      <div className='flex items-center gap-3 rounded-lg px-2 py-2'>
        <div className='h-7 w-7 animate-pulse rounded-full bg-muted' />
        <motion.div
          animate={{
            display: animate ? (open ? 'flex' : 'none') : 'flex',
            opacity: animate ? (open ? 1 : 0) : 1,
          }}
          className='flex flex-col space-y-1'
        >
          <div className='h-3 w-20 animate-pulse rounded bg-muted' />
          <div className='h-2 w-28 animate-pulse rounded bg-muted' />
        </motion.div>
      </div>
    )
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <div className='flex items-center gap-3 rounded-lg px-2 py-2'>
      <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary'>
        {initials}
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
          {user?.name || 'User'}
        </span>
        <span className='mt-0.5 text-[11px] text-muted-foreground'>
          {user?.email || ''}
        </span>
      </motion.div>
    </div>
  )
}

const LogoutButton = ({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) => {
  const { open, animate } = useSidebar()

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground',
        'group/sidebar-link w-full'
      )}
    >
      {icon}
      <motion.span
        animate={{
          display: animate ? (open ? 'inline' : 'none') : 'inline',
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-sm"
      >
        {label}
      </motion.span>
    </button>
  )
}

// ── Main Export ───────────────────────────────────

export default function AppSidebar({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await authClient.signOut()
      router.push('/auth')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

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
            {bottomLinks.map((link, idx) => {
              if (link.label === 'Logout') {
                return (
                  <LogoutButton
                    key={idx}
                    icon={link.icon}
                    label={link.label}
                    onClick={() => setLogoutDialogOpen(true)}
                  />
                )
              }
              return (
                <SidebarLink
                  key={idx}
                  link={link}
                  active={isLinkActive(link.href, pathname)}
                />
              )
            })}
            <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will be redirected to the sign-in page. Any unsaved changes will be lost.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout}>
                    Log out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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