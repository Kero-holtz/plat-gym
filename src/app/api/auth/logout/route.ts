import { NextResponse } from "next/server"
import { apiError } from "@/lib/api"
import { logoutStaff } from "@/lib/auth"

export async function POST() {
  try {
    await logoutStaff()
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiError(error)
  }
}
