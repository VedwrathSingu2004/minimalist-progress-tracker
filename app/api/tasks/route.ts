import db from "@/db"
import tasks from "@/db/schema/models/tasks.model"
import { and, gte, lte } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import v from 'validator'

export async function POST (req: NextRequest) {
    try {
        const body = await req.json()
        const { name, taskType, startDate, endDate } = body

        let missing_fields = []

        if(!name)
            missing_fields.push("name")
        if(!taskType)
            missing_fields.push("task type")
        if(!startDate)
            missing_fields.push("start date")
        if(!endDate)
            missing_fields.push("end date")

        if(missing_fields.length > 0)
            return NextResponse.json({ success: false, message: "Missing required fields: " + missing_fields.join(", ") }, { status: 400 })

        const result = await db.insert(tasks)
                .values({
                    userId: 'c5520625-cb6d-4afa-b212-ceab7b17ce6f',
                    name,
                    taskType,
                    startDate,
                    endDate
                })
                .returning({ insertedId: tasks.id })

        return NextResponse.json({ success: true, result }, { status: 201 })
    } catch (error) {
        console.log(error)
        return NextResponse.json({ success: false, message: "Internal Server Error : " + error }, { status: 502 })
    }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    let result

    if (startDate && endDate) {
      result = await db
        .select()
        .from(tasks)
        .where(
          and(
            gte(tasks.startDate, startDate),
            lte(tasks.endDate, endDate)
          )
        )
    } 
    else if (startDate) {
      result = await db
        .select()
        .from(tasks)
        .where(gte(tasks.startDate, startDate))
    }
    else if (endDate) {
      result = await db
        .select()
        .from(tasks)
        .where(lte(tasks.endDate, endDate))
    }
    else {
      result = await db.select().from(tasks)
    }

    return NextResponse.json(
      { success: true, data: result },
      { status: 200 }
    )
  } catch (error) {
    console.error("GET /tasks error:", error)

    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    )
  }
}