"use client"
import { useApp } from "@/components/app/use-app"
import { LateCancelStat } from "@/components/bookings/upcoming"
import { CalendarCheck, Check } from "@/components/icons"
import { Stat, Stats } from "@/components/kit/app"
import { plural } from "@/components/today/sections"
import { DAY, fmtDay } from "@/lib/time"
import type { Booking } from "@/lib/types"

/**
 * The record over the past list, in the same stat cards as Upcoming: visits in the last 30 days, the last one, and
 * the late-cancel count, which the Past tab always shows because it is part of the record.
 */
export function PastSummary({
  all,
  strikes,
  yours,
}: {
  all: Booking[]
  strikes: { at: number }[]
  yours: boolean
}) {
  const { now } = useApp()
  const attended = all.filter((b) => b.status === "attended")
  const recent = attended.filter((b) => b.start > now - 30 * DAY)
  const last = attended[0]
  return (
    <Stats dense className="max-lg:hidden">
      <Stat
        icon={Check}
        label="Attended"
        value={plural(recent.length, "visit")}
        hint="In the last 30 days"
      />
      <Stat
        icon={CalendarCheck}
        label="Last visit"
        value={last ? fmtDay(last.start) : "None yet"}
        hint={
          last ? (last.kind === "kids" ? "Kids club" : last.title) : undefined
        }
      />
      <LateCancelStat yours={yours} strikes={strikes} />
    </Stats>
  )
}
