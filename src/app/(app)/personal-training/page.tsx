import type { Metadata } from "next"
import { PersonalTrainingView } from "./personal-training-view"

export const metadata: Metadata = { title: "Personal Training" }

export default function PersonalTrainingPage() {
  return <PersonalTrainingView />
}
