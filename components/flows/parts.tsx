"use client"
import Link from "next/link"
import type { ReactNode } from "react"
import { Radio, RadioGroup } from "@/components/graphical"
import { Check, Info, TriangleAlert, X } from "@/components/icons"
import { Card } from "@/components/kit/app"
import { StatusPill } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * The parts of a step flow (freeze, cancel, change plan, add a member, book a coach, welcome).
 * A step is a short title line (`Group`), the choice or the form, and an `InfoLine` that states the consequence.
 * The footer has Back at the left and the one primary at the right.
 */

export type Choice<T extends string> = {
  value: T
  label: ReactNode
  /** One line under the label. */
  line?: ReactNode
  /** The price or the fact at the right end. */
  end?: ReactNode
  /** A picture before the label. */
  lead?: ReactNode
  disabled?: boolean
}

/** A single choice as bordered rows. The selected row has the stronger edge. */
export function ChoiceList<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: Choice<T>[]
  className?: string
}) {
  return (
    <RadioGroup
      aria-label={label}
      value={value}
      onValueChange={(v) => onChange(v as T)}
      className={cn("gap-xs flex flex-col", className)}
    >
      {options.map((o) => (
        <ChoiceRow key={o.value} {...o} selected={o.value === value} />
      ))}
    </RadioGroup>
  )
}

/** One row of a `ChoiceList`. It must sit inside a `RadioGroup`, because the radio takes its state from the group. */
export function ChoiceRow<T extends string>({
  value,
  label,
  line,
  end,
  lead,
  disabled,
  selected,
  className,
}: Choice<T> & { selected?: boolean; className?: string }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the label wraps Radio.Root, which is the control
    <label
      className={cn(
        "gap-s p-s flex min-w-0 items-start corner-m bg-card",
        selected ? "hairline-l ring-primary" : "hairline",
        disabled ? "text-muted-foreground" : "cursor-pointer hover:bg-muted/40",
        className
      )}
    >
      <Radio.Root value={value} disabled={disabled} className="shrink-0">
        <Radio.Indicator />
      </Radio.Root>
      {lead ? <span className="shrink-0 self-center">{lead}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        {line ? (
          <span className="block text-muted-foreground">{line}</span>
        ) : null}
      </span>
      {end ? (
        <span className="tabular shrink-0 font-medium whitespace-nowrap">
          {end}
        </span>
      ) : null}
    </label>
  )
}

/** The one large value of a block with its small unit beside it: "$84 per month". */
export function Price({
  value,
  unit,
  className,
}: {
  value: ReactNode
  unit?: ReactNode
  className?: string
}) {
  return (
    <p className={cn("gap-xs flex flex-wrap items-baseline", className)}>
      <span className="tabular font-display-wide text-body-xl font-heavy">
        {value}
      </span>
      {unit ? <span className="text-muted-foreground">{unit}</span> : null}
    </p>
  )
}

/**
 * One plan in a row of plans: the name, the price, who it is for, what is included, and the action at the bottom.
 * The columns of one row have the same height, so the actions align. The current plan has the quieter fill.
 */
