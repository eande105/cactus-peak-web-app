"use client"
import type { ReactNode } from "react"
import {
  GymObject,
  type ObjectId,
  ObjectRack,
  type RackLayout,
} from "@/components/brand/graphics"
import { ArtFrame } from "@/components/kit/brand-art"
import { StatusPill } from "@/components/kit/ui"
import { PLANS } from "@/lib/data/catalog"
import { opensAt } from "@/lib/engine"
import { HOUR } from "@/lib/time"
import type { PlanId } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * The empty screens of Book › Courts, Lap lanes, Kids club and Training share two frames, so they read as one
 * interface, and each screen picks its own art and facts, so they do not read as copies:
 * - `ReserveGate`: a whole tab the member cannot use yet (a plan without courts, a household without a child).
 * - `ReserveNotice`: a day or a list inside a tab that has nothing to pick (not open yet, all taken, closed).
 */

type Art = {
  ids: readonly ObjectId[]
  layout: RackLayout
  focus?: ObjectId
  seed?: number
}

/**
 * A whole tab the member cannot use yet. A card with the art (a band on top, a panel at the left from @2xl), the
 * pill that says what unlocks it, the heading and one line about the member's own case, `children` for the facts that
 * show what is waiting, and `meta` beside `action` in a row at the bottom (a price and the one way forward).
 * Each gate draws its own Rack layout from its own objects. The art is composed for its frame, so the band and the
 * panel are drawn apart.
 */
export function ReserveGate({
  art,
  pill,
  title,
  line,
  children,
  meta,
  action,
}: {
  art: Art
  pill?: string
  title: string
  line: ReactNode
  children?: ReactNode
  meta?: ReactNode
  action?: ReactNode
}) {
  const rack = (ratio: string, className: string) => (
    <ObjectRack
      ratio={ratio}
      layout={art.layout}
      focus={art.focus}
      ids={art.ids}
      seed={art.seed ?? 1}
      scheme="sand"
      fill
      className={className}
    />
  )
  return (
    <div className="@container">
      <article className="grid overflow-hidden corner-m raised @2xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <ArtFrame
          className="h-36 @md:h-44 @2xl:h-auto @2xl:min-h-80"
          art={
            <>
              {rack("3/1", "@2xl:hidden")}
              {rack("4/3", "@max-2xl:hidden")}
            </>
          }
        >
          {pill ? (
            <span className="absolute top-2 left-2">
              <StatusPill>{pill}</StatusPill>
            </span>
          ) : null}
        </ArtFrame>

        <div className="gap-l p-m @2xl:p-l flex min-w-0 flex-col justify-between text-body-m sm:text-body-s">
          <div className="gap-m flex flex-col">
            <div className="gap-xxs flex flex-col">
              <h2 className="font-display-wide text-body-xl font-heavy text-balance">
                {title}
              </h2>
              <p className="max-w-[48ch] text-pretty text-muted-foreground">
                {line}
              </p>
            </div>
            {children}
          </div>
          {meta || action ? (
            <div className="gap-x-m gap-y-s pt-m flex flex-wrap items-center justify-between rule-t">
              <div className="min-w-0">{meta}</div>
              {action}
            </div>
          ) : null}
        </div>
      </article>
    </div>
  )
}

/** The price in a gate's bottom row: the figure in the display face, the unit beside it, and one quiet fact under it. */
export function GatePrice({
  value,
  unit,
  note,
}: {
  value: string
  unit: string
  note?: string
}) {
  return (
    <>
      <div className="gap-xs tabular flex items-baseline">
        <p className="font-display-wide text-body-l font-heavy">{value}</p>
        <p>{unit}</p>
      </div>
      {note ? <p className="tabular text-muted-foreground">{note}</p> : null}
    </>
  )
}

/** What a gate shows in place of the action when only the primary member can take it. */
export function GateAsk({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-[32ch] text-pretty text-muted-foreground">{children}</p>
  )
}

/**
 * A day or a list with nothing to pick, inside a tab. A quiet well: the art at the left (one cut tile, or a Row whose
 * count carries the point, such as one pool for each taken lane), then the title, one line and the actions.
 * Narrow, the art sits above the words. `tone="warning"` tints the well for a state that blocks the member today.
 */
export function ReserveNotice({
  art,
  title,
  line,
  actions,
  tone = "neutral",
  className,
}: {
  art: ReactNode
  title: string
  line?: ReactNode
  actions?: ReactNode
  tone?: "neutral" | "warning"
  className?: string
}) {
  return (
    <div className={cn("@container", className)}>
      <div
        className={cn(
          "gap-m p-m flex flex-col items-start corner-m text-body-m sm:text-body-s @md:flex-row @md:items-center",
          tone === "warning" ? "bg-warning-subtle" : "bg-muted/50"
        )}
      >
        {/* A fixed column from @md, so the titles of every notice start at the same place. */}
        <div className="flex shrink-0 items-center @md:w-32 @md:justify-center">
          {art}
        </div>
        <div className="gap-s flex min-w-0 flex-1 flex-col">
          <div className="gap-xxs flex flex-col">
            <h3 className="font-heavy text-balance">{title}</h3>
            {line ? (
              <p className="text-pretty text-muted-foreground">{line}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="gap-xs flex flex-wrap">{actions}</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** One cut object for a notice. */
export function NoticeTile({ id }: { id: ObjectId }) {
  return <GymObject id={id} cut className="size-14 shrink-0" />
}

// Balanced rows: 6 tiles are 3 by 2, not 4 and 2. Written out so Tailwind finds the classes.
const COUNT_COLS = [
  "grid-cols-1",
  "grid-cols-1",
  "grid-cols-2",
  "grid-cols-3",
  "grid-cols-4",
]

/**
 * A count as objects for a notice: one cut tile for each lane or court, in balanced rows of up to four, so "all 8 lanes
 * are taken" shows as 8 tiles. `label` names the count for screen readers.
 */
export function NoticeCount({
  id,
  count,
  label,
}: {
  id: ObjectId
  count: number
  label: string
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "gap-xxs grid",
        COUNT_COLS[count <= 4 ? count : Math.min(4, Math.ceil(count / 2))]
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: identical tiles with no identity of their own
        <GymObject key={i} id={id} cut className="size-7 shrink-0" />
      ))}
    </div>
  )
}

/**
 * For a day that has not opened on the member's plan: the cheapest plan whose longer booking window has already
 * opened it, so a "not open" notice can say that the day is open on that plan. Classes, lap lanes and kids club share
 * the plan's window (courts do not).
 */
export function soonerPlan(plan: PlanId, day: number, now: number) {
  const mine = PLANS[plan]
  if (!mine) return undefined
  return Object.values(PLANS)
    .filter(
      (p) => p.window > mine.window && now >= opensAt(day + 9 * HOUR, p.window)
    )
    .sort((a, b) => a.price - b.price)[0]
}
