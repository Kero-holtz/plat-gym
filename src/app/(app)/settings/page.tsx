import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { SettingsView } from "./settings-view"

export const metadata: Metadata = { title: "Gym settings" }

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (user?.role !== "manager") redirect("/dashboard")
  return <SettingsView />
}
