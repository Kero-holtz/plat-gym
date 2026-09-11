import { NextResponse } from "next/server"
import { apiError } from "@/lib/api"
import { requireUser } from "@/lib/auth"
import { DomainError, getAvailableSlots } from "@/lib/repository"

export async function GET(request: Request) {
  try {
    await requireUser()
    const url = new URL(request.url)
    const trainerId = url.searchParams.get("trainerId")
    const date = url.searchParams.get("date")
    if (!trainerId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new DomainError("Choose a trainer and date.", "INVALID_REQUEST")
    }
    return NextResponse.json({ slots: await getAvailableSlots(trainerId, date) })
  } catch (error) {
    return apiError(error)
  }
}
