import type { Metadata } from "next"
import { MembersView } from "./members-view"

export const metadata: Metadata = { title: "Members" }

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams
  const initialStatus = ["active", "expiring", "expired"].includes(status ?? "") ? status! : "all"
  return <MembersView initialStatus={initialStatus as "all" | "active" | "expiring" | "expired"} />
}
