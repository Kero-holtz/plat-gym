import { NextResponse } from "next/server"
import { apiError, jsonBody } from "@/lib/api"
import { requireUser } from "@/lib/auth"
import { addVisit } from "@/lib/repository"
import { visitSchema } from "@/lib/validation"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await context.params
    const input = visitSchema.parse(await jsonBody(request))
    return NextResponse.json({ visit: await addVisit(id, user.id, input.confirmExpired) }, { status: 201 })
  } catch (error) {
    return apiError(error)
  }
}
