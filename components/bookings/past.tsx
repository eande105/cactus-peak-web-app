"use client"
import Link from "next/link"
import { useApp } from "@/components/app/use-app"
import { CategoryMark, ListRow, ListRows } from "@/components/booking/parts"
import { PAST_LABEL, PastStatus } from "@/components/bookings/booking-panel"
import { LateCancelStat } from "@/components/bookings/upcoming"
import { CalendarCheck, Check } from "@/components/icons"
import { Card, Stat, Stats } from "@/components/kit/app"
import { plural } from "@/components/today/sections"
import { Button } from "@/components/ui/button"
import { DAY, fmtDay, fmtDayShort, fmtRange, monthLabel } from "@/lib/time"
import type { Booking } from "@/lib/types"
import { openDialog } from "@/lib/ui-state"

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
    <Stats variant="cards" dense>
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

/**
 * The past bookings in one card for each month, newest first, as Upcoming's day cards. A recent class the member
 * attended asks for feedback, and every class can be booked again from its row.
 */
export function MonthCards({ list }: { list: Booking[] }) {
  const { s, now } = useApp()
  const months = list.reduce<[string, Booking[]][]>((acc, b) => {
    const m = monthLabel(b.start)
    const last = acc[acc.length - 1]
    if (last && last[0] === m) last[1].push(b)
    else acc.push([m, [b]])
    return acc
  }, [])
  const thisYear = monthLabel(now).split(" ")[1]
  return months.map(([m, rows]) => (
    <Card
      key={m}
      display
      compact
      flush
      // The year shows only when it is not this year.
      title={m.endsWith(thisYear) ? m.split(" ")[0] : m}
      description={plural(rows.length, "booking")}
    >
      <ListRows label={`Past bookings, ${m}`}>
        {rows.map((b) => {
          const fb =
            b.status === "attended" &&
            !b.feedbackDone &&
            now - b.end < 7 * DAY &&
            b.kind === "class"
          return (
            <ListRow
              key={b.id}
              inset="m"
              compact
              quiet={b.status !== "attended"}
              mark={<CategoryMark category={b.category} />}
              lead={
                <p className="tabular font-heavy whitespace-nowrap">
                  {fmtDayShort(b.start)}
                </p>
              }
              title={
                b.kind === "kids"
                  ? `Kids club, ${s.members[b.memberId].firstName}`
                  : b.title
              }
              line={
                <span className="tabular">
                  {fmtRange(b.start, b.end)} · {b.place}
                  <span className="sm:hidden">
                    {" "}
                    · {PAST_LABEL[b.status] ?? "Cancelled"}
                  </span>
                </span>
              }
              end={
                <>
                  <PastStatus b={b} className="max-sm:hidden" />
                  {fb ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openDialog("feedback", b.id)}
                    >
                      Give feedback
                    </Button>
                  ) : null}
                  {b.sessionId ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className={fb ? "max-sm:hidden" : undefined}
                      render={
                        <Link
                          href={`/schedule?series=${b.sessionId.split("~")[3]}&club=${b.clubSlug}`}
                        />
                      }
                    >
                      Book again
                    </Button>
                  ) : null}
                </>
              }
            />
          )
        })}
      </ListRows>
    </Card>
  ))
}
