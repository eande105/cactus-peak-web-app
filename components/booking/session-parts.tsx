"use client"
import Link from "next/link"
import type { ReactNode } from "react"
import { AddToCalendar } from "@/components/booking/calendar-menu"
import { categoryObject, ObjectCrop } from "@/components/brand/graphics"
import {
  ArrowLeft,
  Briefcase,
  Clock,
  Dumbbell,
  MapPin,
  Share2,
  Users,
  X,
} from "@/components/icons"
import {
  DateBadge,
  FactRow,
  RowPill,
  SectionHeader,
  StatItem,
  StatStrip,
} from "@/components/kit/detail"
import { busyTone, RibMeter } from "@/components/kit/ribs"
import { Button } from "@/components/ui/button"
import { LEVEL_WORDS } from "@/lib/data/catalog"
import { usually } from "@/lib/engine"
import type { CalEvent } from "@/lib/ics"
import { fmtDayLong, fmtRange, fmtTime } from "@/lib/time"
import type { CategoryId } from "@/lib/types"
import { cn } from "@/lib/utils"

/** The category crop that fills the hero. Decorative. A back link or a close button sits over its top corner. */
export function SessionHeroArt({
  category,
  back,
  onClose,
}: {
  category: CategoryId
  /** Phone page: a back link over the art. Hidden from `lg`, where the page shows its own. */
  back?: { href: string; label: string }
  /** Sheet: a close button over the art. */
  onClose?: () => void
}) {
  const chip =
    "grid size-11 place-items-center corner-full raised outline-none focus-visible:ring-accent"
  return (
    <div className="relative">
      <ObjectCrop
        id={categoryObject[category]}
        ratio="16/10"
        scale={0.62}
        scheme={{ category }}
        className="size-full"
      />
      {back ? (
        <Link
          href={back.href}
          aria-label={back.label}
          className={cn(chip, "absolute top-3 left-3 lg:hidden")}
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
      ) : null}
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className={cn(chip, "absolute top-3 right-3")}
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}

/** A quiet capsule for the class tags: ages, first-timers. */
export function SessionTags({ children }: { children: ReactNode }) {
  return <ul className="gap-xs flex flex-wrap items-center">{children}</ul>
}

export function SessionTag({ children }: { children: ReactNode }) {
  return (
    <li className="px-xs py-xxs corner-xs bg-muted text-body-xs font-heavy text-muted-foreground">
      {children}
    </li>
  )
}

/** Intensity, length, spots and the usual crowd at the start hour. `grid` makes it 2 by 2 at every width (the aside). */
export function SessionStats({
  category,
  intensity,
  minutes,
  left,
  capacity,
  waiting,
  crowdLevel,
  crowdWord,
  grid,
  className,
}: {
  category: CategoryId
  intensity: number
  minutes: number
  left: number
  capacity: number
  waiting: number
  crowdLevel: number
  crowdWord: string
  grid?: boolean
  className?: string
}) {
  const word = LEVEL_WORDS[intensity]
  return (
    <StatStrip
      className={cn(
        grid &&
          "sm:grid-cols-2 sm:[&>*:nth-child(3)]:rule-l-0 sm:[&>*:nth-child(n+3)]:rule-t",
        className
      )}
    >
      <StatItem
        label="Intensity"
        detail={word}
        srLabel={`Intensity, ${word}, ${intensity} of 5`}
        meter={
          <RibMeter
            decorative
            value={intensity}
            tone="category"
            category={category}
            size="md"
            label="Intensity"
            valueText={`${word}, ${intensity} of 5`}
          />
        }
      />
      <StatItem label="Length" value={minutes} detail="minutes" />
      {left === 0 ? (
        <StatItem
          label="Spots"
          value="Full"
          detail={waiting > 0 ? `${waiting} waiting` : "Waitlist open"}
        />
      ) : (
        <StatItem
          label="Spots"
          value={left}
          detail={`of ${capacity} left`}
          srLabel={`Spots, ${left} of ${capacity} left`}
        />
      )}
      <StatItem
        label="Crowd"
        detail={usually(crowdWord)}
        meter={
          <RibMeter
            decorative
            value={crowdLevel}
            tone={busyTone(crowdLevel)}
            size="md"
            label="Crowd"
            valueText={usually(crowdWord)}
          />
        }
      />
    </StatStrip>
  )
}

/** Calendar (when booked), Invite and Share as equal buttons. */
export function SessionButtons({
  event,
  booked,
  canInvite,
  onInvite,
  onShare,
}: {
  event: CalEvent
  booked: boolean
  canInvite: boolean
  onInvite: () => void
  onShare: () => void
}) {
  const btn = "w-full justify-center"
  return (
    <div className="gap-xs grid auto-cols-fr grid-flow-col">
      {booked ? (
        <AddToCalendar event={event} className={btn}>
          Calendar
        </AddToCalendar>
      ) : null}
      {canInvite ? (
        <Button variant="outline" className={btn} onClick={onInvite}>
          <Users aria-hidden="true" />
          Invite
        </Button>
      ) : null}
      <Button variant="outline" className={btn} onClick={onShare}>
        <Share2 aria-hidden="true" />
        Share
      </Button>
    </div>
  )
}

/** Room, what to bring, the club (a link) and the time zone, as fact rows. */
export function SessionDetails({
  room,
  bring,
  club,
}: {
  room: string
  bring: string[]
  club: { slug: string; name: string; address: string }
}) {
  return (
    <section className="gap-xs flex min-w-0 flex-col">
      <SectionHeader title="Details" />
      <FactRow icon={<Dumbbell />} text={room} secondary="Room" />
      {bring.length ? (
        <FactRow
          icon={<Briefcase />}
          text={bring.join(", ")}
          secondary="What to bring"
        />
      ) : null}
      <FactRow
        icon={<MapPin />}
        text={club.name}
        secondary={club.address}
        href={`/clubs/${club.slug}`}
      />
      <FactRow
        icon={<Clock />}
        text="Arizona time"
        secondary="No daylight saving"
      />
    </section>
  )
}

export type SessionOther = {
  id: string
  start: number
  end: number
  coach: string
  left: number
}

/** The same class at other times this week, each a link to that session. */
export function AlsoThisWeek({ rows }: { rows: SessionOther[] }) {
  if (!rows.length) return null
  return (
    <section className="gap-xs flex min-w-0 flex-col">
      <SectionHeader title="Also this week" />
      <ul className="flex flex-col">
        {rows.map((x) => (
          <li key={x.id}>
            <Link
              href={`/schedule/${x.id}`}
              replace
              scroll={false}
              aria-label={`${fmtDayLong(x.start)}, ${fmtRange(x.start, x.end)}, with ${x.coach}, ${x.left > 0 ? `${x.left} left` : "full"}`}
              className="gap-s py-xs flex min-h-13 min-w-0 items-center outline-none hover:bg-muted/40 focus-visible:underline"
            >
              <DateBadge date={new Date(x.start)} />
              <span className="min-w-0 flex-1 text-body-m sm:text-body-s">
                <span className="tabular block font-medium">
                  {fmtTime(x.start)}
                </span>
                <span className="block truncate text-muted-foreground">
                  with {x.coach}
                </span>
              </span>
              <RowPill tone={x.left > 0 ? "accent" : "muted"}>
                {x.left > 0 ? `${x.left} left` : "Full"}
              </RowPill>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
