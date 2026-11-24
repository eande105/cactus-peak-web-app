"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { ACCOUNT_GROUPS, ACCOUNT_NAV, canSee } from "@/components/app/nav"
import { useApp } from "@/components/app/use-app"
import { ArrowLeft, ChevronRight, type IconComponent } from "@/components/icons"
import { AppPage } from "@/components/kit/app"
import { cn } from "@/lib/utils"

/**
 * The frame of every page in the Account area (the 11 pages of `ACCOUNT_NAV`).
 * Requires: the current path is in `ACCOUNT_NAV`, or `title` is given (a task page such as an invoice).
 * Ensures: the title and its `line` come from `ACCOUNT_NAV`, so a label is written once. The content is one column:
 * `form` is near 720 px, and from xl near 1000 px so a settings section can put its heading beside its card; `wide`
 * is near 960 px for Membership and Billing. Sections stack with the `xl` gap. `AppPage` keeps the `#page-title`
 * focus. Below lg the shell puts `AccountBack` above the page (`AccountNav` in `components/app/shell.tsx`).
 */
export function AccountScreen({
  title,
  meta,
  actions,
  width = "form",
  children,
}: {
  title?: string
  /** One short fact beside the title: a role, a status pill. */
  meta?: ReactNode
  actions?: ReactNode
  width?: "form" | "wide"
  children: ReactNode
}) {
  const path = usePathname()
  const item = ACCOUNT_NAV.find((n) => n.href === path)
  return (
    <AppPage
      title={title ?? item?.label ?? "Account"}
      meta={meta}
      actions={actions}
      className={cn(
        "mx-zero",
        width === "form" ? "max-w-[720px] xl:max-w-[1000px]" : "max-w-[960px]"
      )}
    >
      <div className="gap-xl flex flex-col">
        {item?.line ? (
          <p className="-mt-s text-body-s text-pretty text-muted-foreground">
            {item.line}
          </p>
        ) : null}
        {children}
      </div>
    </AppPage>
  )
}

/** An icon in a small tile, the lead of a menu row, a setting row or a summary card. */
export function IconTile({
  icon: Icon,
  tone = "muted",
  className,
}: {
  icon: IconComponent
  tone?: "muted" | "accent" | "danger"
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "corner-s grid size-8 shrink-0 place-items-center",
        tone === "accent"
          ? "bg-accent text-primary"
          : tone === "danger"
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-foreground",
        className
      )}
    >
      <Icon className="size-4" />
    </span>
  )
}

/**
 * Below lg, on Overview: the Account menu as a grouped list (the iOS Settings pattern), one row per page the member
 * may open (`canSee`), each an icon tile, the label and a chevron. A group with no visible page is left out; Overview
 * itself is left out. Hidden from lg, where the side menu shows the same pages.
 */
export function AccountMenuList({ className }: { className?: string }) {
  const { me } = useApp()
  const items = ACCOUNT_NAV.filter(
    (n) => n.href !== "/account" && canSee(me, n.href)
  )
  return (
    <nav
      aria-label="Account"
      className={cn("gap-l flex flex-col lg:hidden", className)}
    >
      {ACCOUNT_GROUPS.map((g) => {
        const list = items.filter((n) => n.group === g)
        if (!list.length) return null
        return (
          <section key={g} className="gap-xs flex flex-col">
            <h2 className="text-body-s font-heavy">{g}</h2>
            <ul className="flex flex-col corner-m raised [&>li+li]:rule-t">
              {list.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className="gap-s px-m flex min-h-14 items-center text-body-m outline-none hover:bg-muted/40 focus-visible:bg-muted/60 sm:text-body-s"
                  >
                    <IconTile icon={n.icon} />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {n.label}
                    </span>
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </nav>
  )
}

/** Below lg, on an Account page other than Overview: a back link to Overview. It replaces the scrolling link strip. */
export function AccountBack() {
  return (
    <Link
      href="/account"
      className="gap-xs inline-flex w-fit items-center text-body-m text-muted-foreground hover:text-foreground sm:text-body-s lg:hidden"
    >
      <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
      Account
    </Link>
  )
}

/**
 * One headline fact at the top of Membership, Billing, Guest passes or Overview (Plan, Next bill, Payment method):
 * an icon tile and the label, the value in the large type, one optional fact under it, and at most one action.
 * `href` makes the whole card a link (Overview); then `action` must be empty.
 */
export function SummaryCard({
  icon,
  label,
  value,
  meta,
  action,
  href,
  tone = "default",
  className,
}: {
  icon: IconComponent
  label: string
  value: ReactNode
  meta?: ReactNode
  action?: ReactNode
  href?: string
  /** "warning": a fact that needs the member (a card that expires soon). Pair it with words in `meta`. */
  tone?: "default" | "warning"
  className?: string
}) {
  const body = (
    <>
      <span className="gap-xs flex items-center">
        <IconTile icon={icon} tone="accent" className="size-7" />
        <span className="min-w-0 flex-1 text-body-s leading-tight font-medium text-pretty text-muted-foreground">
          {label}
        </span>
        {href ? (
          <ChevronRight
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        ) : null}
      </span>
      <span className="flex flex-col">
        <span className="font-display-wide tabular text-body-l leading-tight font-heavy text-balance sm:text-body-xl">
          {value}
        </span>
        {meta ? (
          <span
            className={cn(
              "tabular text-body-s",
              tone === "warning" ? "text-warning" : "text-muted-foreground"
            )}
          >
            {meta}
          </span>
        ) : null}
      </span>
    </>
  )
  const frame = cn("gap-s p-m flex min-w-0 flex-col corner-m raised", className)
  if (href)
    return (
      <Link
        href={href}
        className={cn(
          frame,
          "outline-none hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-ring"
        )}
      >
        {body}
      </Link>
    )
  return (
    <div className={frame}>
      {body}
      {action ? (
        <div className="gap-xs mt-auto flex flex-wrap items-center">
          {action}
        </div>
      ) : null}
    </div>
  )
}
