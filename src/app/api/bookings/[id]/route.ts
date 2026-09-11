import { NextResponse } from "next/server"
import { apiError, jsonBody } from "@/lib/api"
import { requireUser } from "@/lib/auth"
import { updateBookingStatus } from "@/lib/repository"
import { bookingStatusSchema } from "@/lib/validation"

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await context.params
    const input = bookingStatusSchema.parse(await jsonBody(request))
    return NextResponse.json({ booking: await updateBookingStatus(id, input.status, user.id) })
  } catch (error) {
    return apiError(error)
  }
}
