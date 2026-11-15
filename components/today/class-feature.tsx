"use client"
import type { ReactNode } from "react"
import { useApp } from "@/components/app/use-app"
import {
  CategoryTile,
  categoryObject,
  GymObject,
  ObjectCrop,
} from "@/components/brand/graphics"
import { Clock3, User } from "@/components/icons"
import { ArtFrame } from "@/components/kit/brand-art"
import { IntensityRibs } from "@/components/kit/ribs"
import { StatusPill } from "@/components/kit/ui"
import { CLUB_BY_SLUG, INSTRUCTOR_BY_ID } from "@/lib/data/catalog"
import { sessionById } from "@/lib/data/sessions"
import { fmtTime, MIN } from "@/lib/time"
import type { Booking } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * Where to go inside the club: the studio or space first, then the bike or spot. The club's name shows only when the
 * class is away from the member's home club, because the home club goes without saying.
 */
function whereOf(b: Booking, homeClub: string) {
  const club = CLUB_BY_SLUG[b.clubSlug]
  const away = b.clubSlug !== homeClub ? club?.name : undefined
  const room = b.place && b.place !== club?.name ? b.place : undefined
  const value = room ?? away ?? club?.name ?? b.place
  const line = [b.spot, room ? away : undefined].filter(Boolean).join(" · ")
  return { value, line: line || undefined }
}

const minutes = (b: Booking) => Math.round((b.end - b.start) / MIN)

/** One item of the facts row under the title: an 18 px icon (the Nucleo grid, not scaled) inline with the text. */
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
    <div className="gap-xxs flex min-w-0 items-start">
      <dt className="sr-only">{label}</dt>
      {/* A box one line tall centres the icon on the text's first line. */}
      <span className="flex h-lh shrink-0 items-center">{icon}</span>
      <dd className="tabular min-w-0 truncate">{children}</dd>
    </div>
  )
}

/**
 * A booked class as a feature card, after the marketing site's class card: the category's gym object cropped on its
 * tint (the class type at a glance) with the status in its top-left corner, then the heading, the name, and one row
 * of what changes from class to class (coach, time, room and spot), with the intensity in the top-right corner. The actions sit in the bottom-right
 * corner. Narrow, the art is a band on top; from @xl it is a panel at the left that takes the card's full height.
 * It leaves out what the member knows: the home club, and the category the art and the name already say.
 */
export function ClassFeature({
  booking: b,
  heading,
  status,
  title,
  actions,
  note,
}: {
  booking: Booking
  heading: string
  /** How soon, on the art's corner: "in 20 minutes", "On now · 26 min left". */
  status?: string
  title: string
  actions?: ReactNode
  /** One short line at the bottom left, across from the actions: a warning. */
  note?: ReactNode
}) {
  const { me, now } = useApp()
  const se = b.sessionId ? sessionById(b.sessionId) : undefined
  const coach = se ? INSTRUCTOR_BY_ID[se.instructorId]?.name : undefined
  const where = whereOf(b, me.homeClub)
  const started = b.start <= now
  const icon = "size-4.5 shrink-0"
  return (
    <div className="@container h-full">
      <article
        className={cn(
          `cat-${b.category}`,
          "grid h-full overflow-hidden corner-m raised @xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] @4xl:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]"
        )}
      >
        <ArtFrame
          className="h-20 @md:h-28 @xl:h-auto @xl:min-h-40"
          art={
            <ObjectCrop
              id={categoryObject[b.category]}
              ratio="4/3"
              scheme={{ category: b.category }}
              scale={0.62}
              x={0.42}
              y={0.22}
              fill
            />
          }
        >
          {status ? (
            <span className="absolute top-2 left-2">
              {started ? (
                <StatusPill tone="warning">{status}</StatusPill>
              ) : (
                <span className="tabular px-xs py-xxs corner-full bg-photo-band text-body-xs font-medium text-night-foreground">
                  {status}
                </span>
              )}
            </span>
          ) : null}
        </ArtFrame>
        <div className="gap-m p-m flex min-w-0 flex-col justify-between text-body-m sm:text-body-s">
          <div className="gap-xs flex min-w-0 flex-col">
            {/* The heading at the left; the intensity, a meter and not an icon with text, in the top-right corner. */}
            <div className="gap-s flex items-start justify-between">
              <h2 className="font-heavy">{heading}</h2>
              {se ? (
                <span className="flex h-lh shrink-0 items-center">
                  <IntensityRibs level={se.intensity} category={b.category} />
                </span>
              ) : null}
            </div>
            <p className="font-display-wide text-body-xl font-heavy text-balance">
              {title}
            </p>
            <dl className="gap-x-m gap-y-xxs flex flex-wrap text-muted-foreground">
              {coach ? (
                <Meta
                  label="Coach"
                  icon={<User aria-hidden="true" className={icon} />}
                >
                  {coach}
                </Meta>
              ) : null}
              <Meta
                label="When"
                icon={<Clock3 aria-hidden="true" className={icon} />}
              >
                {started
                  ? `Until ${fmtTime(b.end)}`
                  : `${fmtTime(b.start)} · ${minutes(b)} min`}
              </Meta>
              <Meta
                label="Where"
                icon={<GymObject id="location" className={icon} />}
              >
                {[where.value, where.line].filter(Boolean).join(" · ")}
              </Meta>
            </dl>
          </div>
          {actions || note ? (
            <div className="gap-x-m gap-y-s flex flex-wrap items-center justify-between">
              <div className="min-w-0">{note}</div>
              {actions ? (
                <div className="gap-xs flex flex-wrap justify-end">
                  {actions}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>
    </div>
  )
}

/**
 * A held spot, brief: which class, the day, start and length, and the room (and the club when it is away) at the
 * left; at the right, how long is left beside confirm or release.
 * The category tile stands for the class type and the location object for the club. The full details are one tap
 * away on the class page. The Copper edge is drawn inside the card (an inset ring on an overlay), because the card
 * animates in a clipping wrapper that would cut an outer ring and its corners.
 */
export function HeldSpot({
  booking: b,
  day,
  left,
  actions,
}: {
  booking: Booking
  /** "Today", "Thu, Oct 29". */
  day: string
  /** The countdown pill. */
  left: ReactNode
  actions: ReactNode
}) {
  const { me } = useApp()
  const where = whereOf(b, me.homeClub)
  return (
    <div className="@container">
      <article
        className={cn(
          `cat-${b.category}`,
          "gap-x-m gap-y-s p-m relative flex flex-wrap items-center corner-m bg-card text-body-m sm:text-body-s",
          "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:inset-ring-2 after:inset-ring-primary"
        )}
      >
        <div className="gap-s flex min-w-0 flex-1 basis-72 items-start @md:items-center">
          <CategoryTile
            category={b.category}
            className="size-12 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h2 className="font-heavy">A spot opened: {b.title}</h2>
            <p className="gap-x-s gap-y-xxs tabular flex flex-wrap items-center text-muted-foreground">
              <span>
                {day}, {fmtTime(b.start)} · {minutes(b)} min
              </span>
              <span className="gap-xxs inline-flex items-center">
                <GymObject id="location" className="size-4 shrink-0" />
                {[where.value, where.line].filter(Boolean).join(" · ")}
              </span>
            </p>
          </div>
        </div>
        {/* The countdown is the deadline for Confirm, so it leads the actions. */}
        <div className="gap-x-s gap-y-xs flex shrink-0 flex-wrap items-center">
          {left}
          <div className="gap-xs flex flex-wrap">{actions}</div>
        </div>
      </article>
    </div>
  )
}
