"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { useApp } from "@/components/app/use-app"
import { AddToCalendar } from "@/components/booking/calendar-menu"
import { PILL_ICON } from "@/components/booking/parts"
import { calEventFor } from "@/components/booking/session-action"
import { CategoryTile, GymObject } from "@/components/brand/graphics"
import { Check, Clock3, User, X } from "@/components/icons"
import { StatusPill } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import {
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
} from "@/components/ui/popover"
import {
  confirmHold,
  leaveWaitlist,
  rejoinWaitlist,
  releaseHold,
} from "@/lib/actions"
import { announce } from "@/lib/announce"
import { CLUB_BY_SLUG, INSTRUCTOR_BY_ID } from "@/lib/data/catalog"
import { sessionById } from "@/lib/data/sessions"
import {
  fmtCountdown,
  fmtDay,
  fmtRange,
  fmtTime,
  HOUR,
  relDay,
} from "@/lib/time"
import { toast } from "@/lib/toast"
import type { Booking } from "@/lib/types"
import { useOffline } from "@/lib/ui-state"
import { cn } from "@/lib/utils"

export const KIND: Record<Booking["kind"], string> = {
  class: "Class",
  court: "Court",
  lane: "Lane",
  kids: "Kids club",
  pt: "Training",
}

function evFor(b: Booking) {
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

/** One fact under the title: an 18 px icon on the first line of the text, as on Home's class card. */
function Meta({
  label,
  icon,
  children,
}: {
  label: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div className="gap-xs flex min-w-0 items-start">
      <dt className="sr-only">{label}</dt>
      <span className="flex h-lh shrink-0 items-center">{icon}</span>
      <dd className="tabular min-w-0">{children}</dd>
    </div>
  )
}

/**
 * The content of the booking popover, for the theme's popover width (about 360 px, less on a phone). From the top:
 * - the head: the category tile, the title, when it is, and the close button;
 * - the state that waits for the member (a held spot, a waitlist place) and how soon, as one pill row;
 * - where, and the coach or who it is for, with their icons;
 * - the smaller facts (spot, court or lane, players, address, reference) as a quiet two-column list;
 * - the actions for its state: a held spot confirms or releases; a booking goes to the calendar, moves, or opens the
 *   class or club;
 * - past a rule, the cancel rule beside the one action that ends the booking.
 * The popover's own padding and gap (the theme's M and S) space these blocks, so the content adds none at its edges.
 */
export function BookingPreview({
  item,
  now,
  showWho,
  onClose,
  onCancel,
}: {
  item: Item
  now: number
  showWho: boolean
  onClose: () => void
  onCancel: (b: Booking) => void
}) {
  const { s } = useApp()
  const router = useRouter()
  const offline = useOffline()
  const { b, group } = item
  const club = CLUB_BY_SLUG[b.clubSlug]
  const se = b.sessionId ? sessionById(b.sessionId) : undefined
  const coach = se ? INSTRUCTOR_BY_ID[se.instructorId]?.name : undefined
  const names = (group ?? [b])
    .map((g) => s.members[g.memberId].firstName)
    .join(" and ")
  const late = b.start - now < 2 * HOUR
  const held = b.status === "held" ? (b.holdExpiresAt ?? 0) - now : 0
  const active = b.status === "booked" || b.status === "pending_approval"
  const canMove =
    active && (b.kind === "court" || b.kind === "lane" || b.kind === "pt")
  const minutes = Math.round((b.end - b.start) / 60000)
  const room =
    se?.studio ??
    (b.place === club.name ? undefined : b.place.replace(`${club.name} · `, ""))
  const who = showWho && b.kind !== "kids" ? names : ""
  const rule =
    b.status === "waitlisted"
      ? `The waitlist moves up until ${fmtTime(b.start - HOUR)}.`
      : b.status === "held"
        ? "Confirm in time or the spot goes to the next person."
        : b.kind === "kids"
          ? "Free to cancel. Please give 2 hours' notice."
          : late
            ? "Cancelling now counts as a late cancel."
            : `Free to cancel until ${fmtTime(b.start - (b.kind === "pt" ? 24 : 2) * HOUR)}.`
  const icon = "size-4.5 shrink-0"
  const facts: { label: string; value: ReactNode }[] = [
    ...(b.spot ? [{ label: "Spot", value: b.spot }] : []),
    ...(b.resource ? [{ label: KIND[b.kind], value: b.resource }] : []),
    ...(b.players?.length
      ? [
          {
            label: "Players",
            value: (
              <ul>
                {b.players.map((p) => (
                  <li key={p.name}>
                    {p.name} ·{" "}
                    {p.status === "confirmed"
                      ? "confirmed"
                      : p.status === "guest"
                        ? "guest pass"
                        : "invited"}
                  </li>
                ))}
              </ul>
            ),
          },
        ]
      : []),
    { label: "Address", value: club.address },
    { label: "Reference", value: b.ref },
  ]
  const onNow = b.start <= now
  return (
    <>
      <PopoverHeader className="gap-s flex-row items-start">
        <CategoryTile
          category={b.category}
          className="size-11 shrink-0"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <PopoverTitle className="font-display-wide text-body-l font-heavy text-balance">
            {b.kind === "kids" ? `Kids club, ${names}` : b.title}
          </PopoverTitle>
          <PopoverDescription className="tabular text-body-m text-muted-foreground sm:text-body-s">
            {/* "Today" and "Tomorrow" stand in for the date; any other day shows it. */}
            {["Today", "Tomorrow"].includes(relDay(b.start, now))
              ? relDay(b.start, now)
              : fmtDay(b.start)}{" "}
            · {fmtRange(b.start, b.end)}
          </PopoverDescription>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mt-xxs -mr-xxs corner-s grid size-8 shrink-0 place-items-center hover:bg-muted"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </PopoverHeader>

      {b.status !== "booked" || onNow ? (
        <div className="gap-xs flex flex-wrap items-center">
          {onNow ? (
            <StatusPill tone="warning">
              On now · {Math.max(1, Math.round((b.end - now) / 60000))} min left
            </StatusPill>
          ) : null}
          <StatusOf b={b} hidePlain />
        </div>
      ) : null}

      <dl className="gap-xxs flex flex-col text-body-m sm:text-body-s">
        <Meta label="Where" icon={<GymObject id="location" className={icon} />}>
          {[room, club.name].filter(Boolean).join(" · ")}
        </Meta>
        <Meta
          label="Length"
          icon={<Clock3 aria-hidden="true" className={icon} />}
        >
          {b.kind === "kids" ? "2 h" : `${minutes} min`}
        </Meta>
        {coach || who ? (
          <Meta
            label={coach ? "Coach" : "Who"}
            icon={<User aria-hidden="true" className={icon} />}
          >
            {[coach, who].filter(Boolean).join(" · ")}
          </Meta>
        ) : null}
      </dl>

      {/* The smaller facts in a quiet well: label at the left, value at the right, one line each. */}
      <dl className="gap-x-m gap-y-xxs p-s corner-s grid grid-cols-[auto_minmax(0,1fr)] bg-muted/50 text-body-m sm:text-body-s">
        {facts.map((f) => (
          <div key={f.label} className="contents">
            <dt className="text-muted-foreground">{f.label}</dt>
            <dd className="tabular min-w-0 text-right text-pretty">
              {f.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* A held spot is the one state with a primary action, because it runs out. */}
      {b.status === "held" ? (
        <div className="gap-xs grid grid-cols-2">
          <Button
            size="sm"
            onClick={() => {
              const r = confirmHold(b.id)
              if (r.ok) {
                toast({ title: `Spot confirmed: ${b.title}` })
                announce("Spot confirmed.")
              } else toast({ type: "error", title: r.message })
            }}
          >
            Confirm · <span className="tabular">{fmtCountdown(held)}</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              releaseHold(b.id)
              toast({ title: `Released: ${b.title}` })
            }}
          >
            Release
          </Button>
        </div>
      ) : null}

      <div className="gap-xs flex flex-wrap">
        {active ? (
          <AddToCalendar
            event={evFor(b)}
            variant="outline"
            className="!px-s !py-xxs !min-h-7 max-sm:!min-h-11"
          />
        ) : null}
        {canMove ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              router.push(
                b.kind === "pt"
                  ? `/training/coaches/${b.coachSlug}/book?move=${b.id}`
                  : `/reserve/${b.kind === "court" ? "courts" : "lanes"}?club=${b.clubSlug}&move=${b.id}`
              )
            }
          >
            Move
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="outline"
          render={
            se ? (
              <Link href={`/schedule/${se.id}`} scroll={false} />
            ) : (
              <Link href={`/clubs/${b.clubSlug}`} />
            )
          }
        >
          {se ? "Class details" : "Club details"}
        </Button>
      </div>

      <div className="gap-s pt-s flex items-center justify-between text-body-m rule-t sm:text-body-s">
        <p className="min-w-0 text-pretty text-muted-foreground">{rule}</p>
        {b.status === "waitlisted" ? (
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 !text-destructive"
            onClick={() => {
              leaveWaitlist(b.id)
              toast({
                title: "You left the waitlist",
                action: {
                  label: "Undo",
                  onClick: () => rejoinWaitlist(b.id),
                },
              })
            }}
          >
            Leave waitlist
          </Button>
        ) : active ? (
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 !text-destructive"
            disabled={offline}
            onClick={() => onCancel(b)}
          >
            Cancel booking
          </Button>
        ) : null}
      </div>
    </>
  )
}

export const PAST_LABEL: Partial<Record<Booking["status"], string>> = {
  attended: "Attended",
  late_cancelled: "Late cancel",
  no_show: "Missed",
  cancelled: "Cancelled",
}
