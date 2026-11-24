"use client"
import { useApp } from "@/components/app/use-app"
import { HeldActions, type Item } from "@/components/bookings/booking-panel"
import { BookingRows } from "@/components/bookings/booking-rows"
import { TriangleAlert } from "@/components/icons"
import { Card } from "@/components/kit/app"
import { FactRow, OutcomeMark, RowPill } from "@/components/kit/detail"
import {
  dayStart,
  fmtDayLong,
  fmtDayShort,
  MIN,
  monthLabel,
  relDay,
} from "@/lib/time"
import type { Booking } from "@/lib/types"

/**
 * How a row opens its booking, as on Today: from 768 px a row selects the booking for the drawer; below it, a row is
 * a link to the booking's own page.
 */
export type Open = {
  drawer: boolean
  selectedId: string | null
  onSelect: (id: string) => void
}

const MAX_WAITLISTS = 5

const bookingPage = (b: Booking) => `/bookings/${b.id}`

/** "Today", "Tomorrow", then the weekday and date. */
function dayTitle(day: number, now: number) {
  const rel = relDay(day, now)
  return rel === "Today" || rel === "Tomorrow" ? rel : fmtDayLong(day)
}

/** The names of the household members a kids club block is for. */
function namesOf(item: Item, firstName: (id: string) => string) {
  return item.group?.map((x) => firstName(x.memberId))
}

/**
 * The upcoming list as cards, in the pattern of Today's Coming up: a late-cancel row (below `lg`, where the stat card
 * is hidden), a Waitlist card, then one card for each day. A row has the time column from the card's `@md` width.
 * Held spots sit in the Waitlist card with their Confirm and Release under the title.
 */
export function UpcomingList({
  list,
  strikes,
  oneMember,
  household,
  open,
  who,
}: {
  list: Item[]
  strikes: number
  /** The list is one member's, so "N of 5" is their waitlist count. */
  oneMember: boolean
  /** The list holds more than one member's bookings, so a row for another member names them. */
  household: boolean
  open: Open
  who: (id: string) => string
}) {
  const { now } = useApp()
  const waiting = list.filter(
    (r) => r.b.status === "waitlisted" || r.b.status === "held"
  )
  const rest = list.filter(
    (r) => r.b.status !== "waitlisted" && r.b.status !== "held"
  )
  const days = Object.entries(
    rest.reduce<Record<number, Item[]>>((acc, r) => {
      const day = dayStart(r.b.start)
      acc[day] ??= []
      acc[day].push(r)
      return acc
    }, {})
  ).map(([d, rows]) => [Number(d), rows] as [number, Item[]])
  const lists = list.filter((r) => r.b.status === "waitlisted").length
  const rows = (items: Item[]) =>
    items.map((r) => ({ b: r.b, names: namesOf(r, who) }))
  const length = (b: Booking) => {
    const m = Math.round((b.end - b.start) / MIN)
    const h = Math.floor(m / 60)
    return h ? `${h} hr${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`
  }
  // A waitlist, or a booking that waits for a parent, says so in place of the "View" pill.
  const status = (b: Booking) =>
    b.status === "waitlisted" ? (
      <RowPill>Waitlist #{b.position ?? 1}</RowPill>
    ) : b.status === "pending_approval" ? (
      <RowPill tone="muted">Waiting for a parent</RowPill>
    ) : undefined
  const held = (b: Booking) =>
    b.status === "held" ? (
      <HeldActions b={b} left={(b.holdExpiresAt ?? 0) - now} size="sm" />
    ) : undefined
  const shared = {
    ...open,
    who: household ? ("household" as const) : ("me" as const),
    href: bookingPage,
    status,
    below: held,
    className: "rule-t-0",
  }
  return (
    <div className="gap-m flex flex-col">
      {strikes > 0 ? (
        <div className="gap-xs flex flex-col lg:hidden">
          <FactRow
            icon={<TriangleAlert />}
            tone="warning"
            text={`${strikes} of 3 late cancels`}
            href="/bookings/strikes"
          />
        </div>
      ) : null}
      {waiting.length ? (
        <Card
          display
          compact
          flush
          title="Waitlist"
          description={
            oneMember ? `${lists} of ${MAX_WAITLISTS}` : `${lists} waiting`
          }
        >
          {/* The waitlist mixes days, so the day leads the row. */}
          <BookingRows
            {...shared}
            label="Waitlist and held spots"
            items={rows(waiting)}
            sub={(b) => relDay(b.start, now).split(",")[0]}
            narrowLead={(b) => relDay(b.start, now).split(",")[0]}
          />
        </Card>
      ) : null}
      {days.map(([day, items]) => (
        <Card
          key={day}
          display
          compact
          flush
          title={dayTitle(day, now)}
          description={items.length > 1 ? `${items.length} booked` : undefined}
        >
          {/* The card names the day, so the time column gives the length. */}
          <BookingRows
            {...shared}
            label={`Bookings on ${fmtDayShort(day)}`}
            items={rows(items)}
            sub={length}
          />
        </Card>
      ))}
    </div>
  )
}

const OUTCOME: Partial<
  Record<Booking["status"], "attended" | "missed" | "late" | "cancelled">
> = {
  attended: "attended",
  no_show: "missed",
  late_cancelled: "late",
}

/** The past list: one card for each month, newest first, every row ending in what happened. */
export function PastList({
  list,
  household,
  open,
}: {
  list: Booking[]
  household: boolean
  open: Open
}) {
  const { s, now } = useApp()
  const months = list.reduce<[string, Booking[]][]>((acc, b) => {
    const m = monthLabel(b.start)
    const last = acc[acc.length - 1]
    if (last && last[0] === m) last[1].push(b)
    else acc.push([m, [b]])
    return acc
  }, [])
  const thisYear = monthLabel(now).split(" ")[1]
  return (
    <div className="gap-m flex flex-col">
      {months.map(([m, rows]) => {
        const visits = rows.filter((b) => b.status === "attended").length
        return (
          <Card
            key={m}
            display
            compact
            flush
            // The year shows only when it is not this year.
            title={m.endsWith(thisYear) ? m.split(" ")[0] : m}
            description={
              visits
                ? `${visits} ${visits === 1 ? "visit" : "visits"}`
                : undefined
            }
          >
            <BookingRows
              {...open}
              className="rule-t-0"
              label={`Past bookings, ${m}`}
              who={household ? "household" : "me"}
              href={bookingPage}
              items={rows.map((b) => ({
                b,
                names:
                  b.kind === "kids"
                    ? [s.members[b.memberId].firstName]
                    : undefined,
              }))}
              sub={(b) => fmtDayShort(b.start)}
              narrowLead={(b) => fmtDayShort(b.start)}
              status={(b) => (
                <OutcomeMark outcome={OUTCOME[b.status] ?? "cancelled"} />
              )}
            />
          </Card>
        )
      })}
    </div>
  )
}