export function PlanColumn({
  name,
  price,
  unit = "per month",
  line,
  perks,
  current,
  selected,
  note,
  action,
  className,
}: {
  name: string
  price: ReactNode
  unit?: ReactNode
  /** One line: who the plan is for. */
  line?: ReactNode
  perks: string[]
  current?: boolean
  selected?: boolean
  /** One line above the action: what the change costs and when it starts. */
  note?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "gap-s p-s flex min-w-0 flex-col corner-m",
        selected ? "hairline-l ring-primary" : "raised",
        current && "bg-muted/50",
        className
      )}
    >
      <div className="gap-xs flex min-h-7 flex-wrap items-center justify-between">
        <h3 className="min-w-0 truncate font-heavy">{name}</h3>
        {current ? <StatusPill tone="outline">Current plan</StatusPill> : null}
      </div>
      <Price value={price} unit={unit} />
      {line ? (
        <p className="text-pretty text-muted-foreground">{line}</p>
      ) : null}
      <CheckList items={perks} className="flex-1" />
      {note || action ? (
        <div className="gap-xs flex flex-col">
          {note ? (
            <p className="tabular text-muted-foreground">{note}</p>
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  )
}

/**
 * A list of what happens, what you keep or what ends. An item is one sentence, or a topic with its sentence.
 * `tone="x"` marks things that end.
 */
export function CheckList({
  items,
  tone = "check",
  className,
}: {
  items: (string | { label: string; text: ReactNode })[]
  tone?: "check" | "x"
  className?: string
}) {
  const Icon = tone === "x" ? X : Check
  return (
    <ul className={cn("gap-xs flex flex-col", className)}>
      {items.map((it) => {
        const key = typeof it === "string" ? it : it.label
        return (
          <li key={key} className="gap-xs flex items-start">
            <Icon
              className={cn(
                "h-lh w-4 shrink-0",
                tone === "x" ? "text-destructive" : "text-success"
              )}
              aria-hidden="true"
            />
            {typeof it === "string" ? (
              <span className="min-w-0 text-pretty">{it}</span>
            ) : (
              <span className="min-w-0">
                <span className="block font-medium">{it.label}</span>
                <span className="tabular block text-pretty text-muted-foreground">
                  {it.text}
                </span>
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** The consequence of a step in one quiet line: what happens and when. `tone="warning"` is for a cost or a loss. */
export function InfoLine({
  children,
  tone = "info",
  className,
}: {
  children: ReactNode
  tone?: "info" | "warning"
  className?: string
}) {
  const Icon = tone === "warning" ? TriangleAlert : Info
  return (
    <p
      className={cn(
        "gap-xs flex items-start text-pretty",
        tone === "info" && "text-muted-foreground",
        className
      )}
    >
      <Icon
        className={cn(
          "h-lh w-4 shrink-0",
          tone === "warning" && "text-warning"
        )}
        aria-hidden="true"
      />
      <span className="min-w-0">{children}</span>
    </p>
  )
}

/** The block a review step leads with: what the member chose, its one large value, and an info line under it. */
export function Highlight({
  label,
  value,
  unit,
  children,
  className,
}: {
  label: ReactNode
  value: ReactNode
  unit?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn("gap-xs p-m flex flex-col corner-m bg-muted/50", className)}
    >
      <p className="font-medium">{label}</p>
      <Price value={value} unit={unit} />
      {children}
    </div>
  )
}

/**
 * The actions of a step. Back (or Cancel on the first step) is at the left. The children are at the right, and the
 * last child is the primary.
 */
export function StepFooter({
  back,
  children,
  className,
}: {
  back?: { label: string; href?: string; onClick?: () => void }
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "gap-xs flex w-full flex-wrap items-center",
        back ? "justify-between" : "justify-end",
        className
      )}
    >
      {back ? (
        back.href ? (
          <Button variant="outline" render={<Link href={back.href} />}>
            {back.label}
          </Button>
        ) : (
          <Button variant="outline" onClick={back.onClick}>
            {back.label}
          </Button>
        )
      ) : null}
      <div className="gap-xs flex flex-wrap items-center justify-end">
        {children}
      </div>
    </div>
  )
}

/** The summary card beside a task. It stays in view while the member moves through the steps. */
export function FlowAside({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <Card
      title={title}
      as="aside"
      className={cn(
        "lg:sticky lg:top-[calc(var(--bar-h)+var(--space-m))]",
        className
      )}
    >
      {children}
    </Card>
  )
}

/** The message from a failed step. */
export function FlowError({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p role="alert" className={cn("font-medium text-destructive", className)}>
      {children}
    </p>
  )
}

/** The width of a flow result (a `SuccessPanel`) that has no page around it: the full sheet, like the flow. */
export const RESULT_WIDTH = "w-full"

/** "Visa ending 4242" */
export const cardLabel = (card: { brand: string; last4: string }) =>
  `${card.brand[0].toUpperCase() + card.brand.slice(1)} ending ${card.last4}`
