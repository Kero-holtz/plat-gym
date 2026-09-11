import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { AuthError } from "@/lib/auth"
import { DomainError } from "@/lib/repository"

export function apiError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message, code: "AUTH" }, { status: error.status })
  }
  if (error instanceof DomainError) {
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details },
      { status: error.status },
    )
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Check the highlighted information and try again.",
        code: "VALIDATION",
        details: { fields: error.flatten().fieldErrors },
      },
      { status: 422 },
    )
  }

  console.error(error)
  return NextResponse.json(
    { error: "Something went wrong. Please try again.", code: "INTERNAL" },
    { status: 500 },
  )
}

export async function jsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new DomainError("Send a valid JSON request.", "INVALID_JSON", 400)
  }
}
