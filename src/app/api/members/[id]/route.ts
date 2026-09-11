import { NextResponse } from "next/server"
import { apiError, jsonBody } from "@/lib/api"
import { requireUser } from "@/lib/auth"
import { DomainError, getMember, updateMember } from "@/lib/repository"
import { memberUpdateSchema } from "@/lib/validation"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser()
    const { id } = await context.params
    const member = await getMember(id)
    if (!member) throw new DomainError("Member not found.", "NOT_FOUND", 404)
    return NextResponse.json({ member })
  } catch (error) {
    return apiError(error)
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser()
    const { id } = await context.params
    const input = memberUpdateSchema.parse(await jsonBody(request))
    return NextResponse.json({ member: await updateMember(id, input) })
  } catch (error) {
    return apiError(error)
  }
}
