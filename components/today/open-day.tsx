"use client"
import Link from "next/link"
import type { ReactNode } from "react"
import { useApp } from "@/components/app/use-app"
import { CategoryTile } from "@/components/brand/graphics"
import { plural } from "@/components/today/sections"
import { Button } from "@/components/ui/button"
import { CATEGORY_BY_ID } from "@/lib/data/catalog"
import { sessionsRange } from "@/lib/data/sessions"
import { overlaps, sessionLeft } from "@/lib/engine"
import { visitMix, visitRhythm, visitsBetween } from "@/lib/insights"
import {
  DAY,
  DOW,
  DOW_LONG,
  dayStart,
  fmtTime,
  MIN,
  minutesOfDay,
  parts,
} from "@/lib/time"
import type { CategoryId, Session } from "@/lib/types"
import { cn } from "@/lib/utils"

/** The classes a member can book in the next week: room left, at a free time, not starting within 30 minutes. */
export function useOpenClasses() {
  const { s, me, prefs, club, now } = useApp()
  const recent = new Map(
    visitMix(visitsBetween(s, me.id, now - 30 * DAY, now)).map((x) => [
      x.id,
      x.n,
    ])
  )
  const interests = prefs.interests ?? []
  // Youth classes are for kids and teens, even when a parent lists them as an interest.
  const youthOk = me.role === "teen" || me.role === "child"
  const open = sessionsRange(club, dayStart(now), 7).filter(
    (x) =>
      x.start > now + 30 * MIN &&
      (x.category !== "youth" || youthOk) &&
      sessionLeft(s, x) > 0 &&
      !overlaps(s, me.id, x.start, x.end)
  )
  /** 0 for an interest not used in 30 days, 1 for an interest in use, 2 for the rest: lower comes first. */
  const rank = (c: CategoryId) =>
    interests.includes(c) ? (recent.get(c) ? 1 : 0) : 2
  return { open, rank, recent, rhythm: visitRhythm(s, me.id, now) }
}

type Plan =
  | {
      kind: "habit"
      session: Session
      rhythm: NonNullable<ReturnType<typeof visitRhythm>>
    }
  | { kind: "interest"; session: Session; count: number; used: number }

/**
 * The one class the empty day promotes. With a habit, a class near the member's usual time on their most regular
 * weekday. Without one, the interest they have used least lately, with the number of its classes that have room this
 * week. A class in an interest they have not used in 30 days comes first, so the idea widens their week.
 */
export function useOpenDayPlan(): Plan | null {
  const { open, rank, recent, rhythm } = useOpenClasses()
  const near = rhythm
    ? open
        .filter(
          (x) =>
            parts(x.start).dow === rhythm.dow &&
            Math.abs(minutesOfDay(x.start) - rhythm.minute) <= 90
        )
        .sort(
          (a, b) =>
            rank(a.category) - rank(b.category) ||
            Math.abs(minutesOfDay(a.start) - rhythm.minute) -
              Math.abs(minutesOfDay(b.start) - rhythm.minute) ||
            a.start - b.start
        )[0]
    : undefined
  if (rhythm && near) return { kind: "habit", session: near, rhythm }

  // No habit yet, or nothing near it: the interest used least lately that has a class with room this week.
  const pick = [...new Set(open.map((x) => x.category))].sort(
    (a, b) => rank(a) - rank(b) || (recent.get(a) ?? 0) - (recent.get(b) ?? 0)
  )[0]
  if (!pick) return null
  const ofPick = open.filter((x) => x.category === pick)
  return {
    kind: "interest",
    session: ofPick[0],
    count: ofPick.length,
    used: recent.get(pick) ?? 0,
  }
}

/** What Home shows when the member's day is empty: one fact from their own visits and one class that fits it. */
export function OpenDay() {
  const { now } = useApp()
  const plan = useOpenDayPlan()
  // No class with room in the next week: the way to the full schedule, so the card still has its one action.
  if (!plan)
    return (
      <Button size="sm" variant="outline" render={<Link href="/schedule" />}>
        Find a class
      </Button>
    )
  if (plan.kind === "habit") {
    const { rhythm } = plan
    return (
      <Promo
        session={plan.session}
        now={now}
        value={`${rhythm.hits} of ${rhythm.weeks}`}
        label={`${DOW_LONG[rhythm.dow]}s you came`}
        chart={
          <WeekBars
            byDow={rhythm.byDow}
            weeks={rhythm.weeks}
            peak={rhythm.dow}
          />
        }
        reason={`Close to your usual ${fmtTime(dayStart(now) + rhythm.minute * MIN)}.`}
      />
    )
  }
  const x = plan.session
  return (
    <Promo
      session={x}
      now={now}
      value={String(plan.count)}
      label={`${CATEGORY_BY_ID[x.category]?.name ?? x.category} ${plan.count === 1 ? "class" : "classes"} open this week`}
      reason={
        plan.used
          ? `${plural(plan.used, "visit")} in the last 30 days.`
          : "Your first in 30 days."
      }
    />
  )
}

