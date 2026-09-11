import type { Metadata } from "next"
import { MemberProfileView } from "./member-profile-view"

export const metadata: Metadata = { title: "Member profile" }

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <MemberProfileView memberId={id} />
}
