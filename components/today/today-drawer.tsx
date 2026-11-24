"use client"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState } from "react"
import { BookingDetail } from "@/components/bookings/booking-detail"
import { SideSheet } from "@/components/kit/overlays"

/**
 * The selected booking, kept in the URL as `?booking=<id>` so a reload or a shared link opens the same drawer.
 * It replaces the entry (no new history item), keeps other parameters, and does not scroll the page.
 */
export function useBookingParam() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const current = sp.get("booking")
  const set = useCallback(
    (id: string | null) => {
      const q = new URLSearchParams(sp.toString())
      if (id) q.set("booking", id)
      else q.delete("booking")
      const qs = q.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, sp]
  )
  return [current, set] as const
}

/**
 * The booking's pass and actions in the app's Drawer. `id` is the URL's booking (null when closed). The last id stays
 * mounted until the closing animation ends, so the content does not vanish while the sheet slides away.
 */
export function BookingDrawer({
  id,
  onChange,
}: {
  id: string | null
  onChange: (id: string | null) => void
}) {
  const [shown, setShown] = useState<string | null>(id)
  if (id && id !== shown) setShown(id)
  const showing = id ?? shown
  return (
    <SideSheet
      open={!!id}
      onOpenChange={(o) => {
        if (!o) onChange(null)
      }}
      onClosed={() => setShown(null)}
      label="Booking details"
    >
      {showing ? (
        <div className="p-m">
          <BookingDetail id={showing} onClose={() => onChange(null)} />
        </div>
      ) : null}
    </SideSheet>
  )
}
