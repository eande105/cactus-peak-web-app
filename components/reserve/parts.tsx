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
  free: "bg-success-subtle",
  selected: "bg-night text-night-foreground",
  mine: "bg-accent text-accent-foreground",
  taken: "hatch opacity-60",
  short: "bg-success-subtle opacity-40",
  // A start time that has gone by: a plain muted chip, quieter than the green free slots, as Kids club dims a block
  // that has begun. A blank cell would read as "not part of the grid". Dark mode's muted step is lighter than the free
  // tint, so it drops to 40% there.
  past: "bg-muted dark:bg-muted/40",
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
                ? "bg-night-foreground"
                : "bg-foreground"
              : onNight
                ? "hairline ring-night-foreground"
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

/**
 * One cell of the slot grid: a radio that fills the cell, with the state drawn as a chip inside it.
 * A free cell is a soft tinted chip that takes a stronger edge on hover. The selected range has the Night fill.
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
            "absolute",
            tone === "taken"
              ? "inset-0"
              : range
                ? cn("inset-y-0.5", RANGE[range])
                : "corner-s inset-0.5",
            TONE[tone],
            tone === "free" &&
              "hairline ring-transparent" +
                (live
                  ? "group-hover:ring-success group-focus-visible:ring-success"
                  : "")
          )}
        />
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
          kind === "lane" ? (
            <Swimmers count={info.swimmers ?? 0} />
          ) : (
            <span
              aria-hidden="true"
              className={cn(
                "tabular font-medium opacity-0",
                live &&
                  "group-hover:opacity-100 group-focus-visible:opacity-100"
              )}
            >
              {fmtTime(slot, false)}
            </span>
          )
        ) : info.status === "mine" ? (
          <span className="font-medium text-accent-foreground">Yours</span>
        ) : info.status === "closed" ? (
          <span className="text-muted-foreground">Closed</span>
        ) : null}
      </span>
    </button>
  )
}

/** The phone form of a slot: one chip with the court or lane name. It wraps in a row for each start time. */
export function SlotChip({
  kind,
  row,
  slot,
  info,
  selected,
  disabled,
  onSelect,
  className,
}: {
  kind: "court" | "lane"
  row: GridRow
  slot: number
  info: CellInfo
  selected: boolean
  disabled?: boolean
  onSelect: (row: number, slot: number) => void
  className?: string
}) {
  const free = info.status === "open"
  const live = free && !disabled
  const tone = slotTone(info, selected)
  const sub =
    info.status === "mine"
      ? "Yours"
      : kind === "lane" && free && info.swimmers === 1
        ? "1 of 2"
        : null
  return (
    // biome-ignore lint/a11y/useSemanticElements: slot picker with custom chips, a native radio input cannot hold this content
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={!live || undefined}
      aria-label={slotName(row, slot, info)}
      onClick={() => {
        if (live) onSelect(row.id, slot)
      }}
      className={cn(
        "px-s corner-s relative grid min-h-11 min-w-20 place-items-center overflow-hidden text-body-m font-medium hairline ring-transparent",
        tone === "taken" || tone === "idle"
          ? "text-muted-foreground"
          : tone === "past"
            ? cn(TONE.past, "text-muted-foreground")
            : TONE[tone],
        live && !selected && "hover:ring-success",
        className
      )}
    >
      {tone === "taken" ? (
        <span
          aria-hidden="true"
          className={cn("absolute inset-0", TONE.taken)}
        />
      ) : null}
      <span className="relative flex flex-col items-center">
        <span>{row.label}</span>
        {sub ? <span className="text-body-xs font-regular">{sub}</span> : null}
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
              "grid h-3 w-5 shrink-0 place-items-center overflow-hidden corner-xs",
              TONE[it.tone]
            )}
          >
            {it.swimmers !== undefined ? (
              <Swimmers count={it.swimmers} className="scale-75" />
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
