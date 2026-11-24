import { redirect } from "next/navigation"

// Every booking ends in the same toast (lib/booked-toast.ts), so there is no confirmation page. An old link opens
// Bookings, where the booking is listed.
export default function Page() {
  redirect("/bookings")
}