/** "Today", "Tomorrow", or the weekday's full name, for a class in the coming week. */
export function dayWord(start: number, now: number) {
  const days = Math.round((dayStart(start) - dayStart(now)) / DAY)
  return days === 0
    ? "Today"
    : days === 1
      ? "Tomorrow"
      : DOW_LONG[parts(start).dow]
}

/**
 * One panel, one story: the fact from the member's visits at the left (a large value, its label, and a chart when
 * there is one), and at the right the class that fact points to, with the line that links them and its one action.
 * The panel takes the class's category, so the chart's highlight and the class tile share one colour. Narrow, the
 * class goes under the fact, with the divider turned from vertical to horizontal.
 */
function Promo({
  session: x,
  now,
  value,
  label,
  chart,
  reason,
}: {
  session: Session
  now: number
  value: string
  label: string
  chart?: ReactNode
  reason: string
}) {
  const day = dayWord(x.start, now)
  return (
    <div className="@container">
      <div
        className={cn(
          `cat-${x.category}`,
          "p-m grid corner-m bg-muted/50 @lg:grid-cols-[auto_minmax(0,1fr)]"
        )}
      >
        <dl className="gap-s pb-m @lg:pr-m flex flex-col @lg:pb-0">
          <div className="flex min-w-0 flex-col-reverse">
            <dt className="truncate text-muted-foreground">{label}</dt>
            <dd className="font-display-wide tabular text-display-s font-heavy">
              {value}
            </dd>
          </div>
          {chart}
        </dl>
        <div className="gap-m pt-m @lg:pl-m flex min-w-0 flex-col justify-between rule-t @lg:pt-0 @lg:rule-l @lg:rule-t-0">
          <div className="gap-s flex min-w-0 items-center">
            <CategoryTile
              category={x.category}
              className="size-12 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="font-display-wide text-body-l font-heavy text-balance">
                {x.name}
              </p>
              <p className="tabular text-muted-foreground">
                {day}, {fmtTime(x.start)} · {x.duration} min
              </p>
            </div>
          </div>
          <div className="gap-x-m gap-y-s flex flex-wrap items-center justify-between">
            <p className="text-pretty text-muted-foreground">{reason}</p>
            <Button
              size="sm"
              variant="outline"
              aria-label={`Book ${x.name}`}
              render={<Link href={`/schedule/${x.id}`} />}
            >
              Book
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * The weeks with a visit on each weekday, as seven short columns: the full height is every week. The member's most
 * regular day takes the class's category colour, which ties the chart to the class beside it; the others are quiet.
 */
function WeekBars({
  byDow,
  weeks,
  peak,
}: {
  byDow: number[]
  weeks: number
  peak: number
}) {
  // Monday first, as the member's week reads.
  const order = [1, 2, 3, 4, 5, 6, 0]
  return (
    // In a narrow panel the value and its label tell the fact; the chart shows from @md, where it has the room.
    <dd className="@max-md:hidden">
      <ul
        aria-label={`Weeks you came, out of the last ${weeks}`}
        className="gap-xxs grid w-max grid-cols-7"
      >
        {order.map((d) => (
          <li key={d} className="gap-xxs flex w-7 flex-col items-center">
            <span className="sr-only">
              {DOW_LONG[d]}: {byDow[d]} of {weeks} weeks
            </span>
            <span
              aria-hidden="true"
              className="flex h-10 w-full items-end overflow-hidden corner-xs bg-muted"
            >
              <span
                className={cn(
                  "w-full",
                  d === peak ? "bg-cat" : "bg-muted-foreground/40"
                )}
                style={{ height: `${(byDow[d] / weeks) * 100}%` }}
              />
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "text-body-xs",
                d === peak ? "font-heavy" : "text-muted-foreground"
              )}
            >
              {DOW[d].charAt(0)}
            </span>
          </li>
        ))}
      </ul>
    </dd>
  )
}
