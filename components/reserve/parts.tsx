"use client"
import type { ReactNode } from "react"
import {
  Check,
  type IconComponent,
  ShieldCheck,
  TriangleAlert,
} from "@/components/icons"
import type { CellInfo, GridRow } from "@/components/reserve/slot-grid"
import { fmtTime } from "@/lib/time"
import { cn } from "@/lib/utils"

/** How a slot looks. The grid cell, the phone chip and the legend all use the same set. */
export type SlotTone =
  | "free"
  | "selected"
  | "mine"
  | "taken"
  | "short"
  | "past"
  | "idle"

const TONE: Record<SlotTone, string> = {
  // After the Deputy and Calendly timelines: open time is light and inviting, taken time is hatched, and only the
  // pick is solid. A grid full of solid open cells made free time the loudest thing on the page.
  free: "bg-popover dark:bg-night-foreground/12",
  selected:
    "bg-night text-night-foreground dark:bg-night-foreground dark:text-night",
  mine: "bg-primary text-primary-foreground",
  taken:
    "bg-[repeating-linear-gradient(135deg,color-mix(in_oklab,var(--foreground)_9%,transparent)_0_2px,transparent_2px_6px)] text-muted-foreground",
  // Partly free: a light tint, so it reads as "some time left", not as a second kind of taken.
  short: "bg-night/14 dark:bg-night-foreground/16",
  // A start time that has gone by: a plain quiet chip. A blank cell would read as "not part of the grid".
  past: "bg-muted/40",
  idle: "",
}

export function slotTone(info: CellInfo, selected?: boolean): SlotTone {
  if (selected) return "selected"
  if (info.status === "open") return "free"
  if (info.status === "mine") return "mine"
  if (info.status === "short") return "short"
  if (info.status === "past") return "past"
  if (
    info.status === "taken" ||
    info.status === "full" ||
    info.status === "closed"
  )
    return "taken"
  return "idle"
}

/** The name a screen reader gets for one slot: the resource, the time, and the state. */
export function slotName(row: GridRow, slot: number, info: CellInfo) {
  const state =
    info.status === "open"
      ? info.swimmers === 1
        ? "1 of 2 swimmers"
        : "available"
      : info.status === "mine"
        ? "yours"
        : info.status === "taken" || info.status === "full"
          ? "taken"
          : info.status === "closed"
            ? "closed"
            : info.status === "short"
              ? "not enough time for this length"
              : info.status === "notOpen"
                ? info.label
                : "past"
  return `${row.label}, ${fmtTime(slot)}, ${state}`
}

/** The two places of a lap lane as dots. A filled dot is a swimmer. */
export function Swimmers({
  count,
  onNight,
  className,
}: {
  count: number
  onNight?: boolean
  className?: string
}) {
  return (
    <span className={cn("gap-xxs flex", className)} aria-hidden="true">
      {[0, 1].map((k) => (
        <span
          key={k}
          className={cn(
            "size-2 corner-full",
            k < count
              ? onNight
                ? "bg-night-foreground dark:bg-night"
                : "bg-foreground"
              : onNight
                ? "hairline ring-night-foreground dark:ring-night"
                : "hairline ring-input"
          )}
        />
      ))}
    </span>
  )
}

// The selected range is one Night bar across its cells, so only the two ends are rounded.
export type SlotRange = "only" | "start" | "mid" | "end"
const RANGE: Record<SlotRange, string> = {
  only: "inset-x-0.5 corner-s",
  start: "left-0.5 right-0 corner-l-s",
  mid: "inset-x-0",
  end: "left-0 right-0.5 corner-r-s",
}

// The accent ring around the selected range: all four sides of one cell, or the ends and the long sides of several.
const RING: Record<SlotRange, string> = {
  only: "shadow-[inset_0_0_0_2px_var(--primary)]",
  start:
    "shadow-[inset_2px_0_0_0_var(--primary),inset_0_2px_0_0_var(--primary),inset_0_-2px_0_0_var(--primary)]",
  mid: "shadow-[inset_0_2px_0_0_var(--primary),inset_0_-2px_0_0_var(--primary)]",
  end: "shadow-[inset_-2px_0_0_0_var(--primary),inset_0_2px_0_0_var(--primary),inset_0_-2px_0_0_var(--primary)]",
}

/**
 * One cell of the slot grid: a radio that fills the cell, with the state drawn as a chip inside it.
 * An open cell is a solid brand chip, a taken one is muted, a shared lane is half filled from the bottom. The selected range keeps the fills and takes the accent ring.
 */
