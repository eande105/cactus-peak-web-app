"use client"
import Link from "next/link"
import type { ReactNode } from "react"
import { CategoryTile } from "@/components/brand/graphics"
import { fmtTime, MONTHS, parts } from "@/lib/time"
import type { CategoryId } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * The parts the booking screens share: a list that sits on the sheet, its row, the time column and the date tile.
 * They follow the kit rules: no margin on the top element, and `className` merges last.
 */

/** A status pill with a leading icon needs less padding on the icon side. Pass it as the pill's `className`. */
export const PILL_ICON = "pl-xs"

/** The date as a small tile: the day number over the month. `big` is for the one block that leads a screen. */
export function DateTile({
  at,
  big,
  className,
}: {
  at: number
  big?: boolean
  className?: string
}) {
  const p = parts(at)
  return (
    <div
      aria-hidden="true"
      className={cn(
        "tabular corner-s flex shrink-0 flex-col items-center justify-center bg-muted/60 text-center",
        big ? "size-16" : "size-12",
        className
      )}
    >
      <p
        className={cn(
          "font-heavy",
          big ? "font-display-wide text-body-xl" : "text-body-m"
        )}
      >
        {p.d}
      </p>
      <p className="text-body-xs font-medium text-muted-foreground">
        {MONTHS[p.m]}
      </p>
    </div>
  )
}

/**
 * The category tile at the start of a booking row: the same object and colour the schedule shows for the class,
 * court, lane or kids club. Rows read by colour and object as well as by name. It hides on a phone, where the row
 * needs its width for the name.
 */
export function CategoryMark({
  category,
  className,
}: {
  category: CategoryId
  className?: string
}) {
  return (
    <CategoryTile
      category={category}
      className={cn("size-9 shrink-0 max-sm:hidden", className)}
      aria-hidden="true"
    />
  )
}

/** The time column of a row: the start time, and one quiet fact under it (the length, the day). */
export function TimeLead({
  start,
  sub,
  className,
}: {
  start: number
  sub?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("tabular whitespace-nowrap", className)}>
      <p className="font-heavy">{fmtTime(start)}</p>
      {sub ? <p className="text-muted-foreground">{sub}</p> : null}
    </div>
  )
}

/**
 * A collection on the sheet: a small heading with one fact at its right, then the rows. There is no card around it.
 * The heading has the same inset as the rows, so the names line up under it.
 */
