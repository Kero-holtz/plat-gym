import { NextResponse } from "next/server"
import { apiError, jsonBody } from "@/lib/api"
import { requireUser } from "@/lib/auth"
import { renewMember } from "@/lib/repository"
import { memberRenewSchema } from "@/lib/validation"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await context.params
    const input = memberRenewSchema.parse(await jsonBody(request))
    return NextResponse.json({ member: await renewMember(id, input, user.id) })
  } catch (error) {
    return apiError(error)
  }
}