export function SlotCell({
  kind,
  row,
  slot,
  info,
  r,
  c,
  range,
  tabbable,
  disabled,
  onSelect,
  className,
}: {
  kind: "court" | "lane"
  row: GridRow
  slot: number
  info: CellInfo
  /** The row and column index, for arrow-key movement. */
  r: number
  c: number
  /** Where the cell is in the selected range. `null` when it is not selected. */
  range: SlotRange | null
  tabbable: boolean
  disabled?: boolean
  onSelect: (row: number, slot: number) => void
  className?: string
}) {
  const free = info.status === "open"
  const live = free && !disabled
  const tone = slotTone(info, !!range)
  const start = range === "start" || range === "only"
  const shared = kind === "lane" && free && info.swimmers === 1
  return (
    // biome-ignore lint/a11y/useSemanticElements: slot picker with roving tabindex, a native radio input cannot fill the grid cell
    <button
      type="button"
      role="radio"
      aria-checked={start}
      aria-label={slotName(row, slot, info)}
      aria-disabled={!live || undefined}
      data-row={r}
      data-col={c}
      tabIndex={tabbable ? 0 : -1}
      onClick={() => {
        if (live) onSelect(row.id, slot)
      }}
      className={cn(
        "group relative grid size-full min-h-11 place-items-center text-body-xs",
        !live && !range && "cursor-default",
        className
      )}
    >
      {tone === "idle" ? null : (
        <span
          aria-hidden="true"
          className={cn(
            "absolute overflow-hidden",
            range ? cn("inset-y-0.5", RANGE[range]) : "corner-s inset-0.5",
            // A shared lane: a light base with the bottom half solid.
            shared ? TONE.free : TONE[tone],
            range && RING[range],
            free &&
              !range &&
              "shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--night)_40%,transparent)] dark:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--night-foreground)_35%,transparent)]" +
                (live
                  ? "group-hover:bg-night/10 group-hover:shadow-[inset_0_0_0_2px_var(--primary)] group-focus-visible:shadow-[inset_0_0_0_2px_var(--primary)] dark:group-hover:bg-night-foreground/18"
                  : "")
          )}
        >
          {shared && !range ? (
            <span className="absolute inset-x-0 bottom-0 h-1/2 bg-night/45 dark:bg-night-foreground/45" />
          ) : null}
        </span>
      )}
      <span className="relative">
        {range ? (
          start ? (
            kind === "lane" ? (
              <Swimmers count={(info.swimmers ?? 0) + 1} onNight />
            ) : (
              <Check
                className="size-4 text-night-foreground"
                aria-hidden="true"
              />
            )
          ) : null
        ) : free ? (
          kind === "lane" ? null : (
            <span
              aria-hidden="true"
              className={cn(
                "tabular font-medium text-night opacity-0 dark:text-night-foreground",
                live &&
                  "group-hover:opacity-100 group-focus-visible:opacity-100"
              )}
            >
              {fmtTime(slot, false)}
            </span>
          )
        ) : info.status === "mine" ? (
          <span className="font-medium text-primary-foreground">Yours</span>
        ) : info.status === "closed" ? (
          <span className="text-muted-foreground">Closed</span>
        ) : null}
      </span>
    </button>
  )
}

/**
 * The key for the slot grid, in the head of the table's card (its `action`), so it takes no row of its own: small
 * swatches with their words, then `note`, a rule in words. It wraps under the title when the head is narrow.
 */
export function SlotLegend({
  items,
  note,
  className,
}: {
  items?: { tone: SlotTone; label: string; swimmers?: number }[]
  note?: string
  className?: string
}) {
  return (
    <ul
      aria-label="Legend"
      className={cn(
        "gap-x-s gap-y-xxs flex flex-wrap items-center text-body-s text-muted-foreground",
        className
      )}
    >
      {items?.map((it) => (
        <li key={it.label} className="gap-xs flex items-center">
          <span
            aria-hidden="true"
            className={cn(
              "relative h-3 w-5 shrink-0 overflow-hidden corner-xs",
              it.swimmers === 1 ? TONE.free : TONE[it.tone],
              (it.tone === "free" || it.swimmers === 1) &&
                "shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--night)_40%,transparent)]"
            )}
          >
            {it.swimmers === 1 ? (
              <span className="absolute inset-x-0 bottom-0 h-1/2 bg-night/45 dark:bg-night-foreground/45" />
            ) : null}
          </span>
          {it.label}
        </li>
      ))}
      {note ? <li className="text-pretty">{note}</li> : null}
    </ul>
  )
}

/** One muted line with a small icon: the reassurance or the rule under the choices in a booking panel. */
export function QuietLine({
  icon: Icon = ShieldCheck,
  tone = "muted",
  children,
  className,
}: {
  icon?: IconComponent
  tone?: "muted" | "warning"
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        "gap-xs flex items-start text-body-m text-pretty sm:text-body-s",
        tone === "muted" && "text-muted-foreground",
        className
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "mt-xxs sm:mt-xxs size-4 shrink-0",
          tone === "warning" && "text-warning"
        )}
      />
      <span className="min-w-0">{children}</span>
    </p>
  )
}

/** The cancel rule for a reservation, as one line. A late cancel takes the warning icon. */
export function CancelLine({
  note,
  className,
}: {
  note: { text: string; late: boolean }
  className?: string
}) {
  return (
    <QuietLine
      icon={note.late ? TriangleAlert : ShieldCheck}
      tone={note.late ? "warning" : "muted"}
      className={className}
    >
      {note.text}
      {note.late ? "" : " Late cancels count as strikes."}
    </QuietLine>
  )
}

/** The error line above the primary button of a booking panel. */
export function PanelError({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return children ? (
    <p
      role="alert"
      className={cn(
        "text-body-m font-medium text-destructive sm:text-body-s",
        className
      )}
    >
      {children}
    </p>
  ) : null
}
