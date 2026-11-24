import type { Metadata } from "next"
import PassPage from "@/components/app/pass-page"

export const metadata: Metadata = { title: "Pass" }
export default function Page() {
  return <PassPage />
}
