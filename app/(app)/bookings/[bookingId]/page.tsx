import type { Metadata } from "next"
import BookingPage from "@/components/bookings/booking-page"

export const metadata: Metadata = { title: "Booking" }
export default async function Page({
  params,
}: {
  params: Promise<{ bookingId: string }>
}) {
  const { bookingId } = await params
  return <BookingPage id={bookingId} />
}
