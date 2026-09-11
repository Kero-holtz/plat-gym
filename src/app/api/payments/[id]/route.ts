import { NextResponse } from "next/server"
import { apiError, jsonBody } from "@/lib/api"
import { requireUser } from "@/lib/auth"
import { updatePaymentStatus } from "@/lib/repository"
import { paymentStatusSchema } from "@/lib/validation"

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser()
    const { id } = await context.params
    const input = paymentStatusSchema.parse(await jsonBody(request))
    return NextResponse.json({ payment: await updatePaymentStatus(id, input.status) })
  } catch (error) {
    return apiError(error)
  }
}
