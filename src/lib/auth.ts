import "server-only"

import { compare } from "bcryptjs"
import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import type { StaffRole, StaffUser } from "@/lib/domain"
import { getDb } from "@/lib/db"
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server"

const COOKIE_NAME = "plat_gym_session"
const SESSION_DURATION_SECONDS = 60 * 60 * 12

function sessionKey(): Uint8Array {
  const configured = process.env.SESSION_SECRET
  if (!configured || configured.length < 32) {
    throw new Error("SESSION_SECRET with at least 32 characters is required for local or automated-test authentication.")
  }
  return new TextEncoder().encode(configured)
}

async function localUserFromCookie(): Promise<StaffUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, sessionKey(), {
      issuer: "plat-gym",
      audience: "plat-gym-staff",
    })
    const id = typeof payload.sub === "string" ? payload.sub : null
    if (!id) return null

    const row = await getDb()
      .selectFrom("staff_users")
      .select(["id", "name", "email", "role", "active"])
      .where("id", "=", id)
      .executeTakeFirst()

    if (!row || Number(row.active) !== 1) return null
    return { id: row.id, name: row.name, email: row.email, role: row.role }
  } catch {
    return null
  }
}

async function supabaseUser(): Promise<StaffUser | null> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getClaims()
  const id = data?.claims?.sub
  if (error || !id) return null

  const { data: profile, error: profileError } = await supabase
    .from("staff_profiles")
    .select("id, name, email, role, active")
    .eq("id", id)
    .single()

  if (profileError || !profile || !profile.active) return null
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role as StaffRole,
  }
}

function assertLocalAuthAllowed(): void {
  if (process.env.VERCEL === "1" && process.env.PLAT_GYM_TEST_MODE !== "true") {
    throw new Error(
      "Supabase Auth is not configured. NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required on Vercel.",
    )
  }
}

export async function getCurrentUser(): Promise<StaffUser | null> {
  if (isSupabaseConfigured()) return supabaseUser()
  assertLocalAuthAllowed()
  return localUserFromCookie()
}

export async function loginStaff(
  email: string,
  password: string,
): Promise<{ user: StaffUser | null; error: string | null }> {
  const normalizedEmail = email.trim().toLowerCase()

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })
    if (error) return { user: null, error: "Incorrect email or password." }
    const user = await supabaseUser()
    if (!user) {
      await supabase.auth.signOut()
      return { user: null, error: "This account does not have staff access." }
    }
    return { user, error: null }
  }

  assertLocalAuthAllowed()
  const row = await getDb()
    .selectFrom("staff_users")
    .select(["id", "name", "email", "role", "password_hash", "active"])
    .where("email", "=", normalizedEmail)
    .executeTakeFirst()

  if (!row || Number(row.active) !== 1 || !row.password_hash) {
    return { user: null, error: "Incorrect email or password." }
  }

  const valid = await compare(password, row.password_hash)
  if (!valid) return { user: null, error: "Incorrect email or password." }

  const user: StaffUser = { id: row.id, name: row.name, email: row.email, role: row.role }
  const token = await new SignJWT({ role: user.role, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer("plat-gym")
    .setAudience("plat-gym-staff")
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(sessionKey())

  ;(await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure:
      process.env.SESSION_COOKIE_SECURE === "true" ||
      (process.env.NODE_ENV === "production" && process.env.SESSION_COOKIE_SECURE !== "false"),
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  })

  return { user, error: null }
}

export async function logoutStaff(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.signOut()
    return
  }
  assertLocalAuthAllowed()
  ;(await cookies()).delete(COOKIE_NAME)
}

export async function requireUser(roles?: StaffRole[]): Promise<StaffUser> {
  const user = await getCurrentUser()
  if (!user) throw new AuthError("Authentication required", 401)
  if (roles && !roles.includes(user.role)) throw new AuthError("Manager access required", 403)
  return user
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403,
  ) {
    super(message)
    this.name = "AuthError"
  }
}
