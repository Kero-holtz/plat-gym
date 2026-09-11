import { NextResponse } from "next/server"
import { apiError } from "@/lib/api"
import { requireUser } from "@/lib/auth"
import { getDashboard } from "@/lib/repository"

export async function GET() {
  try {
    await requireUser()
    return NextResponse.json(await getDashboard())
  } catch (error) {
    return apiError(error)
  }
}
