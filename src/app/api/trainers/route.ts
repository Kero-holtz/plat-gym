import { NextResponse } from "next/server"
import { apiError, jsonBody } from "@/lib/api"
import { requireUser } from "@/lib/auth"
import { createTrainer, listTrainers } from "@/lib/repository"
import { trainerSchema } from "@/lib/validation"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const includeInactive = url.searchParams.get("includeInactive") === "1"
    await requireUser(includeInactive ? ["manager"] : undefined)
    return NextResponse.json({ trainers: await listTrainers(includeInactive) })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(request: Request) {
  try {
    await requireUser(["manager"])
    const input = trainerSchema.parse(await jsonBody(request))
    return NextResponse.json({ trainer: await createTrainer(input) }, { status: 201 })
  } catch (error) {
    return apiError(error)
  }
}
