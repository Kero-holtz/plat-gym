import { NextResponse } from "next/server"
import { apiError, jsonBody } from "@/lib/api"
import { loginStaff } from "@/lib/auth"
import { loginSchema } from "@/lib/validation"

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await jsonBody(request))
    const result = await loginStaff(input.email, input.password)
    if (!result.user) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }
    return NextResponse.json({ user: result.user })
  } catch (error) {
    return apiError(error)
  }
}
