"use client"
import Link from "next/link"
import { useApp } from "@/components/app/use-app"
import { ListRow, ListRows } from "@/components/booking/parts"
import type { Item } from "@/components/bookings/booking-panel"
import { CalendarDays, Clock3, TriangleAlert } from "@/components/icons"
import { Card, Stat, Stats } from "@/components/kit/app"
import { LateCancelMeter, StatusPill } from "@/components/kit/ui"
import { plural } from "@/components/today/sections"
import { Button } from "@/components/ui/button"
import { CLUB_BY_SLUG } from "@/lib/data/catalog"
import { DAY, fmtDayShort, fmtTime, relDay } from "@/lib/time"
import type { TeenRequest } from "@/lib/types"

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
        <Link
          href="/bookings/strikes"
          className="text-body-m text-link sm:text-body-s"
        >
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
  onOpen: (id: string) => void
}) {
  const { now } = useApp()
  const next = list.find((r) => r.b.status !== "waitlisted")
  const week = list.filter((r) => r.b.start < now + 7 * DAY)
  const waiting = week.filter(
    (r) => r.b.status === "waitlisted" || r.b.status === "held"
  ).length
  return (
    <Stats dense className="max-lg:hidden">
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
              onClick={() => onOpen(next.b.id)}
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
