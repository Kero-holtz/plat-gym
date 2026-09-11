import { NextResponse } from "next/server"
import { apiError, jsonBody } from "@/lib/api"
import { requireUser } from "@/lib/auth"
import { createBooking, listBookings } from "@/lib/repository"
import { bookingCreateSchema } from "@/lib/validation"
import type { BookingStatus } from "@/lib/domain"

const scopes = new Set(["today", "upcoming", "all"])
const statuses = new Set(["scheduled", "completed", "cancelled", "all"])

export async function GET(request: Request) {
  try {
    await requireUser()
    const url = new URL(request.url)
    const requestedScope = url.searchParams.get("scope") ?? "upcoming"
    const requestedStatus = url.searchParams.get("status") ?? "all"
    const scope = scopes.has(requestedScope) ? (requestedScope as "today" | "upcoming" | "all") : "upcoming"
    const status = statuses.has(requestedStatus) ? (requestedStatus as BookingStatus | "all") : "all"
    return NextResponse.json({ bookings: await listBookings({ scope, status }) })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const input = bookingCreateSchema.parse(await jsonBody(request))
    return NextResponse.json({ booking: await createBooking(input, user.id) }, { status: 201 })
  } catch (error) {
    return apiError(error)
  }
}
