import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { headers } from 'next/headers'

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  const isProtectedPath = request.nextUrl.pathname.startsWith('/dashboard')    ||
                          request.nextUrl.pathname.startsWith('/projects')     ||
                          request.nextUrl.pathname.startsWith('/tasks')     ||
                          request.nextUrl.pathname.startsWith('/api/projects') ||
                          request.nextUrl.pathname.startsWith('/api/tasks')
  const isAuthPath = request.nextUrl.pathname.startsWith('/auth')

  if (isProtectedPath && !session) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  if (isAuthPath && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}