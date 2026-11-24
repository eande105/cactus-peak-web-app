"use client"
import { BookingDetail } from "@/components/bookings/booking-detail"
import { AppPage } from "@/components/kit/app"

/** One booking on its own page: where a phone row goes, and a link from a toast or a notice. */
export default function BookingPage({ id }: { id: string }) {
  return (
    <AppPage
      title="Booking"
      width="narrow"
      back={{ href: "/bookings", label: "Bookings" }}
    >
      <BookingDetail id={id} />
    </AppPage>
  )
}
