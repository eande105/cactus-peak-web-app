"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import {
  ArrowLeft,
  ChevronRight,
  type IconComponent,
  X,
} from "@/components/icons"
import { SideSheet } from "@/components/kit/overlays"
import { useMedia } from "@/hooks/use-media"
import { cn } from "@/lib/utils"

/**
 * The app parts. A member page is an app screen, not a website page.
 * The shell draws one white sheet beside the Sand sidebar, and a screen sits directly on that sheet.
 * Use the lightest separation that works: space first, then a hairline rule, then a bordered card.
 * A bordered card is for a block that stands alone (a dashboard widget, a choice, a summary). A collection
 * (a table, a list of bookings) sits on the sheet with rules between its rows.
 */

/**
 * One screen. `title` is the page name in the page bar, `actions` sit at its right end, `tabs` is a tab row under it.
 * `back` links to the parent screen. A page fills the sheet; `narrow` keeps a 720 px measure for forms. `wide` is the
 * same as the default and stays for callers that pass it.
 */
export function AppPage({
  title,
  meta,
  actions,
  tabs,
  back,
  width = "default",
  children,
  className,
}: {
  title: ReactNode
  /** One short fact beside the title: a count, a status pill. */
  meta?: ReactNode
  actions?: ReactNode
  tabs?: ReactNode
  back?: { href: string; label: string }
  width?: "narrow" | "default" | "wide"
  children: ReactNode
  className?: string
}) {
  return (
    // Like shadcn's dashboard-01, a page fills the sheet inside its gutter (`FRAME`); there is no centred column. A
    // narrow page keeps a reading measure for forms and starts at the gutter.
    <div
      className={cn(
        "flex w-full flex-col",
        width === "narrow" && "max-w-[720px]",
        className
      )}
    >
      <header className="gap-s pb-m md:pb-l flex flex-col">
        {back ? (
          <Link
            href={back.href}
            className="gap-xs inline-flex w-fit items-center text-body-m text-muted-foreground hover:text-foreground sm:text-body-s"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
            {back.label}
          </Link>
        ) : null}
        <div className="gap-s flex min-h-9 flex-wrap items-center justify-between">
          <div className="gap-s flex min-w-0 items-center">
            <h1
              id="page-title"
              tabIndex={-1}
              className="font-display-wide truncate text-body-xl font-heavy text-balance outline-none"
            >
              {title}
            </h1>
            {meta}
          </div>
          {actions ? (
            <div className="gap-xs flex flex-wrap items-center">{actions}</div>
          ) : null}
        </div>
        {tabs}
      </header>
      <div className="gap-m md:gap-l flex flex-col">{children}</div>
    </div>
  )
}

