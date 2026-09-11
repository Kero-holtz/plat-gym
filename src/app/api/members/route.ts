import { NextResponse } from "next/server"
import { apiError, jsonBody } from "@/lib/api"
import { requireUser } from "@/lib/auth"
import { createMember, listMembers } from "@/lib/repository"
import { memberCreateSchema } from "@/lib/validation"
import type { MembershipStatus } from "@/lib/domain"

const statuses = new Set(["active", "expiring", "expired", "all"])

export async function GET(request: Request) {
  try {
    await requireUser()
    const url = new URL(request.url)
    const requested = url.searchParams.get("status") ?? "all"
    const status = statuses.has(requested) ? (requested as MembershipStatus | "all") : "all"
    const members = await listMembers({
      search: url.searchParams.get("search") ?? undefined,
      status,
    })
    return NextResponse.json({ members })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const input = memberCreateSchema.parse(await jsonBody(request))
    const member = await createMember(input, user.id)
    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    return apiError(error)
  }
}
