import { redirect } from "next/navigation"

// The Reserve hub is gone: courts, lanes and kids club are tabs of Book. Old links land on the first tab.
export default function Page() {
  redirect("/reserve/courts")
}
