"use client"
import type { CSSProperties, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Parts that more than one member screen uses (clubs, progress, household). They sit on the white sheet and follow
 * the same rules as components/kit/app.tsx: no margins of their own, and every part takes `className`.
 */

/** A header cell of a bare table: sentence case, one line, quiet. `end` is for a number column. */
export function Th({
  children,
  end,
  className,
}: {
  children?: ReactNode
  end?: boolean
  className?: string
}) {
  return (
    <th
      scope="col"
      className={cn(
        // text-body-xs: a table header, the one place the 12 px size is allowed.
        "h-9 text-body-xs font-medium whitespace-nowrap text-muted-foreground",
        end ? "text-right" : "text-left",
        className
      )}
    >
      {children}
    </th>
  )
}

/** A bare two-column table: a name and its number. It is the text form of a small chart. */
export function PairTable({
  caption,
  head,
  rows,
  className,
}: {
  caption: string
  head: [string, string]
  rows: { key: string | number; label: ReactNode; value: ReactNode }[]
  className?: string
}) {
  return (
    <table className={cn("w-full text-body-m sm:text-body-s", className)}>
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="rule-b">
          <Th>{head[0]}</Th>
          <Th end>{head[1]}</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="[&+tr]:rule-t">
            <th scope="row" className="py-xs text-left font-regular">
              {r.label}
            </th>
            <td className="tabular py-xs text-right font-medium">{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** The switch between a chart and its table. The table is the form a screen reader and a keyboard can read. */
export function ViewToggle({
  table,
  onChange,
  className,
}: {
  table: boolean
  onChange: (table: boolean) => void
  className?: string
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-pressed={table}
      onClick={() => onChange(!table)}
      className={className}
    >
      {table ? "Show as chart" : "Show as table"}
    </Button>
  )
}

/**
 * Facts as a grid of label-over-value pairs, for the "Details" block of a detail screen.
 * The columns follow the width of the block: one, then two, then three.
 */
export function FactGrid({
  items,
  className,
}: {
  items: { label: string; value: ReactNode; hint?: ReactNode }[]
  className?: string
}) {
  return (
    <div className={cn("@container", className)}>
      <dl className="gap-x-l gap-y-m grid grid-cols-1 text-body-m sm:text-body-s @md:grid-cols-2 @2xl:grid-cols-3">
        {items.map((it) => (
          <div key={it.label} className="gap-xxs flex min-w-0 flex-col">
            <dt className="font-medium">{it.label}</dt>
            <dd className="tabular text-pretty text-muted-foreground">
              {it.value}
              {it.hint ? <span className="block">{it.hint}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/**
 * A ranked list: each row has its label and number, and under them a solid bar on a muted track, in proportion to
 * its number. The text sits on the card, never on the bar, so it keeps full contrast. The bar is Saguaro Night (a light
 * neutral in dark mode, where Night is under 3:1 on the card) unless
 * `barClassName` gives another fill (a category row passes `bg-cat`). `max` is the number a full bar stands for.
 */
export function BarList({
  items,
  max,
  label,
  className,
}: {
  items: {
    key: string | number
    label: ReactNode
    value: number
    /** A class for the row: a category class (`cat-strength`) sets the colour that `barClassName` can use. */
    className?: string
    /** A class for the bar, to replace the Saguaro Night fill. */
    barClassName?: string
  }[]
  max: number
  label: string
  className?: string
}) {
  return (
    <ul
      aria-label={label}
      className={cn(
        "gap-s flex flex-col text-body-m sm:text-body-s",
        className
      )}
    >
      {items.map((it) => (
        <li key={it.key} className={cn("gap-xxs flex flex-col", it.className)}>
          <div className="gap-s flex items-baseline justify-between">
            <span className="min-w-0 truncate">{it.label}</span>
            <span className="tabular shrink-0 font-medium">{it.value}</span>
          </div>
          <div
            aria-hidden="true"
            className="h-2 overflow-hidden corner-full bg-muted"
          >
            <div
              className={cn(
                "h-full w-(--bar) corner-full",
                it.barClassName ?? "bg-night dark:bg-neutral-8"
              )}
              style={
                {
                  "--bar": `${Math.max(0, Math.min(1, it.value / Math.max(1, max))) * 100}%`,
                } as CSSProperties
              }
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
