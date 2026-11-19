"use client"
import Link from "next/link"
import { useApp } from "@/components/app/use-app"
import { ListRow, PILL_ICON, TimeLead } from "@/components/booking/parts"
import { SessionAction } from "@/components/booking/session-action"
import {
  CategoryTile,
  categoryObject,
  ObjectCrop,
} from "@/components/brand/graphics"
import { Check, Clock3, Lock, TriangleAlert } from "@/components/icons"
import { ArtFrame } from "@/components/kit/brand-art"
import { CategoryBadge } from "@/components/kit/category"
import { CapacityIndicator, IntensityRibs } from "@/components/kit/ribs"
import { StatusPill } from "@/components/kit/ui"
import { CLUB_BY_SLUG, INSTRUCTOR_BY_ID, LEVEL_WORDS } from "@/lib/data/catalog"
import { bookingOf, bookingState, sessionLeft, waitCount } from "@/lib/engine"
import { fmtDowTime, fmtTime } from "@/lib/time"
import type { Session } from "@/lib/types"
import { cn } from "@/lib/utils"

export function ClassTags({ se }: { se: Session }) {
  const tags = [
    se.firstTimerOk ? "First-timers welcome" : "",
    se.teenOk && se.category !== "youth" ? "Teen OK" : "",
    se.minAge >= 18 ? "18+" : "",
  ].filter(Boolean)
  return tags.length ? (
    <span className="text-muted-foreground">{tags.join(" · ")}</span>
  ) : null
}

/**
 * One class in the day list: the time and length, the category tile, the class with its coach, room and level, the
 * spots left, and the one action. The name opens the class sheet. On a phone the action is in the sheet, so the row
 * stays one tap, and the row is compact: smaller text, the coach and room without the level, and a short pill
 * ("8 left", "Full").
 */
export function ScheduleRow({
  se,
  showClub,
  query = "",
  inset,
  className,
}: {
  se: Session
  showClub?: boolean
  query?: string
  /** `m` when the row sits in a card, so the time lines up with the card's title. */
  inset?: "s" | "m"
  className?: string
}) {
  const { s, me, now } = useApp()
  const st = bookingState(s, me.id, se, now)
  const left = sessionLeft(s, se)
  const mine = st.state === "booked" || st.state === "late-cancel"
  const inst = INSTRUCTOR_BY_ID[se.instructorId]
  const unit = left === 1 ? se.unit.replace(/s$/, "") : se.unit
  // The control at the right already names these states, so their pill shows only where the control is hidden.
  const own = mine ? (
    <StatusPill tone="success" icon={Check} className={PILL_ICON}>
      Booked
    </StatusPill>
  ) : st.state === "waitlisted" ? (
    <StatusPill>Waitlist #{st.booking?.position}</StatusPill>
  ) : st.state === "hold" ? (
    <StatusPill tone="warning" icon={Clock3} className={PILL_ICON}>
      Spot held
    </StatusPill>
  ) : null
  const pill =
    own ??
    (st.state === "started" ? (
      <StatusPill>Started</StatusPill>
    ) : st.state === "restricted" ? (
      // A lock, so a plan or age rule reads as a lock and not as a tag.
      <StatusPill icon={Lock} className={PILL_ICON}>
        {st.label}
      </StatusPill>
    ) : st.state === "paused" ? (
      <StatusPill>{st.label}</StatusPill>
    ) : left === 0 ? (
      <StatusPill>
        Full
        {/* A phone keeps the pill short so the name has room; the words stay for screen readers. */}
        <span className="max-sm:sr-only"> · {waitCount(s, se)} waiting</span>
      </StatusPill>
    ) : (
      <StatusPill tone={left <= 5 ? "warning" : "outline"}>
        {left <= 5 ? <span className="sr-only">Low. </span> : null}
        {left}
        <span className="max-sm:sr-only"> {unit}</span> left
      </StatusPill>
    ))
  // A member acts on a row when a spot is free, a waitlist is open, a held spot waits, or a booking is theirs.
  const control =
    mine ||
    st.state === "book" ||
    st.state === "waitlist" ||
    st.state === "hold" ||
    st.state === "waitlisted"
  return (
    <ListRow
      heading
      compact
      inset={inset}
      className={className}
      quiet={st.state === "started"}
      href={`/schedule/${se.id}${query}`}
      lead={<TimeLead start={se.start} sub={`${se.duration} min`} />}
      mark={
        <CategoryTile
          category={se.category}
          className="size-9 shrink-0 max-sm:hidden"
          aria-hidden="true"
        />
      }
      title={se.name}
      sr={`, ${fmtTime(se.start)}, ${inst?.name}`}
      line={
        <>
          {[
            inst?.name,
            se.studio,
            showClub ? CLUB_BY_SLUG[se.clubSlug].name : "",
          ]
            .filter(Boolean)
            .join(" · ")}
          {/* On a phone the line keeps to the coach and the room, so it fits on one line; the class panel and screen
              readers still have the level. */}
          <span className="max-sm:sr-only"> · {LEVEL_WORDS[se.intensity]}</span>
        </>
      }
      end={
        <>
          <span className={cn("tabular", own && control && "md:hidden")}>
            {pill}
          </span>
          {control ? (
            <span className="max-md:hidden">
              {/* The list has many of these, so the control is the small size and "Book" is an outline. */}
              <SessionAction
                se={se}
                className="!px-s !py-xxs !min-h-7 !min-w-28"
              />
            </span>
          ) : null}
        </>
      }
    />
  )
}

