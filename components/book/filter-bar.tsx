"use client"
import type { ReactNode } from "react"
import { BookTypeChip } from "@/components/book/book-tabs"
import { Collapsible } from "@/components/graphical"
import { ChevronDown, ListFilter } from "@/components/icons"
import { Panel } from "@/components/kit/app"
import { SideSheet } from "@/components/kit/overlays"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * The filter controls every Book tab shares, after Book › Classes, so each tab reads the same way: a club to book at,
 * the one or two choices a member changes every visit, and the rest one step away in a drawer.
 * - `FilterBar`: the toolbar in a faint well. It reads its own width (a container query), because some tabs share the
 *   row with a side panel.
 * - `FilterSheet`: the drawer, with a "Show …" footer that names what the filters leave.
 * - `FilterGroup`: one titled, collapsible group inside the drawer.
 */

/** The class names that let a select take the free width of the narrow row and truncate its value. */
export const FILL_SELECT =
  "min-w-0 flex-1 [&_.themed-select]:w-full [&_.themed-select]:min-w-0 [&_.themed-select>span:first-child]:min-w-0 [&_.themed-select>span:first-child]:truncate [&_.themed-select>span:first-child]:text-left"

/**
 * One filter chip, with one on and off style on every Book tab. Off is a quiet outline chip; on is filled with the
 * primary accent and its on-accent text. `aria-pressed` carries the state for assistive technology.
 */
export function FilterChip({
  on,
  onClick,
  disabled,
  children,
  className,
}: {
  on: boolean
  onClick: () => void
  disabled?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "px-m inline-flex min-h-9 shrink-0 items-center justify-center corner-full text-body-s font-medium whitespace-nowrap disabled:opacity-50 max-md:min-h-11",
        on
          ? "bg-primary font-heavy text-primary-foreground"
          : "bg-transparent text-foreground hairline ring-border hover:bg-muted/50",
        className
      )}
    >
      {children}
    </button>
  )
}

/** A single choice shown as a row of chips: the chosen one is on. Pressing the chosen chip keeps it on. */
export function ChipGroup<T extends string | number>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  className?: string
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a labelled row of toggle chips; a fieldset would add a legend and a border
    <div
      role="group"
      aria-label={label}
      className={cn("gap-xs flex flex-wrap", className)}
    >
      {options.map((o) => (
        <FilterChip
          key={String(o.value)}
          on={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </FilterChip>
      ))}
    </div>
  )
}

/**
 * The toolbar. Wide (@xl): the club, the tab's quick filters (`quick`), "More filters" with the number of filters that
 * only the drawer shows (`more`), and Clear while any filter is on (`active`). Narrow: one row that never wraps, the club
 * and one Filters button with the number of filters on besides the club (`count`); the quick filters are in the
 * drawer there. A tab without a drawer leaves out `onFilters`, so its narrow row is the club alone.
 * `club` is optional: the club is chosen once in the Book header (`ClubSwitcher`), so a tab leaves it out.
 */
export function FilterBar({
  club,
  quick,
  onFilters,
  count = 0,
  more = 0,
  active,
  onClear,
  wideSheet = true,
  day,
}: {
  club?: (className: string) => ReactNode
  quick?: ReactNode
  onFilters?: () => void
  count?: number
  more?: number
  active?: boolean
  onClear?: () => void
  /** False when every filter is in `quick`: the wide row then has no "More filters", only the narrow row opens the drawer. */
  wideSheet?: boolean
  /**
   * The day picker, as a DayStrip stepper. Wide, it ends the toolbar row at the far right after a rule, sized to its
   * content (`fit`); narrow, it is its own row under the toolbar (`fill`).
   */
  day?: (stepper: "fit" | "fill") => ReactNode
}) {
  return (
    <div className="@container">
      {/* Narrow: the type chip (phone), the club and the Filters button, in one row that scrolls sideways. Without a type chip
          (lg and up) and with neither, the well is hidden, so there is no empty bar above the day picker. */}
      <div
        className={cn(
          "gap-xs p-xs flex scrollbar-none items-center overflow-x-auto corner-m bg-muted/50 @xl:hidden",
          !(club || onFilters) && "lg:hidden"
        )}
      >
        <BookTypeChip />
        {club?.(FILL_SELECT)}
        {onFilters ? (
          <Button
            variant="outline"
            className="shrink-0 max-md:min-h-11"
            onClick={onFilters}
          >
            <ListFilter aria-hidden="true" data-icon="inline-start" />
            Filters
            {count > 0 ? (
              <span className="tabular px-xs min-w-5 corner-full bg-primary text-center text-body-xs font-medium text-primary-foreground">
                {count}
                <span className="sr-only"> on</span>
              </span>
            ) : null}
          </Button>
        ) : null}
      </div>

      {/* Wide: the club, the quick filters, the drawer and the reset. */}
      <div className="gap-xs p-xs flex flex-wrap items-center corner-m bg-muted/50 @max-xl:hidden">
        <BookTypeChip />
        {club?.("min-w-0 flex-none")}
        {quick}
        {onFilters && wideSheet ? (
          <Button variant="outline" onClick={onFilters}>
            <ListFilter aria-hidden="true" data-icon="inline-start" />
            More filters{more > 0 ? ` (${more})` : ""}
          </Button>
        ) : null}
        {active && onClear ? (
          <Button variant="ghost" onClick={onClear}>
            Clear
          </Button>
        ) : null}
        {day ? (
          // The date is a different kind of choice from the filters, so it sits apart: at the far right, after a rule.
          <div className="gap-s ml-auto flex items-center">
            <span aria-hidden="true" className="h-6 w-px bg-foreground/10" />
            {day("fit")}
          </div>
        ) : null}
      </div>
      {day ? <div className="pt-s @xl:hidden">{day("fill")}</div> : null}
    </div>
  )
}

/** The filter drawer: a side sheet from 768px, a bottom sheet below, with the "Show …" button in its footer. */
export function FilterSheet({
  open,
  onOpenChange,
  label,
  show,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The sheet's accessible name: "Class filters", "Kids club filters". */
  label: string
  /** The footer button: "Show 8 classes", "Show 6 blocks". */
  show: string
  children: ReactNode
}) {
  return (
    <SideSheet open={open} onOpenChange={onOpenChange} label={label}>
      <Panel
        title="Filters"
        onClose={() => onOpenChange(false)}
        footer={
          <Button size="sm" onClick={() => onOpenChange(false)}>
            {show}
          </Button>
        }
      >
        {children}
      </Panel>
    </SideSheet>
  )
}

/** One group in the drawer: a heavy title that folds the group, then its choices. */
export function FilterGroup({
  title,
  children,
  defaultOpen = true,
  className,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}) {
  return (
    <Collapsible.Root
      defaultOpen={defaultOpen}
      className={cn("py-s first:pt-zero rule-t first:shadow-none", className)}
    >
      <Collapsible.Trigger
        className={cn(
          "group flex min-h-9 w-full items-center justify-between",
          "!p-zero",
          "text-body-m font-heavy",
          "!bg-transparent !shadow-none",
          "sm:text-body-s"
        )}
      >
        {title}
        <ChevronDown
          className="size-4 shrink-0 transition-transform group-data-[panel-open]:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </Collapsible.Trigger>
      <Collapsible.Content className="pt-xs">
        <div className="gap-xs flex flex-col">{children}</div>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}
