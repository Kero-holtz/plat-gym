import { NextResponse } from "next/server"
import { apiError, jsonBody } from "@/lib/api"
import { requireUser } from "@/lib/auth"
import { createPayment, listPayments } from "@/lib/repository"
import { paymentCreateSchema } from "@/lib/validation"
import type { PaymentStatus, PaymentType } from "@/lib/domain"

const statuses = new Set(["paid", "pending", "all"])
const types = new Set(["membership", "pt", "all"])

export async function GET(request: Request) {
  try {
    await requireUser()
    const url = new URL(request.url)
    const requestedStatus = url.searchParams.get("status") ?? "all"
    const requestedType = url.searchParams.get("type") ?? "all"
    const status = statuses.has(requestedStatus) ? (requestedStatus as PaymentStatus | "all") : "all"
    const type = types.has(requestedType) ? (requestedType as PaymentType | "all") : "all"
    const payments = await listPayments({ status, type, search: url.searchParams.get("search") ?? undefined })
    return NextResponse.json({ payments })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const input = paymentCreateSchema.parse(await jsonBody(request))
    return NextResponse.json({ payment: await createPayment(input, user.id) }, { status: 201 })
  } catch (error) {
    return apiError(error)
  }
}
