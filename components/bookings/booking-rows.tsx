"use client"
import Link from "next/link"
import type { ReactNode } from "react"
import { useApp } from "@/components/app/use-app"
import { ListRows, TimeLead } from "@/components/booking/parts"
import { lineOf, tileOf, titleOf } from "@/components/bookings/booking-panel"
import { ChevronRight, Clock3 } from "@/components/icons"
import { RowPill } from "@/components/kit/detail"
import { StatusPill } from "@/components/kit/ui"
import { CLUB_BY_SLUG, INSTRUCTOR_BY_ID } from "@/lib/data/catalog"
import { sessionById } from "@/lib/data/sessions"
import type { Booking } from "@/lib/types"
import { cn } from "@/lib/utils"

/** One row: a booking, and for a kids club block the children in it. */
export type BookingRowItem = { b: Booking; names?: string[] }

/**
 * The booking row of Today's Coming up, shared with Bookings. From the list's `@md` width a row has the time column,
 * the 40 px tile, the title with place, coach and member, and a chevron. Below it, the iOS row: a 48 px tile, the
 * title, one line of facts, and a "View" pill.
 * With `drawer`, a row is a button that selects the booking (`selectedId` shows the selected-row style); without it,
 * the row is a link to `href`. The whole row is the hit area; `below` content (Confirm and Release on a held spot)
 * sits above that area so its own buttons work.
 */
export function BookingRows({
  items,
  label,
  who,
  drawer,
  selectedId,
  onSelect,
  href,
  sub,
  narrowLead,
  status,
  below,
  hideFrom,
  className,
}: {
  items: BookingRowItem[]
  label: string
  /** "household": a row for another member names them. */
  who: "me" | "household"
  drawer: boolean
  selectedId: string | null
  onSelect: (id: string) => void
  /** Where a row links when there is no drawer. */
  href: (b: Booking) => string
  /** The line under the time in the time column, e.g. the day. */
  sub?: (b: Booking) => ReactNode
  /** The first fact of the narrow row's line, e.g. the day, when the list is not grouped by it. */
  narrowLead?: (b: Booking) => string | undefined
  /** A state that replaces the plain "View" pill and stands before the chevron: Held, Waitlist #2, Attended. */
  status?: (b: Booking) => ReactNode
  below?: (b: Booking) => ReactNode
  /** Rows from this index hide while the page is narrower than `6xl` (Today shows fewer rows there). */
  hideFrom?: number
  className?: string
}) {
  const { s, me, club } = useApp()
  return (
    <div className="@container">
      <ListRows label={label} className={className}>
        {items.map(({ b, names }, i) => {
          const se = b.sessionId ? sessionById(b.sessionId) : undefined
          const coach = se ? INSTRUCTOR_BY_ID[se.instructorId]?.name : ""
          const whoName =
            who === "household" && b.kind !== "kids" && b.memberId !== me.id
              ? s.members[b.memberId]?.firstName
              : ""
          const title = titleOf(b, names)
          const selected = drawer && selectedId === b.id
          const lead = narrowLead?.(b)
          const state = status?.(b)
          const extra = below?.(b)
          const hit =
            "outline-none after:absolute after:inset-0 focus-visible:underline"
          const name = (
            <>
              {title}
              <span className="sr-only">
                , {[lead, lineOf(b, club), whoName].filter(Boolean).join(", ")}
              </span>
            </>
          )
          return (
            <li
              key={b.id}
              data-selected={selected || undefined}
              data-row-id={b.id}
              className={cn(
                "gap-s px-m py-s relative flex min-h-16 items-center text-body-m sm:text-body-s",
                hideFrom !== undefined &&
                  i >= hideFrom &&
                  "@max-6xl/page:hidden",
                !selected && "hover:bg-muted/40",
                // The selected-row style of ListRow: an inset tile, with the rules beside it hidden.
                selected &&
                  "before:corner-s isolate !shadow-none before:absolute before:inset-1 before:-z-10 before:bg-accent [&+li]:!shadow-none"
              )}
            >
              <div className="hidden w-16 shrink-0 @md:block">
                <TimeLead start={b.start} sub={sub?.(b)} />
              </div>
              <span className="@md:hidden">{tileOf(b, 48)}</span>
              <span className="hidden @md:block">{tileOf(b, 40)}</span>
              <div className="min-w-0 flex-1">
                {/* A narrow row lets a long title wrap once rather than cut it. */}
                <p className="line-clamp-2 font-body font-heavy @md:truncate">
                  {drawer ? (
                    <button
                      type="button"
                      onClick={() => onSelect(b.id)}
                      aria-pressed={selected}
                      className={cn(hit, "text-left")}
                    >
                      {name}
                    </button>
                  ) : (
                    <Link href={href(b)} scroll={false} className={hit}>
                      {name}
                    </Link>
                  )}
                </p>
                <p
                  aria-hidden="true"
                  className="tabular truncate text-muted-foreground @md:hidden"
                >
                  {/* The member comes first: it is what tells two of the same class apart. */}
                  {[whoName, lead, lineOf(b, club)].filter(Boolean).join(" · ")}
                </p>
                <p
                  aria-hidden="true"
                  className="hidden truncate text-muted-foreground @md:block"
                >
                  {[
                    b.place,
                    coach,
                    whoName,
                    // Another club than the one in view is named, as the narrow line does (lineOf).
                    b.clubSlug === club ||
                    b.place === CLUB_BY_SLUG[b.clubSlug]?.name
                      ? undefined
                      : CLUB_BY_SLUG[b.clubSlug]?.name,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {extra ? (
                  <div className="pt-xs relative z-10">{extra}</div>
                ) : null}
              </div>
              <div className="gap-xs flex shrink-0 items-center">
                {state ??
                  (b.status === "held" ? (
                    <>
                      <RowPill tone="muted" className="text-warning @md:hidden">
                        Held
                      </RowPill>
                      <StatusPill
                        tone="warning"
                        icon={Clock3}
                        className="pl-xs @max-md:hidden"
                      >
                        Held
                      </StatusPill>
                    </>
                  ) : (
                    <RowPill className="@md:hidden">View</RowPill>
                  ))}
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground @max-md:hidden"
                  aria-hidden="true"
                />
              </div>
            </li>
          )
        })}
      </ListRows>
    </div>
  )
}
