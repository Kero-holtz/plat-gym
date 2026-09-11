import { NextResponse } from "next/server"
import { apiError, jsonBody } from "@/lib/api"
import { requireUser } from "@/lib/auth"
import { updateTrainer } from "@/lib/repository"
import { trainerSchema } from "@/lib/validation"

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(["manager"])
    const { id } = await context.params
    const input = trainerSchema.parse(await jsonBody(request))
    return NextResponse.json({ trainer: await updateTrainer(id, input) })
  } catch (error) {
    return apiError(error)
  }
}
