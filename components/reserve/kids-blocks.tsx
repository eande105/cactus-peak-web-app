"use client"
import type { CSSProperties } from "react"
import { Toggle } from "@/components/graphical"
import { Check, Moon, Sun, Sunrise, Sunset } from "@/components/icons"
import { RibMeter } from "@/components/kit/ribs"
import { atTime, fmtRange } from "@/lib/time"
import type { Club } from "@/lib/types"
import { cn } from "@/lib/utils"

/** The spots in one kids club block (lib/engine.ts, kidsLeft). */
export const KIDS_CAP = 16
export const BLOCK_ICON = {
  k1: Sunrise,
  k2: Sun,
  k3: Sunset,
  k4: Moon,
} as const
type Block = { id: string; from: string; to: string }

/** A block's state for one club, as the picker shows it. */
type Cell = {
  left: number
  /** Shown under the filters ("Blocks with room only" can hide it). */
  shown: boolean
}

export function BlockIcon({
  id,
  className,
}: {
  id: string
  className?: string
}) {
  const I = BLOCK_ICON[id as keyof typeof BLOCK_ICON]
  return <I className={cn("size-4 shrink-0", className)} aria-hidden="true" />
}

/**
 * The kids club block picker, laid out like the court and lane tables, so the clubs and the times compare at a glance.
 * - From @2xl: a matrix. The columns are the blocks (their icon and time), the rows are the kids clubs (the name, and
 *   how many blocks have room), and each cell is a tile to pick.
 * - Narrow: one group for each club, its tiles two to a row, each with its own time.
 * A tile leads with the number of spots left, the one fact a parent scans for, then the brand spots meter and, when it
 * matters, what happens on a pick: "Need 2 · Waitlist", "Full · Waitlist", "Ended".
 * `disabled` (no child chosen yet) keeps the picker visible but inert.
 */
