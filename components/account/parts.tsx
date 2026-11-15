"use client"
import type { ReactNode } from "react"
import type { IconComponent } from "@/components/icons"
import { StatusPill } from "@/components/kit/ui"
import { cn } from "@/lib/utils"

/**
 * One topic on an Account screen: a heading, one optional line, one optional action at the right, the content, then
 * an optional footer for links.
 * It sits directly on the sheet. Space separates one section from the next.
 */
export function Section({
  id,
  title,
  line,
  action,
  footer,
  children,
  className,
}: {
  id?: string
  title: ReactNode
  line?: ReactNode
  action?: ReactNode
  /** Links to a full list or another page, under the content. */
  footer?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <section id={id} className={cn("gap-s flex min-w-0 flex-col", className)}>
      <div className="gap-x-m gap-y-xs flex flex-wrap items-end justify-between">
        <div className="min-w-0 flex-1 basis-48">
          <h2 className="text-body-m font-heavy sm:text-body-s">{title}</h2>
          {line ? (
            <p className="text-body-m text-pretty text-muted-foreground sm:text-body-s">
              {line}
            </p>
          ) : null}
        </div>
        {action ? (
          <div className="gap-xs flex shrink-0 items-center">{action}</div>
        ) : null}
      </div>
      {children}
      {footer ? (
        <div className="gap-x-m gap-y-xs flex flex-wrap items-center">
          {footer}
        </div>
      ) : null}
    </section>
  )
}

/**
 * Facts that read as one summary: a row of columns, each a label over its value. The columns follow the width of
 * the block. Use `Facts` from the kit for a list of label and value pairs.
 */
export function FactRow({
  items,
  className,
}: {
  items: { label: string; value: ReactNode }[]
  className?: string
}) {
  return (
    <div className={cn("@container", className)}>
      <dl className="gap-x-l gap-y-m grid grid-cols-2 text-body-m sm:text-body-s @lg:grid-cols-3 @3xl:auto-cols-fr @3xl:grid-flow-col @3xl:grid-cols-none">
        {items.map((it) => (
          <div key={it.label} className="gap-xxs flex min-w-0 flex-col">
            <dt className="text-muted-foreground">{it.label}</dt>
            <dd className="tabular font-medium">{it.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** A status pill with a leading icon. The icon side has the smaller padding, equal to the vertical padding. */
export function IconPill({
  icon,
  tone,
  children,
  className,
}: {
  icon: IconComponent
  tone?: "neutral" | "success" | "info" | "warning" | "danger"
  children: ReactNode
  className?: string
}) {
  return (
    <StatusPill tone={tone} icon={icon} className={cn("pl-xxs", className)}>
      {children}
    </StatusPill>
  )
}

export const capital = (x: string) => x[0].toUpperCase() + x.slice(1)