export function CompactClass({
  se,
  className,
  label,
}: {
  se: Session
  className?: string
  label?: string
}) {
  const { s, me, now } = useApp()
  const st = bookingState(s, me.id, se, now)
  const bk = bookingOf(s, me.id, se.id)
  return (
    <Link
      href={`/schedule/${se.id}`}
      scroll={false}
      className={cn(
        `cat-${se.category}`,
        "gap-xxs relative flex min-w-52 flex-col",
        "py-xxs pr-xs pl-s",
        "text-body-m",
        "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-cat",
        "hover:bg-muted",
        "sm:text-body-s",
        className
      )}
    >
      <span className="text-muted-foreground">
        {label ?? fmtDowTime(se.start)}
      </span>
      <span className="font-heavy">{se.name}</span>
      <span className="gap-xs flex items-center text-muted-foreground">
        {st.state === "booked" || st.state === "late-cancel" ? (
          <span className="gap-xxs inline-flex items-center text-foreground">
            <Check
              className="size-4 shrink-0 text-success"
              aria-hidden="true"
            />
            Booked
          </span>
        ) : bk?.status === "waitlisted" ? (
          <span className="gap-xxs inline-flex items-center text-foreground">
            <Clock3 className="size-4 shrink-0" aria-hidden="true" />
            Waitlist {bk.position === 2 ? "2nd" : `#${bk.position}`}
          </span>
        ) : st.state === "hold" ? (
          <span className="gap-xxs inline-flex items-center text-warning">
            <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
            Spot held
          </span>
        ) : (
          <CapacityIndicator
            variant="text"
            left={sessionLeft(s, se)}
            capacity={se.capacity}
            unit={se.unit}
            waiting={waitCount(s, se)}
          />
        )}
      </span>
    </Link>
  )
}

export function SuggestedCard({ se }: { se: Session }) {
  const { s } = useApp()
  const left = sessionLeft(s, se)
  const club = CLUB_BY_SLUG[se.clubSlug]
  return (
    <Link
      href={`/schedule/${se.id}`}
      scroll={false}
      className={cn(
        `cat-${se.category}`,
        "group gap-xs flex min-w-64 snap-start flex-col"
      )}
    >
      <ArtFrame
        className="corner-s aspect-[16/9]"
        art={
          <ObjectCrop
            id={categoryObject[se.category]}
            ratio="16/9"
            scheme={{ category: se.category }}
            scale={0.5}
            x={0.48}
            y={0.18}
            fill
          />
        }
      >
        <span
          className={cn(
            "tabular absolute right-2 bottom-2",
            "px-xs py-xxs corner-xs",
            "text-body-xs",
            "bg-photo-band text-night-foreground"
          )}
        >
          {se.duration} min
        </span>
        {left > 0 && left < 5 ? (
          <span className="absolute top-2 left-2">
            <CapacityIndicator
              variant="badge"
              left={left}
              capacity={se.capacity}
              unit={se.unit}
            />
          </span>
        ) : null}
      </ArtFrame>
      <div>
        <p className="text-body-m text-muted-foreground sm:text-body-s">
          {fmtDowTime(se.start)} · {club.name}
        </p>
        <p className="text-body-m font-heavy group-hover:underline">
          {se.name}
        </p>
        <p className="mt-xxs gap-x-s gap-y-xxs flex flex-wrap items-center">
          <CategoryBadge id={se.category} />
          <IntensityRibs level={se.intensity} category={se.category} />
        </p>
        <p className="mt-xxs text-body-m text-muted-foreground sm:text-body-s">
          {INSTRUCTOR_BY_ID[se.instructorId]?.name}
          {se.firstTimerOk ? " · First-timers welcome" : ""}
        </p>
      </div>
    </Link>
  )
}
