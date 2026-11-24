"use client"
import type { ReactNode } from "react"
import { RowPill } from "@/components/kit/detail"
import { RibMeter } from "@/components/kit/ribs"
import { fmtTime, parts } from "@/lib/time"
import { cn } from "@/lib/utils"

/**
 * The phone form of the Book slot pickers (like the iOS `ReserveSlotRow`): one row for each start time, in sections
 * by part of day. A fixed-width time column (the start in semibold, the end muted under it), a glance, a status line
 * under the glance and a trailing pill. A full row keeps full opacity and is not tappable; a past row is half opacity.
 */

export interface SlotRowData {
  key: string | number
  start: number
  end: number
  /** The picture of the row: court tiles, lane strips or a meter. */
  glance: ReactNode
  /** The line under the glance: "3 open", "7 of 16 spots left". */
  status: string
  /** The trailing pill: "Book" or "Join waitlist". A row with no pill shows none. */
  pill?: string
  past?: boolean
  selected?: boolean
  /** The name a screen reader gets for the row. */
  label: string
  /** Leave it out for a row that cannot be picked (a full or past row). */
  onPress?: () => void
}

const PARTS = [
  { id: "morning", title: "Morning", until: 12 },
  { id: "afternoon", title: "Afternoon", until: 17 },
  { id: "evening", title: "Evening", until: 24 },
] as const

function partOf(ms: number) {
  const h = parts(ms).h
  return PARTS.find((p) => h < p.until) ?? PARTS[2]
}

/** The width of the time column, in rem so it grows with the text size. Every row uses it, so the glances line up. */
const TIME_COL = "w-16"

function RowBody({ r }: { r: SlotRowData }) {
  return (
    <span className="gap-x-s gap-y-xs flex w-full flex-wrap items-center text-left">
      <span className={cn("tabular flex shrink-0 flex-col", TIME_COL)}>
        <span className="text-body-m font-heavy">{fmtTime(r.start)}</span>
        <span className="text-body-s text-muted-foreground">
          {fmtTime(r.end)}
        </span>
      </span>
      <span className="gap-xxs flex min-w-40 flex-1 flex-col items-start">
        {r.glance}
        <span className="tabular text-body-s text-muted-foreground">
          {r.status}
        </span>
      </span>
      {r.pill ? <RowPill>{r.pill}</RowPill> : null}
    </span>
  )
}

export function SlotRowList({
  rows,
  label,
  disabled,
  className,
}: {
  rows: SlotRowData[]
  label: string
  disabled?: boolean
  className?: string
}) {
  const groups = PARTS.map((p) => ({
    ...p,
    rows: rows.filter((r) => partOf(r.start).id === p.id),
  })).filter((g) => g.rows.length)
  return (
    <section aria-label={label} className={cn("flex flex-col", className)}>
      {groups.map((g) => (
        <section key={g.id} aria-label={g.title} className="flex flex-col">
          <h3 className="px-s pt-m pb-xs first:pt-zero text-body-m font-heavy">
            {g.title}
          </h3>
          <ul className="flex flex-col">
            {g.rows.map((r) => {
              const live = !!r.onPress && !r.past && !disabled
              const base = cn(
                "px-s py-s relative block min-h-14 w-full corner-m",
                r.selected && "bg-accent hairline-l ring-primary",
                r.past && "opacity-50"
              )
              return (
                <li key={r.key} className="[&+li]:rule-t">
                  {live ? (
                    <button
                      type="button"
                      aria-pressed={!!r.selected}
                      aria-label={r.label}
                      onClick={r.onPress}
                      className={cn(base, "min-h-11 hover:bg-muted/50")}
                    >
                      <RowBody r={r} />
                    </button>
                  ) : (
                    <div className={base}>
                      <RowBody r={r} />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </section>
  )
}

/** One numbered square for each court. Open is the solid brand fill, taken is muted, yours is the accent. */
export function CourtTiles({
  courts,
}: {
  courts: { id: number; state: "open" | "taken" | "mine"; picked?: boolean }[]
}) {
  return (
    <span aria-hidden="true" className="gap-xs flex flex-wrap">
      {courts.map((c) => (
        <span
          key={c.id}
          className={cn(
            "tabular corner-s grid size-7 place-items-center text-body-s font-heavy",
            // The same marks as the desktop grid (TONE in parts.tsx): open is a light outlined tile, taken is
            // hatched, and only the pick is solid.
            c.state === "open" &&
              !c.picked &&
              `bg-popover text-night dark:bg-night-foreground/12 dark:text-night-foreground ${OPEN_EDGE}`,
            c.state === "open" &&
              c.picked &&
              "bg-night text-night-foreground ring-2 ring-primary dark:bg-night-foreground dark:text-night",
            c.state === "taken" && `text-muted-foreground ${HATCH}`,
            c.state === "mine" && "bg-primary text-primary-foreground"
          )}
        >
          {c.id}
        </span>
      ))}
    </span>
  )
}

const OPEN_EDGE =
  "shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--night)_40%,transparent)] dark:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--night-foreground)_35%,transparent)]"
const HATCH =
  "bg-[repeating-linear-gradient(135deg,color-mix(in_oklab,var(--foreground)_9%,transparent)_0_2px,transparent_2px_6px)]"

/** One tall thin strip for each lane. Free is an outlined strip, shared (one swimmer) is half filled from the bottom. */
export function LaneStrips({
  lanes,
}: {
  lanes: {
    id: number
    state: "free" | "shared" | "full" | "mine"
    picked?: boolean
  }[]
}) {
  return (
    <span aria-hidden="true" className="gap-xs flex flex-wrap">
      {lanes.map((l) => (
        <span
          key={l.id}
          className={cn(
            "relative flex h-8 w-3 flex-col justify-end overflow-hidden corner-xs",
            l.state === "full" && HATCH,
            l.state === "mine" && "bg-primary",
            (l.state === "free" || l.state === "shared") &&
              !l.picked &&
              `bg-popover dark:bg-night-foreground/12 ${OPEN_EDGE}`,
            l.picked && "bg-night ring-2 ring-primary dark:bg-night-foreground"
          )}
        >
          {l.state === "shared" && !l.picked ? (
            <span className="h-1/2 bg-night/45 dark:bg-night-foreground/45" />
          ) : null}
        </span>
      ))}
    </span>
  )
}

/** How full a kids club block is, as the rib meter. Warning when 3 or fewer spots are left. */
export function SpotsMeter({ left, cap }: { left: number; cap: number }) {
  const taken = cap - left
  const value = taken <= 0 ? 0 : Math.max(1, Math.ceil((taken / cap) * 5))
  return (
    <RibMeter
      value={value}
      tone={
        left > 0 && left <= 3 ? "warning" : left === 0 ? "neutral" : "brand"
      }
      size="md"
      label="Spots"
      valueText={`${left} of ${cap} spots left`}
      decorative
    />
  )
}