export function ListSection({
  title,
  end,
  inset = "s",
  children,
  className,
  id,
}: {
  title?: ReactNode
  end?: ReactNode
  inset?: "s" | "m"
  children: ReactNode
  className?: string
  id?: string
}) {
  return (
    <section id={id} className={cn("flex min-w-0 flex-col", className)}>
      {title || end ? (
        <div
          className={cn(
            "gap-s flex min-h-10 items-center justify-between text-body-m sm:text-body-s",
            inset === "m" ? "px-m" : "px-s"
          )}
        >
          <h2 className="min-w-0 truncate font-heavy">{title}</h2>
          {end ? (
            <div className="gap-xs flex shrink-0 items-center text-muted-foreground">
              {end}
            </div>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}

/** The rows of a `ListSection`: a rule above the first row and between the rows. */
export function ListRows({
  children,
  label,
  className,
}: {
  children: ReactNode
  label?: string
  className?: string
}) {
  return (
    <ul
      aria-label={label}
      className={cn(
        "flex flex-col rule-t [&>li+li]:rule-t",
        // A selected first row hides the list's top rule, as a selected row hides the rules beside it (ListRow).
        "[&:has(>li[data-selected]:first-child)]:!shadow-none",
        className
      )}
    >
      {children}
    </ul>
  )
}

/**
 * One row: the lead (a time, a date), an optional mark (the category tile), the strong name with one quiet line,
 * and the status and controls at the right. `href` or `onSelect` makes the whole row the hit area. A control in `end`
 * stays on top of that hit area. `selected` tints the row whose detail panel is open. `quiet` is for a row that is over.
 * `compact` is for a long list a member scans on a phone: below `sm`, the text is one step smaller, the time column
 * and the gaps are narrower, so the name and its facts fit beside the status.
 */
export function ListRow({
  lead,
  mark,
  title,
  sr,
  line,
  end,
  href,
  onSelect,
  selected,
  quiet,
  heading,
  inset = "s",
  compact,
  className,
  rowId,
}: {
  /** The booking id, so a link can open this row (`?open=`). */
  rowId?: string
  lead?: ReactNode
  mark?: ReactNode
  title: ReactNode
  /** More words for a screen reader, after the name. */
  sr?: string
  line?: ReactNode
  end?: ReactNode
  href?: string
  /** Gets the click, so a caller can anchor a popover to the row (`event.currentTarget.closest("li")`). */
  onSelect?: (event: React.MouseEvent<HTMLButtonElement>) => void
  selected?: boolean
  quiet?: boolean
  /** The name is an `h3`. Use it in a long list that a member scans by heading. */
  heading?: boolean
  inset?: "s" | "m"
  compact?: boolean
  className?: string
}) {
  const Name = heading ? "h3" : "p"
  const hit =
    "outline-none after:absolute after:inset-0 focus-visible:underline"
  const name = (
    <>
      {title}
      {sr ? <span className="sr-only">{sr}</span> : null}
    </>
  )
  return (
    <li
      data-selected={selected || undefined}
      data-row-id={rowId}
      className={cn(
        "gap-s relative flex min-h-16 items-center",
        "py-s",
        "text-body-m",
        "sm:text-body-s",
        inset === "m" ? "px-m" : "px-s",
        compact &&
          "max-sm:gap-xs max-sm:py-xs max-sm:min-h-14 max-sm:text-body-s",
        (href || onSelect) && !selected && "hover:bg-muted/40",
        // The selection is a rounded tile inset from the row's edges, not an edge or a full-bleed fill: a row in a
        // rounded card would carry a fill into the card's corners and an edge that meets no other edge.
        // - The inset is the same 4 px (`--space-xxs`) on all four sides. With the tile's `corner-s` (10 px) it is
        //   concentric with a card's `corner-m` (14 px) when the row is the last one in the card.
        // - The hairlines above and below the row are hidden, so a rule does not run 4 px from the tile.
        // - `isolate` keeps the tile behind the row's content and above the card.
        selected &&
          "before:corner-s isolate !shadow-none before:absolute before:inset-1 before:-z-10 before:bg-accent [&+li]:!shadow-none",
        className
      )}
    >
      {lead !== undefined ? (
        <div className={cn("w-18 shrink-0 sm:w-16", compact && "max-sm:w-15")}>
          {lead}
        </div>
      ) : null}
      {mark}
      <div className="min-w-0 flex-1">
        <Name
          className={cn(
            "truncate font-body font-heavy",
            quiet && "font-medium text-muted-foreground"
          )}
        >
          {href ? (
            <Link href={href} scroll={false} className={hit}>
              {name}
            </Link>
          ) : onSelect ? (
            <button
              type="button"
              onClick={onSelect}
              aria-pressed={selected}
              className={cn(hit, "text-left")}
            >
              {name}
            </button>
          ) : (
            name
          )}
        </Name>
        {line ? <p className="truncate text-muted-foreground">{line}</p> : null}
      </div>
      {end ? (
        <div className="gap-s pointer-events-none relative z-10 flex shrink-0 items-center [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
          {end}
        </div>
      ) : null}
    </li>
  )
}

/** The line under a list: how much of it shows. It is centred, like the count under a table. */
export function ListCount({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        "tabular text-center text-body-m text-muted-foreground sm:text-body-s",
        className
      )}
    >
      {children}
    </p>
  )
}
