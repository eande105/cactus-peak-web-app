"use client"
import Link from "next/link"
import { useApp } from "@/components/app/use-app"
import {
  CategoryMark,
  ListRow,
  ListRows,
  PILL_ICON,
  TimeLead,
} from "@/components/booking/parts"
import { CategoryTile } from "@/components/brand/graphics"
import { ChevronRight, Clock3 } from "@/components/icons"
import { Card, CardFooterLink } from "@/components/kit/app"
import { StatusPill } from "@/components/kit/ui"
import { useOpenClasses } from "@/components/today/open-day"
import { plural } from "@/components/today/sections"
import { INSTRUCTOR_BY_ID } from "@/lib/data/catalog"
import { bookingOf, overlaps, sessionLeft } from "@/lib/engine"
import { dayStart, fmtTime, MIN, minutesOfDay } from "@/lib/time"
import type { Booking, Session } from "@/lib/types"

/** At this many spots or fewer, a pick says how many are left, as on Home's Book card. */
const FEW = 3

const chevron = (
  <ChevronRight
    className="size-4 shrink-0 text-muted-foreground"
    aria-hidden="true"
  />
)

/** The member's own bookings on a day: booked, held and on a waitlist. Classes, courts, lanes and kids club. */
export function useDayBookings(date: number) {
  const { s, me } = useApp()
  const day = dayStart(date)
  return s.bookings
    .filter(
      (b) =>
        b.memberId === me.id &&
        ["booked", "held", "waitlisted"].includes(b.status) &&
        dayStart(b.start) === day
    )
    .sort((a, b) => a.start - b.start)
}

/**
 * The member's day, as Home's Today card: what they have booked on the chosen day, with the way to all bookings in
 * the footer. A held spot or a waitlist place says so at the right, because each one waits for the member.
 */
export function DayBookings({ list }: { list: Booking[] }) {
  const { now } = useApp()
  return (
    <Card
      display
      compact
      flush
      title="Your bookings"
      description={plural(list.length, "booking")}
      footer={<CardFooterLink href="/bookings">All bookings</CardFooterLink>}
    >
      <ListRows label="Your bookings on this day">
        {list.map((b) => (
          <ListRow
            key={b.id}
            inset="m"
            compact
            href={b.sessionId ? `/schedule/${b.sessionId}` : "/bookings"}
            quiet={b.end <= now}
            lead={
              <TimeLead
                start={b.start}
                sub={
                  b.end <= now
                    ? "Done"
                    : b.start <= now
                      ? "On now"
                      : `${Math.round((b.end - b.start) / MIN)} min`
                }
              />
            }
            mark={<CategoryMark category={b.category} />}
            title={b.kind === "kids" ? "Kids club" : b.title}
            line={b.place}
            end={
              b.status === "held" ? (
                <StatusPill tone="warning" icon={Clock3} className={PILL_ICON}>
                  Held
                </StatusPill>
              ) : b.status === "waitlisted" ? (
                <StatusPill>
                  Waitlist {b.position === 2 ? "2nd" : `#${b.position}`}
                </StatusPill>
              ) : (
                chevron
              )
            }
          />
        ))}
      </ListRows>
    </Card>
  )
}

/**
 * Up to three classes on the chosen day for this member, by the rules of Home's Book card: their interests first,
 * then classes near the time they usually come, one of each class type, in time order. A pick has room, starts in
 * more than 30 minutes and does not clash with a booking. It reads from the list the filters leave.
 */
export function useDayPicks(sessions: Session[]) {
  const { s, me, now } = useApp()
  const { rank, rhythm } = useOpenClasses()
  // Youth classes are for kids and teens, even when a parent lists them as an interest.
  const youthOk = me.role === "teen" || me.role === "child"
  const gap = (x: Session) =>
    rhythm ? Math.abs(minutesOfDay(x.start) - rhythm.minute) : 0
  const seen = new Set<string>()
  return sessions
    .filter(
      (x) =>
        x.start > now + 30 * MIN &&
        (x.category !== "youth" || youthOk) &&
        sessionLeft(s, x) > 0 &&
        !bookingOf(s, me.id, x.id) &&
        !overlaps(s, me.id, x.start, x.end)
    )
    .sort(
      (a, b) =>
        rank(a.category) - rank(b.category) ||
        gap(a) - gap(b) ||
        a.start - b.start
    )
    .filter((x) => {
      if (seen.has(x.category)) return false
      seen.add(x.category)
      return true
    })
    .slice(0, 3)
    .sort((a, b) => a.start - b.start)
}

/**
 * The picks as Home's Book card shows them: each one opens the class, where the member books it.
 * - `rows`: one row for each class, for the side column of a wide screen.
 * - `tiles`: one row of tiles the member swipes through, for a phone. It keeps the card short, so the timetable
 *   under it stays near the top of the screen.
 */
export function DayPicks({
  picks,
  query = "",
  variant = "rows",
  className,
}: {
  picks: Session[]
  query?: string
  variant?: "rows" | "tiles"
  className?: string
}) {
  const { s } = useApp()
  const facts = (x: Session) => {
    const left = sessionLeft(s, x)
    return left <= FEW ? `${plural(left, "spot")} left` : ""
  }
  if (variant === "tiles")
    return (
      <Card display compact flush title="Picked for you" className={className}>
        <ul
          aria-label="Classes picked for you"
          className="gap-xs px-m pb-m flex snap-x snap-mandatory scroll-px-(--space-m) [scrollbar-width:none] overflow-x-auto"
        >
          {picks.map((x) => {
            const coach = INSTRUCTOR_BY_ID[x.instructorId]?.name
            return (
              <li key={x.id} className="flex w-36 shrink-0 snap-start">
                <Link
                  href={`/schedule/${x.id}${query}`}
                  scroll={false}
                  aria-label={`${x.name}, ${fmtTime(x.start)}`}
                  className="gap-s p-s corner-s flex min-w-0 flex-1 flex-col items-start bg-muted/50 text-body-s hover:bg-muted"
                >
                  <CategoryTile
                    category={x.category}
                    className="size-10 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 self-stretch">
                    <span className="line-clamp-2 block font-heavy">
                      {x.name}
                    </span>
                    <span className="tabular block truncate text-muted-foreground">
                      {fmtTime(x.start)} · {x.duration} min
                    </span>
                    <span className="block truncate text-muted-foreground">
                      {facts(x) || coach}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </Card>
    )
  return (
    <Card display compact flush title="Picked for you" className={className}>
      <ListRows label="Classes picked for you">
        {picks.map((x) => (
          <ListRow
            key={x.id}
            inset="m"
            compact
            href={`/schedule/${x.id}${query}`}
            lead={<TimeLead start={x.start} sub={`${x.duration} min`} />}
            mark={<CategoryMark category={x.category} />}
            title={x.name}
            line={[INSTRUCTOR_BY_ID[x.instructorId]?.name, facts(x)]
              .filter(Boolean)
              .join(" · ")}
            end={chevron}
          />
        ))}
      </ListRows>
    </Card>
  )
}
