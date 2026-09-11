import type { Metadata } from "next"
import { getCurrentUser } from "@/lib/auth"
import { TrainersView } from "./trainers-view"

export const metadata: Metadata = { title: "Trainers" }

export default async function TrainersPage() {
  const user = await getCurrentUser()
  return <TrainersView canManage={user?.role === "manager"} />
}
