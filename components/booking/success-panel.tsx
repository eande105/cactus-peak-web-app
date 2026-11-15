"use client"
import Link from "next/link"
import type { ReactNode } from "react"
import { AddToCalendar } from "@/components/booking/calendar-menu"
import { GymObject, type ObjectId } from "@/components/brand/graphics"
import { Check } from "@/components/icons"
import { Facts } from "@/components/kit/app"
import { StatusPill } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import type { CalEvent } from "@/lib/ics"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

// The result of a flow, as one compact card: a small check (in the status pill when there is one), the fact as the
// headline, the details as facts, then the next actions as buttons. One action is primary: `primary`, the calendar
// menu, or the first row.
export function SuccessPanel({
  headline,
  pill,
  summary,
  event,
  primary,
  shareText,
  shareLabel = "Copy link",
  rows,
  onDone,
  doneLabel = "Back",
  extra,
  object,
  className,
}: {
  headline: string
  pill?: string
  summary: { label: string; value: ReactNode }[]
  event?: CalEvent
  primary?: ReactNode
  shareText?: string
  shareLabel?: string
  rows?: { label: string; href?: string; onClick?: () => void }[]
  onDone?: () => void
  doneLabel?: string
  extra?: ReactNode
  /** The gym object for what was booked, small. Without a pill it replaces the check. */
  object?: ObjectId
  className?: string
}) {
  const lead =
    primary ??
    (event ? <AddToCalendar event={event} variant="primary" /> : null)
  const hasActions = !!lead || !!rows?.length || !!shareText || !!onDone
  return (
    <div
      role="status"
      className={cn(
        "flex min-w-0 flex-col corner-m raised text-body-m sm:text-body-s",
        className
      )}
    >
      <div className="gap-xs p-m flex flex-col items-start">
        {object ? (
          <GymObject id={object} cut className="size-10 shrink-0" />
        ) : null}
        {pill ? (
          <StatusPill tone="success" icon={Check} className="pl-xxs">
            {pill}
          </StatusPill>
        ) : object ? null : (
          <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
        )}
        <h2 className="font-display-wide text-body-xl font-heavy text-balance">
          {headline}
        </h2>
      </div>
      {summary.length || extra ? (
        <div className="gap-s px-m pb-m flex flex-col">
          {summary.length ? (
            <Facts
              className="rule-t"
              items={summary.map((r) => ({
                label: r.label,
                value: <span className="tabular">{r.value}</span>,
              }))}
            />
          ) : null}
          {extra}
        </div>
      ) : null}
      {hasActions ? (
        <div className="gap-xs p-m flex flex-wrap items-center rule-t">
          {lead}
          {rows?.map((r, i) => {
            const variant = !lead && i === 0 ? "primary" : "outline"
            return r.href ? (
              <Button
                key={r.label}
                variant={variant}
                render={<Link href={r.href} />}
              >
                {r.label}
              </Button>
            ) : (
              <Button key={r.label} variant={variant} onClick={r.onClick}>
                {r.label}
              </Button>
            )
          })}
          {shareText ? (
            <Button
              variant="outline"
              onClick={() => {
                void navigator.clipboard?.writeText(shareText)
                toast({ title: "Link copied" })
              }}
            >
              {shareLabel}
            </Button>
          ) : null}
          {onDone ? (
            <Button variant="ghost" onClick={onDone}>
              {doneLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
