import type { Metadata } from "next"
import SchedulePage from "@/components/schedule/schedule-page"

export const metadata: Metadata = { title: "Book" }
export default function Page() {
  return <SchedulePage />
}