export function BlockPicker({
  clubs,
  blocks,
  cell,
  day,
  now,
  need,
  homeClub,
  picked,
  onPick,
  disabled,
}: {
  clubs: Club[]
  /** The columns: the blocks the time-of-day filter shows, in time order. */
  blocks: Block[]
  cell: (slug: string, block: Block) => Cell
  day: number
  now: number
  /** How many children need a spot. */
  need: number
  homeClub: string
  /** The club and blocks of the booking in progress. */
  picked: { club: string; ids: string[] }
  onPick: (slug: string, block: Block) => void
  disabled?: boolean
}) {
  const time = (b: Block) => fmtRange(atTime(day, b.from), atTime(day, b.to))
  const room = (slug: string) =>
    blocks.filter((b) => {
      const c = cell(slug, b)
      return atTime(day, b.from) > now && c.left >= Math.max(1, need)
    }).length
  const tile = (c: Club, b: Block, withTime: boolean) => {
    const st = cell(c.slug, b)
    if (!st.shown)
      return (
        <div
          key={b.id}
          aria-hidden="true"
          className="corner-s min-h-20 border border-dashed border-border"
        />
      )
    return (
      <BlockTile
        key={b.id}
        id={b.id}
        club={c.name}
        time={time(b)}
        withTime={withTime}
        left={st.left}
        need={need}
        on={picked.club === c.slug && picked.ids.includes(b.id)}
        past={atTime(day, b.from) < now}
        onPress={() => onPick(c.slug, b)}
      />
    )
  }
  const clubHead = (c: Club) => (
    <div className="min-w-0">
      <p className="truncate font-heavy">{c.name}</p>
      <p className="tabular truncate text-muted-foreground">
        {c.slug === homeClub ? (
          <span className="text-primary">Your club · </span>
        ) : null}
        {room(c.slug)} of {blocks.length} with room
      </p>
    </div>
  )
  return (
    <div
      inert={disabled}
      className={cn(
        "@container text-body-m sm:text-body-s",
        disabled && "opacity-50"
      )}
    >
      {/* Wide: the matrix. A column of club names, then one column for each block. */}
      {/* biome-ignore lint/a11y/useSemanticElements: a labelled grid of toggle buttons; a fieldset would add a legend and a border */}
      <div
        role="group"
        aria-label="Kids club blocks"
        style={{ "--cols": blocks.length } as CSSProperties}
        className="gap-x-xs gap-y-s grid grid-cols-[minmax(9rem,13rem)_repeat(var(--cols),minmax(0,1fr))] items-center @max-2xl:hidden"
      >
        <span />
        {blocks.map((b) => (
          <p
            key={b.id}
            className="gap-xs px-xs tabular flex min-w-0 items-center font-medium whitespace-nowrap text-muted-foreground"
          >
            <BlockIcon id={b.id} />
            {time(b)}
          </p>
        ))}
        {clubs.map((c) => (
          <div key={c.slug} className="contents">
            {clubHead(c)}
            {blocks.map((b) => tile(c, b, false))}
          </div>
        ))}
      </div>

      {/* Narrow: a group for each club, its tiles two to a row. */}
      <div className="gap-m flex flex-col @2xl:hidden">
        {clubs.map((c) => (
          <section
            key={c.slug}
            aria-label={`${c.name} blocks`}
            className="gap-xs flex flex-col"
          >
            {clubHead(c)}
            <div className="gap-xs grid grid-cols-2">
              {blocks.map((b) => tile(c, b, true))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

/**
 * One block for one club, as a tile to press. The number of spots leads; the meter fills with the spots left (green,
 * then amber when few are left); the last line says what a pick does when there is not room for every child.
 */
function BlockTile({
  id,
  club,
  time,
  withTime,
  left,
  need,
  on,
  past,
  onPress,
}: {
  id: string
  club: string
  time: string
  withTime: boolean
  left: number
  need: number
  on: boolean
  past: boolean
  onPress: () => void
}) {
  const short = left < need
  const low = left > 0 && left <= 3
  const ribs = left === 0 ? 0 : Math.max(1, Math.ceil((left / KIDS_CAP) * 5))
  const state = past
    ? "Ended"
    : left === 0
      ? "Full · Waitlist"
      : short
        ? `Need ${need} · Waitlist`
        : null
  return (
    <Toggle
      pressed={on}
      disabled={past}
      onPressedChange={onPress}
      aria-label={`${club}, ${time}: ${past ? "no spots, the block has begun" : left === 0 ? "full, join the waitlist" : `${left} spots left${short ? `, need ${need}, join the waitlist` : ""}`}`}
      className={cn(
        "gap-xxs p-s corner-s !flex !min-h-20 !w-full !flex-col !items-stretch !justify-between text-left whitespace-normal hairline ring-border",
        "data-[pressed]:ring-transparent",
        // A block that has begun can no longer be booked: its content dims, and the edge stays so the grid keeps shape.
        past && "*:opacity-50"
      )}
    >
      {withTime ? (
        <span className="gap-xs tabular flex items-center font-medium">
          <BlockIcon id={id} />
          {time}
        </span>
      ) : null}
      <span className="gap-xs flex items-center justify-between">
        {past ? (
          // Words, not a dash: a block that has begun has no spots to book.
          <span className="font-display-wide text-body-l font-heavy text-muted-foreground">
            No spots
          </span>
        ) : (
          <span className="gap-xxs flex items-baseline">
            <span
              className={cn(
                "tabular font-display-wide text-body-l font-heavy",
                !on && low && "text-warning",
                !on && left === 0 && "text-muted-foreground"
              )}
            >
              {left}
            </span>
            <span className={cn(!on && "text-muted-foreground")}>
              {left === 1 ? "spot" : "spots"}
            </span>
          </span>
        )}
        {on ? (
          <Check className="size-4 shrink-0" aria-hidden="true" />
        ) : past ? null : (
          <RibMeter
            value={past ? 0 : ribs}
            tone={left === 0 || past ? "neutral" : low ? "warning" : "success"}
            size="sm"
            label="Spots"
            valueText={`${left} spots left`}
            decorative
          />
        )}
      </span>
      {state ? (
        <span
          className={cn(
            "truncate",
            !on && (past ? "text-muted-foreground" : "text-warning")
          )}
        >
          {state}
        </span>
      ) : null}
    </Toggle>
  )
}
