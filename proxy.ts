import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { headers } from 'next/headers'

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  const isProtectedPath = request.nextUrl.pathname.startsWith('/dashboard') ||
                         request.nextUrl.pathname.startsWith('/api/tasks')
  const isAuthPath = request.nextUrl.pathname.startsWith('/auth')

  // Redirect to sign-in if accessing protected route without session
  if (isProtectedPath && !session) {
    return NextResponse.redirect(new URL('/auth/sign-in', request.url))
  }

  // Redirect to dashboard if accessing auth pages while logged in
  if (isAuthPath && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}