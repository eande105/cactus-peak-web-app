"use client"
import Link from "next/link"
import { useApp } from "@/components/app/use-app"
import {
  CategoryMark,
  ListRow,
  ListRows,
  TimeLead,
} from "@/components/booking/parts"
import { type Item, KIND, StatusOf } from "@/components/bookings/booking-panel"
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  TriangleAlert,
} from "@/components/icons"
import { Card, Stat, Stats } from "@/components/kit/app"
import { LateCancelMeter, StatusPill } from "@/components/kit/ui"
import { plural } from "@/components/today/sections"
import { Button } from "@/components/ui/button"
import { CLUB_BY_SLUG } from "@/lib/data/catalog"
import { DAY, DOW_LONG, fmtDayShort, fmtTime, parts, relDay } from "@/lib/time"
import type { Booking, TeenRequest } from "@/lib/types"

const chevron = (
  <ChevronRight
    className="size-4 shrink-0 text-muted-foreground"
    aria-hidden="true"
  />
)

/**
 * The late-cancel count as a stat tile: the meter beside "1 of 3" (under it in a half-width tile), and the day the
 * oldest one clears. The count is the signed-in member's own, so `yours` tells a screen reader when the page shows a household.
 */
export function LateCancelStat({
  yours,
  strikes,
}: {
  yours?: boolean
  strikes: { at: number }[]
}) {
  return (
    <Stat
      icon={TriangleAlert}
      label="Late cancels"
      value={
        <span className="gap-x-s gap-y-xxs flex flex-wrap items-center">
          {strikes.length} of 3
          <LateCancelMeter count={strikes.length} />
        </span>
      }
      hint={
        <>
          {strikes.length
            ? `Clears ${fmtDayShort(strikes[0].at + 30 * DAY)}`
            : "In the last 30 days"}
          {/* A half-width tile has no room for "Yours" on screen. */}
          {yours ? <span className="sr-only">. These are yours.</span> : null}
        </>
      }
      // The link has its own line, so a half-width tile on a phone does not cut it off.
      actions={
        <Link href="/help" className="text-body-m text-link sm:text-body-s">
          How it works
        </Link>
      }
    />
  )
}

/**
 * The summary row over the list, as Book › Training's stat cards: the next booking with the way to its details, the
 * coming week, and the late-cancel count when the member has one (it limits what they can book).
 */
export function UpcomingSummary({
  list,
  strikes,
  yours,
  onOpen,
}: {
  list: Item[]
  strikes: { at: number }[]
  yours: boolean
  onOpen: (id: string, from: HTMLElement) => void
}) {
  const { now } = useApp()
  const next = list.find((r) => r.b.status !== "waitlisted")
  const week = list.filter((r) => r.b.start < now + 7 * DAY)
  const waiting = week.filter(
    (r) => r.b.status === "waitlisted" || r.b.status === "held"
  ).length
  return (
    <Stats variant="cards" dense>
      <Stat
        icon={Clock3}
        label="Next booking"
        value={
          next
            ? `${relDay(next.b.start, now)} · ${fmtTime(next.b.start)}`
            : "Nothing booked"
        }
        hint={
          next
            ? `${next.b.kind === "kids" ? "Kids club" : next.b.title} · ${CLUB_BY_SLUG[next.b.clubSlug].name}`
            : undefined
        }
        actions={
          next ? (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => onOpen(next.b.id, e.currentTarget)}
            >
              Details
            </Button>
          ) : undefined
        }
      />
      <Stat
        icon={CalendarDays}
        label="Next 7 days"
        value={plural(week.length, "booking")}
        hint={waiting ? `${waiting} waiting on a spot` : undefined}
      />
      {strikes.length ? (
        <LateCancelStat yours={yours} strikes={strikes} />
      ) : null}
    </Stats>
  )
}

/** A teen's requests that wait for a parent, as a card above the days. */
export function RequestsCard({ requests }: { requests: TeenRequest[] }) {
  const { s } = useApp()
  return (
    <Card
      display
      compact
      flush
      title="Requests"
      description={`${plural(requests.length, "request")} waiting for a parent`}
    >
      <ListRows label="Requests">
        {requests.map((r) => (
          <ListRow
            key={r.id}
            inset="m"
            title={r.title}
            end={
              <StatusPill tone="info">
                Waiting for {s.members[r.parentId].firstName}
              </StatusPill>
            }
          />
        ))}
      </ListRows>
    </Card>
  )
}

/** "Today", "Tomorrow", then the weekday: the date is in the card's description. */
function dayName(day: number, now: number) {
  const rel = relDay(day, now)
  return rel === "Today" || rel === "Tomorrow" ? rel : DOW_LONG[parts(day).dow]
}

/**
 * One card for each day, as Book's cards for each part of the day: the day in the head with the date and the count
 * under it, then the rows. A row opens the booking's detail panel. A held spot, a waitlist place or a request that
 * waits for a parent says so at the right; a plain booking shows the chevron.
 */
export function DayCards({
  days,
  showWho,
  selected,
  onSelect,
}: {
  days: [number, Item[]][]
  showWho: boolean
  selected?: string
  /** The booking and the control that opened it, which the popover anchors to. */
  onSelect: (id: string, from: HTMLElement) => void
}) {
  const { s, now } = useApp()
  return days.map(([day, rows]) => (
    <Card
      key={day}
      display
      compact
      flush
      title={dayName(day, now)}
      description={`${fmtDayShort(day)} · ${plural(rows.length, "booking")}`}
    >
      <ListRows label={`Bookings on ${fmtDayShort(day)}`}>
        {rows.map(({ b, group }) => (
          <DayRow
            key={b.id}
            b={b}
            names={group?.map((x) => s.members[x.memberId].firstName)}
            showWho={showWho}
            selected={selected === b.id}
            onSelect={(e) => onSelect(b.id, e.currentTarget)}
          />
        ))}
      </ListRows>
    </Card>
  ))
}

function DayRow({
  b,
  names,
  showWho,
  selected,
  onSelect,
}: {
  b: Booking
  names?: string[]
  showWho: boolean
  selected: boolean
  onSelect: (e: React.MouseEvent<HTMLButtonElement>) => void
}) {
  const { s, now } = useApp()
  const person = s.members[b.memberId]
  const club = CLUB_BY_SLUG[b.clubSlug]
  const status = <StatusOf b={b} hidePlain />
  return (
    <ListRow
      inset="m"
      mark={<CategoryMark category={b.category} />}
      lead={
        <TimeLead
          start={b.start}
          sub={
            b.start <= now
              ? "On now"
              : b.kind === "kids"
                ? "2 h"
                : `${Math.round((b.end - b.start) / 60000)} min`
          }
        />
      }
      title={
        b.kind === "kids"
          ? `Kids club, ${names?.join(" and ") ?? person.firstName}`
          : b.title
      }
      line={[
        b.kind === "class" || b.kind === "kids" ? "" : KIND[b.kind],
        // A court, lane or training booking already names the club as its place.
        b.kind === "kids" || b.place === club.name
          ? ""
          : b.place.replace(`${club.name} · `, ""),
        club.name,
        showWho && b.kind !== "kids" ? person.firstName : "",
      ]
        .filter(Boolean)
        .join(" · ")}
      end={b.status === "booked" ? chevron : status}
      onSelect={onSelect}
      selected={selected}
    />
  )
}
