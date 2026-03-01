import { auth } from '@/better-auth.config'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import db from '@/db'
import projects from '@/db/schema/models/projects.model'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, session.user.id))
      .orderBy(projects.createdAt)

    return NextResponse.json({ success: true, data: userProjects })
  } catch (error) {
    console.error('GET /projects error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    const [newProject] = await db
      .insert(projects)
      .values({
        userId: session.user.id,
        name,
        description,
      })
      .returning()

    return NextResponse.json({ success: true, data: newProject }, { status: 201 })
  } catch (error) {
    console.error('POST /projects error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}