import type { Metadata } from "next"
import StrikesPage from "@/components/bookings/strikes-page"

export const metadata: Metadata = { title: "Strikes" }
export default function Page() {
  return <StrikesPage />
}