/** A tab row of links. The current tab has the Copper underline. Use it for the views of one workspace. */
export function TabLinks({
  items,
  label,
  className,
}: {
  items: { href: string; label: string; count?: number; match?: string }[]
  label: string
  className?: string
}) {
  const path = usePathname()
  return (
    <nav aria-label={label} className={cn("rule-b", className)}>
      <ul className="gap-m flex scrollbar-none overflow-x-auto">
        {items.map((t) => {
          const m = t.match ?? t.href
          const active = path === m || path.startsWith(`${m}/`)
          return (
            <li key={t.href} className="shrink-0">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "gap-xs relative flex h-10 items-center text-body-m font-medium whitespace-nowrap hover:text-foreground sm:text-body-s",
                  active
                    ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary"
                    : "text-muted-foreground"
                )}
              >
                {t.label}
                {t.count !== undefined ? (
                  <span className="tabular px-xs corner-full bg-muted text-body-xs text-muted-foreground">
                    {t.count}
                  </span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** A tab row that changes state on the same screen (Upcoming, Past). */
export function TabButtons<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: { value: T; label: string; count?: number }[]
  value: T
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("gap-m flex rule-b", className)}
    >
      {items.map((t) => {
        const active = t.value === value
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              "gap-xs relative flex h-10 items-center text-body-m font-medium whitespace-nowrap hover:text-foreground sm:text-body-s",
              active
                ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary"
                : "text-muted-foreground"
            )}
          >
            {t.label}
            {t.count !== undefined ? (
              <span className="tabular px-xs corner-full bg-muted text-body-xs text-muted-foreground">
                {t.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

/** A row of filters and view controls above a list or a grid. */
export function Toolbar({
  children,
  end,
  className,
}: {
  children?: ReactNode
  end?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "gap-xs flex flex-wrap items-end justify-between",
        className
      )}
    >
      <div className="gap-xs flex flex-wrap items-end">{children}</div>
      {end ? <div className="gap-xs flex items-center">{end}</div> : null}
    </div>
  )
}

/**
 * A block for one topic. Its head follows the shadcn card: `title` (CardTitle), an optional one-line `description`
 * under it (CardDescription), and `action` in the top-right slot (CardAction) for the one control that acts on the
 * block, such as a view filter. A link to the full list goes in `footer`.
 * - `default`: a raised card on the sheet (`raised`: the card fill and a soft ring). Use it for a block that stands
 *   alone: a dashboard widget, a summary, a form group. Its footer is a muted band, as in the shadcn card.
 * - `bare`: no border and no padding. Use it for a collection that sits on the sheet: a table, a list of rows.
 * - `plain`: a recessed well for secondary content: a rule, a note.
 * - `night`: the one dark block a screen may have.
 * `flush` removes the body padding so rows or a table can run to the card edge.
 * `display` sets the title in the display face, one step larger, with the header's top inset to match: the card
 * header of a dashboard such as Home. Without it the title stays a small heavy label.
 */
export function Card({
  title,
  description,
  action,
  footer,
  flush,
  tone = "default",
  display,
  as: T = "section",
  children,
  className,
  id,
}: {
  title?: ReactNode
  /** One quiet line under the title: a count, a scope. */
  description?: ReactNode
  /** Not drawn. Card heads are text only. The prop stays for callers that pass it. */
  icon?: IconComponent
  action?: ReactNode
  footer?: ReactNode
  flush?: boolean
  display?: boolean
  tone?: "default" | "bare" | "night" | "plain"
  as?: "section" | "div" | "aside"
  children?: ReactNode
  className?: string
  id?: string
}) {
  const bare = tone === "bare"
  const pad = bare ? "" : "px-m"
  return (
    <T
      id={id}
      className={cn(
        "flex min-w-0 flex-col",
        tone === "night"
          ? "corner-m bg-night text-night-foreground"
          : tone === "plain"
            ? "corner-m bg-muted/50"
            : bare
              ? ""
              : "corner-m raised",
        className
      )}
    >
      {title || action ? (
        // The title and description wrap. When the action does not fit beside them, it moves to its own line.
        <div
          className={cn(
            "gap-x-s gap-y-xs flex min-h-11 flex-wrap items-center justify-between",
            pad,
            bare
              ? "pb-xs"
              : display
                ? "pt-m pb-xs"
                : description
                  ? "py-s"
                  : "pt-xs"
          )}
        >
          <div className="min-w-0 flex-1 basis-40">
            <h2
              className={cn(
                "font-heavy text-pretty",
                display
                  ? "font-display-wide text-body-l"
                  : "text-body-m sm:text-body-s"
              )}
            >
              {title}
            </h2>
            {description ? (
              <p className="text-body-m text-pretty text-muted-foreground sm:text-body-s">
                {description}
              </p>
            ) : null}
          </div>
          {action ? (
            <div className="gap-xs flex max-w-full shrink-0 items-center">
              {action}
            </div>
          ) : null}
        </div>
      ) : null}
      {children !== undefined ? (
        <div
          className={cn(
            "min-w-0 flex-1",
            flush || bare ? "" : "px-m pb-m",
            !flush && !bare && (title || action ? "pt-xs" : "pt-m"),
            bare && "[&>ul>li]:px-zero",
            bare && (title || action) && "rule-t"
          )}
        >
          {children}
        </div>
      ) : null}
      {footer ? (
        <div
          className={cn(
            "gap-xs py-s flex items-center justify-end rule-t",
            !bare && tone !== "night" && "corner-b-m bg-muted/50",
            pad
          )}
        >
          {footer}
        </div>
      ) : null}
    </T>
  )
}

/** A small link for a card head: "View all". */
export function CardLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className="text-body-m font-medium text-muted-foreground hover:text-foreground sm:text-body-s"
    >
      {children}
    </Link>
  )
}

/** The link to the full list or page, in a card's footer band (shadcn CardFooter): "All bookings ›". */
export function CardFooterLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className="gap-xxs inline-flex items-center text-body-m font-medium text-muted-foreground hover:text-foreground sm:text-body-s"
    >
      {children}
      <ChevronRight className="size-4" aria-hidden="true" />
    </Link>
  )
}

/**
 * A row of numbers that belong together. One bordered block with hairlines between the tiles, not a card for each
 * number. The columns follow the width of the block, not the viewport.
 */
export function Stats({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("@container", className)}>
      <dl
        className={cn(
          "grid grid-cols-1 gap-px overflow-hidden shadow-s hairline ring-foreground/10",
          "corner-m",
          "bg-border",
          "@md:grid-cols-2 @3xl:grid-flow-col @3xl:grid-cols-[repeat(auto-fit,minmax(0,1fr))]",
          // In two columns, an odd count would leave an empty cell that shows the divider fill.
          "@md:@max-3xl:[&>*:last-child:nth-child(odd)]:col-span-2"
        )}
      >
        {children}
      </dl>
    </div>
  )
}

/** One number with its label: visits this week, passes left, the next charge. Put it inside `Stats`. */
export function Stat({
  label,
  value,
  hint,
  actions,
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  /** Small buttons for the thing the tile shows, in one row under the text. */
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "gap-xxs p-m flex min-w-0 flex-col bg-card bg-linear-to-t from-primary/5 to-card dark:from-card",
        className
      )}
    >
      <dt className="truncate text-body-m text-muted-foreground sm:text-body-s">
        {label}
      </dt>
      <dd className="tabular font-display-wide truncate text-body-xl font-heavy">
        {value}
      </dd>
      {hint ? (
        <dd className="truncate text-body-m text-muted-foreground sm:text-body-s">
          {hint}
        </dd>
      ) : null}
      {actions ? (
        <dd className="gap-xs pt-xs flex flex-wrap items-center">{actions}</dd>
      ) : null}
    </div>
  )
}

