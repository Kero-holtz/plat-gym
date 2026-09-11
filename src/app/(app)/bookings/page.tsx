import type { Metadata } from "next"
import { BookingsView } from "./bookings-view"

export const metadata: Metadata = { title: "Bookings" }

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const { scope } = await searchParams
  const initialScope = ["today", "upcoming", "all"].includes(scope ?? "") ? scope! : "today"
  return <BookingsView initialScope={initialScope as "today" | "upcoming" | "all"} />
}
