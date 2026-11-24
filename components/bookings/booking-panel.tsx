"use client"
import { PILL_ICON } from "@/components/booking/parts"
import { calEventFor } from "@/components/booking/session-action"
import { Check, Clock3 } from "@/components/icons"
import { BookingTile } from "@/components/kit/detail"
import { StatusPill } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { confirmHold, releaseHold } from "@/lib/actions"
import { announce } from "@/lib/announce"
import { CLUB_BY_SLUG, COACH_BY_SLUG } from "@/lib/data/catalog"
import { sessionById } from "@/lib/data/sessions"
import { fmtCountdown, fmtTime } from "@/lib/time"
import { toast } from "@/lib/toast"
import type { Booking } from "@/lib/types"
import { cn } from "@/lib/utils"

export const KIND: Record<Booking["kind"], string> = {
  class: "Class",
  court: "Court",
  lane: "Lane",
  kids: "Kids club",
  pt: "Training",
}

export function evFor(b: Booking) {
  const se = b.sessionId ? sessionById(b.sessionId) : undefined
  if (se) return calEventFor(se)
  const club = CLUB_BY_SLUG[b.clubSlug]
  return {
    title: b.title,
    start: b.start,
    end: b.end,
    uid: b.id,
    location: `${club.name}, ${club.address}`,
    description: `${b.place}. Arizona time (no daylight saving).`,
  }
}

export type Item = { b: Booking; group?: Booking[] }

/**
 * The pill for an upcoming booking. With `hidePlain`, a plain booking shows no pill: the Upcoming tab and the panel
 * already say it is booked, so only the states that differ (held, waitlist, waiting for a parent) stand out.
 */
export function StatusOf({
  b,
  hidePlain,
  className,
}: {
  b: Booking
  hidePlain?: boolean
  className?: string
}) {
  return b.status === "held" ? (
    <StatusPill
      tone="warning"
      icon={Clock3}
      className={cn(PILL_ICON, className)}
    >
      Spot held
    </StatusPill>
  ) : b.status === "waitlisted" ? (
    <StatusPill tone="info" className={className}>
      Waitlist {b.position === 2 ? "2nd" : `#${b.position}`}
    </StatusPill>
  ) : b.status === "pending_approval" ? (
    <StatusPill tone="info" className={className}>
      Waiting for a parent
    </StatusPill>
  ) : hidePlain ? null : (
    <StatusPill
      tone="success"
      icon={Check}
      className={cn(PILL_ICON, className)}
    >
      Booked
    </StatusPill>
  )
}

/** The pill for a booking that is over: attended, missed, or cancelled. */
export function PastStatus({
  b,
  className,
}: {
  b: Booking
  className?: string
}) {
  const attended = b.status === "attended"
  return (
    <StatusPill
      className={cn(attended && PILL_ICON, className)}
      tone={
        attended
          ? "success"
          : b.status === "late_cancelled" || b.status === "no_show"
            ? "warning"
            : "neutral"
      }
      icon={attended ? Check : undefined}
    >
      {PAST_LABEL[b.status] ?? "Cancelled"}
    </StatusPill>
  )
}

export const PAST_LABEL: Partial<Record<Booking["status"], string>> = {
  attended: "Attended",
  late_cancelled: "Late cancel",
  no_show: "Missed",
  cancelled: "Cancelled",
}

/** The kit tile of a booking. The app's `pt` kind is `training` in the kit. */
export function tileOf(b: Booking, size = 48) {
  const coach = b.coachSlug ? COACH_BY_SLUG[b.coachSlug] : undefined
  return (
    <BookingTile
      kind={b.kind === "pt" ? "training" : b.kind}
      category={b.category}
      coachName={coach?.name}
      coachCategory={b.category}
      size={size}
    />
  )
}

/** The room of a booking: the studio of a class, or what a court, lane or training place adds to the club name. */
export function roomOf(b: Booking) {
  const se = b.sessionId ? sessionById(b.sessionId) : undefined
  const club = CLUB_BY_SLUG[b.clubSlug]
  return (
    se?.studio ??
    (b.place === club.name ? undefined : b.place.replace(`${club.name} · `, ""))
  )
}

/**
 * The quiet line of a list row: "4:30 pm · Studio A". It skips the coach, and names the club only when it is not the
 * member's current one. `date` puts a short date first (the Past list has no day header).
 */
export function lineOf(b: Booking, currentClub: string, date?: string) {
  const club = CLUB_BY_SLUG[b.clubSlug]
  return [
    date,
    fmtTime(b.start),
    b.kind === "kids" ? undefined : roomOf(b),
    b.clubSlug === currentClub ? undefined : club.name,
  ]
    .filter(Boolean)
    .join(" · ")
}

/** A kids club booking is named for the children in it. */
export function titleOf(b: Booking, names?: string[]) {
  return b.kind === "kids"
    ? `Kids club${names?.length ? `, ${names.join(" and ")}` : ""}`
    : b.title
}

/**
 * Confirm and Release for a held spot. A held spot is the one state with a primary action, because it runs out.
 * `left` is the time to confirm, in milliseconds.
 */
export function HeldActions({
  b,
  left,
  size = "md",
  className,
}: {
  b: Booking
  left: number
  size?: "sm" | "md"
  className?: string
}) {
  return (
    <div className={cn("gap-xs grid grid-cols-2", className)}>
      <Button
        size={size}
        onClick={() => {
          const r = confirmHold(b.id)
          if (r.ok) {
            toast({ title: `Spot confirmed: ${b.title}` })
            announce("Spot confirmed.")
          } else toast({ type: "error", title: r.message })
        }}
      >
        Confirm · <span className="tabular">{fmtCountdown(left)}</span>
      </Button>
      <Button
        size={size}
        variant="outline"
        onClick={() => {
          releaseHold(b.id)
          toast({ title: `Released: ${b.title}` })
        }}
      >
        Release
      </Button>
    </div>
  )
}
