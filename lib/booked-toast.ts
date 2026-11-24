import { cancelBooking } from "@/lib/actions"
import { announce } from "@/lib/announce"
import { toast } from "@/lib/toast"

/**
 * The one confirmation for every booking kind (class, court, lap lane, kids club): "Booked · <what> · <time>" with
 * Undo and View. Undo cancels without a strike. View opens the booking in /bookings (`view` gets that URL).
 * `ids` is every booking the action made (kids club makes one for each child).
 */
export function bookedToast(o: {
  ids: string[]
  what: string
  time: string
  view: (url: string) => void
}) {
  const title = `Booked · ${o.what} · ${o.time}`
  toast({
    title,
    action: {
      label: "Undo",
      onClick: () => {
        for (const id of o.ids) cancelBooking(id, { undoWindow: true })
        announce("Booking undone.")
      },
    },
    secondary: {
      label: "View",
      onClick: () => o.view(`/bookings?open=${encodeURIComponent(o.ids[0])}`),
    },
  })
  announce(title.replaceAll(" · ", ", "))
}
