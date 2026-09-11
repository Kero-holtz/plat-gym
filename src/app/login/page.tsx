import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { LoginForm } from "./login-form"

export const metadata: Metadata = { title: "Staff sign in" }

export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) redirect("/dashboard")
  return <LoginForm demoMode={!isSupabaseConfigured()} />
}