/** The list inside a `flush` card. Rows are separated by hairlines. */
export function Rows({
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
      className={cn("flex flex-col [&>li+li]:rule-t", className)}
    >
      {children}
    </ul>
  )
}

/**
 * One row: an optional lead (a time, an avatar, an icon), the name with one line under it, and status or actions
 * at the right. `href` or `onSelect` makes the row a control. `selected` marks the row whose detail panel is open with
 * the Copper tint and the Copper marker on its leading edge.
 */
export function Row({
  lead,
  title,
  line,
  end,
  href,
  onSelect,
  selected,
  className,
}: {
  lead?: ReactNode
  title: ReactNode
  line?: ReactNode
  end?: ReactNode
  href?: string
  onSelect?: () => void
  selected?: boolean
  className?: string
}) {
  const main = (
    <>
      {lead !== undefined ? (
        <span className="tabular w-18 shrink-0 text-body-m font-medium sm:w-16 sm:text-body-s">
          {lead}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        {line ? (
          <span className="block truncate text-muted-foreground">{line}</span>
        ) : null}
      </span>
    </>
  )
  const hit =
    "gap-s flex min-w-0 flex-1 items-center text-left outline-none focus-visible:underline"
  return (
    <li
      className={cn(
        "gap-s relative flex min-h-14 items-center",
        "px-m py-xs",
        "text-body-m",
        "sm:text-body-s",
        (href || onSelect) && "hover:bg-muted/40",
        selected && "bg-accent rule-l rule-primary",
        className
      )}
    >
      {href ? (
        <Link href={href} scroll={false} className={hit}>
          {main}
        </Link>
      ) : onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className={hit}
        >
          {main}
        </button>
      ) : (
        <div className={hit}>{main}</div>
      )}
      {end ? (
        <span className="gap-xs flex shrink-0 items-center">{end}</span>
      ) : null}
    </li>
  )
}

/**
 * Label and value pairs. The label is the strong side and the value is the quiet side, so a link or a pill in the
 * value stands out. Use it inside a card or a detail panel.
 */
export function Facts({
  items,
  className,
}: {
  items: { label: string; value: ReactNode; hint?: ReactNode }[]
  className?: string
}) {
  return (
    <dl
      className={cn(
        "flex flex-col text-body-m sm:text-body-s [&>div+div]:rule-t",
        className
      )}
    >
      {items.map((it) => (
        <div
          key={it.label}
          className="gap-m py-s flex items-baseline justify-between"
        >
          <dt className="shrink-0 font-medium">{it.label}</dt>
          <dd className="tabular min-w-0 text-right text-muted-foreground">
            {it.value}
            {it.hint ? <span className="block">{it.hint}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * A workspace with a detail panel: the list or grid at the left, the panel at the right from 1024 px.
 * Below 1024 px the panel is a sheet that opens when `open` is true. `empty` shows in the panel column on desktop
 * when nothing is selected.
 */
export function Split({
  children,
  panel,
  open,
  onClose,
  label,
  empty,
  className,
}: {
  children: ReactNode
  panel: ReactNode
  open: boolean
  onClose: () => void
  label: string
  empty?: ReactNode
  className?: string
}) {
  const wide = useMedia("(min-width: 1024px)")
  return (
    <div
      className={cn(
        "gap-l grid items-start lg:grid-cols-[minmax(0,1fr)_22.5rem]",
        className
      )}
    >
      <div className="gap-l flex min-w-0 flex-col">{children}</div>
      {wide ? (
        <aside
          aria-label={label}
          className="sticky top-[calc(var(--bar-h)+var(--space-m))] max-h-[calc(100dvh-var(--bar-h)-2*var(--space-m))] overflow-y-auto corner-m raised"
        >
          {open ? panel : empty}
        </aside>
      ) : (
        <SideSheet
          open={open}
          onOpenChange={(o) => !o && onClose()}
          label={label}
        >
          {panel}
        </SideSheet>
      )}
    </div>
  )
}

/** The content of a detail panel: a head with a close button, the body, and a footer for the actions. */
export function Panel({
  title,
  line,
  onClose,
  footer,
  children,
}: {
  title: ReactNode
  line?: ReactNode
  onClose?: () => void
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="gap-s p-m flex items-start justify-between rule-b">
        <div className="min-w-0">
          <h2 className="text-body-m font-heavy text-balance">{title}</h2>
          {line ? (
            <p className="text-body-m text-muted-foreground sm:text-body-s">
              {line}
            </p>
          ) : null}
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className={cn(
              "grid size-8 shrink-0 place-items-center",
              "-mt-xxs -mr-xxs corner-s",
              "hover:bg-muted"
            )}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className="gap-m p-m flex flex-1 flex-col text-body-m sm:text-body-s">
        {children}
      </div>
      {footer ? (
        <div className="gap-xs p-m sticky bottom-0 flex flex-col bg-card rule-t">
          {footer}
        </div>
      ) : null}
    </div>
  )
}

/** What the panel column shows when nothing is selected. */
export function PanelEmpty({
  icon: Icon,
  children,
}: {
  icon?: IconComponent
  children: ReactNode
}) {
  return (
    <div className="gap-s p-xl flex min-h-60 flex-col items-center justify-center text-center text-body-m text-pretty text-muted-foreground sm:text-body-s">
      {Icon ? <Icon className="size-4 shrink-0" aria-hidden="true" /> : null}
      <p className="max-w-[24ch]">{children}</p>
    </div>
  )
}

/**
 * A task: one job with steps (freeze, change plan, add a member, book a coach). It is a focused card with the step
 * count in its head, the step content, and the actions in its footer. `aside` is a summary card beside it.
 */
export function Task({
  title,
  step,
  of,
  close,
  aside,
  footer,
  children,
}: {
  title: string
  step?: number
  of?: number
  close: { href: string; label: string }
  aside?: ReactNode
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <div
      // A flow fills the sheet inside its gutter, like every page (shadcn dashboard-01). The aside keeps a fixed column.
      className={cn(
        "gap-m grid w-full items-start",
        aside && "lg:grid-cols-[minmax(0,1fr)_20rem]"
      )}
    >
      <section className="flex min-w-0 flex-col corner-m raised">
        <header className="gap-s p-m flex items-center justify-between rule-b">
          <div className="min-w-0">
            <h1
              id="page-title"
              tabIndex={-1}
              className="text-body-m font-heavy outline-none"
            >
              {title}
            </h1>
            {step && of ? (
              <p
                role="status"
                className="text-body-m text-muted-foreground sm:text-body-s"
              >
                Step {step} of {of}
              </p>
            ) : null}
          </div>
          <Link
            href={close.href}
            aria-label={`Close and go back to ${close.label}`}
            className="corner-s grid size-8 shrink-0 place-items-center hover:bg-muted"
          >
            <X className="size-4" aria-hidden="true" />
          </Link>
        </header>
        {step && of ? (
          <div className="h-0.5 bg-muted" aria-hidden="true">
            <div
              className="h-full w-(--step) bg-primary transition-[width] motion-reduce:transition-none"
              style={
                { "--step": `${(step / of) * 100}%` } as React.CSSProperties
              }
            />
          </div>
        ) : null}
        <div className="gap-l p-m flex flex-col text-body-m sm:text-body-s">
          {children}
        </div>
        {footer ? (
          <footer className="gap-xs p-m flex flex-wrap items-center justify-end rule-t">
            {footer}
          </footer>
        ) : null}
      </section>
      {aside}
    </div>
  )
}

/** A field group inside a card or a task: a small label, then the controls. */
export function Group({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("gap-xs flex flex-col", className)}>
      <div>
        <h3 className="text-body-m font-heavy sm:text-body-s">{label}</h3>
        {hint ? (
          <p className="text-body-m text-muted-foreground sm:text-body-s">
            {hint}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  )
}
