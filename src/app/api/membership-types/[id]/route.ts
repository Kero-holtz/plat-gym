import { NextResponse } from "next/server"
import { apiError, jsonBody } from "@/lib/api"
import { requireUser } from "@/lib/auth"
import { updateMembershipType } from "@/lib/repository"
import { membershipTypeSchema } from "@/lib/validation"

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(["manager"])
    const { id } = await context.params
    const input = membershipTypeSchema.parse(await jsonBody(request))
    return NextResponse.json({ membershipType: await updateMembershipType(id, input) })
  } catch (error) {
    return apiError(error)
  }
}
