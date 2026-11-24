"use client"
import { useApp } from "@/components/app/use-app"
import { BookingRows } from "@/components/bookings/booking-rows"
import { relDay } from "@/lib/time"
import type { Booking } from "@/lib/types"

/** A booking in Coming up. Two children in the same kids club block are one item, named in `names`. */
export type ComingItem = Booking & { names?: string }

/** Rows that show below the page's wide width. The wide layout shows all of them. */
export const COMING_NARROW = 5
export const COMING_WIDE = 8

/** Where a row goes when no drawer is open: a class to its page, any other booking to its own route. */
export function bookingHref(b: Booking) {
  return b.sessionId ? `/schedule/${b.sessionId}` : `/bookings/${b.id}`
}

/**
 * Coming up: the shared booking rows (`BookingRows`) with the day under the time, the day first in the narrow line,
 * and five rows below the page's wide width. With `drawer`, a row selects the booking; without it, a row is a link.
 */
export function ComingRows({
  items,
  who,
  drawer,
  selectedId,
  onSelect,
}: {
  items: ComingItem[]
  who: "me" | "household"
  drawer: boolean
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const { now } = useApp()
  const day = (b: Booking) => {
    const rel = relDay(b.start, now)
    return b.start <= now
      ? "On now"
      : rel === "Today" || rel === "Tomorrow"
        ? rel
        : rel.split(",")[0]
  }
  return (
    <BookingRows
      label="Coming up"
      items={items.map((b) => ({ b, names: b.names ? [b.names] : undefined }))}
      who={who}
      drawer={drawer}
      selectedId={selectedId}
      onSelect={onSelect}
      href={bookingHref}
      sub={day}
      narrowLead={day}
      hideFrom={COMING_NARROW}
    />
  )
}
