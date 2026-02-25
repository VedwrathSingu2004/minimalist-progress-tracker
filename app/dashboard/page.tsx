'use client'

import { Calendar } from "@/components/ui/calendar"
import { useState, useEffect } from 'react'

const DashboardPage = () => {
    const [date, setDate] = useState<Date | undefined>(new Date())

    useEffect(() => {
        console.log(date)
    }, [date])
 
    return (
        <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-lg border"
        />
    )
}

export default DashboardPage