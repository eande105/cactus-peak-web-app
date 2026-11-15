"use client"
import type { CSSProperties } from "react"
import { useApp } from "@/components/app/use-app"
import { Card } from "@/components/kit/app"
import { CATEGORY_BY_ID } from "@/lib/data/catalog"
import {
  classesAttended,
  thirtyDayWindows,
  visitMix,
  visitsBetween,
} from "@/lib/insights"
import { cn } from "@/lib/utils"

/** The last 30 days: classes and visits against the 30 days before, then what the visits were for. */
export function MixCard() {
  const { s, me, now } = useApp()
  const w = thirtyDayWindows(now)
  const visits = visitsBetween(s, me.id, w.current.from, w.current.to)
  const before = visitsBetween(s, me.id, w.previous.from, w.previous.to).length
  const classes = classesAttended(s, me.id, w.current.from, w.current.to)
  const classesBefore = classesAttended(
    s,
    me.id,
    w.previous.from,
    w.previous.to
  )
  const mix = visitMix(visits)
  const change = (n: number, was: number) =>
    n === was
      ? "Same as the 30 days before"
      : `${n > was ? "Up" : "Down"} ${Math.abs(n - was)} from the 30 days before`
  const top = Math.max(1, ...mix.map((m) => m.n))
  return (
    <Card display title="Last 30 days">
      {/* Wide: the two numbers at the left, the activities at the right. Narrow: stacked. Each activity is one row
          (name, bar, count), so a bar takes about half of its column and never most of the card. */}
      <div className="@container">
        <div className="gap-l grid text-body-m sm:text-body-s @xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <dl className="gap-m grid grid-cols-2 @xl:grid-cols-1 @xl:content-start">
            {[
              { label: "Visits", n: visits.length, was: before },
              { label: "Classes", n: classes, was: classesBefore },
            ].map((x) => (
              <div key={x.label} className="min-w-0">
                <dt className="truncate text-muted-foreground">{x.label}</dt>
                <dd className="tabular font-display-wide text-body-xl font-heavy">
                  {x.n}
                </dd>
                <dd className="tabular text-pretty text-muted-foreground">
                  {change(x.n, x.was)}
                </dd>
              </div>
            ))}
          </dl>
          {mix.length ? (
            <ul
              aria-label="Visits by activity, last 30 days"
              className="gap-s gap-x-s grid grid-cols-[auto_minmax(0,1fr)_auto] content-start items-center"
            >
              {mix.map((m) => (
                <li
                  key={m.id}
                  className={cn(
                    "col-span-3 grid grid-cols-subgrid items-center",
                    `cat-${m.id}`
                  )}
                >
                  <span className="truncate">
                    {CATEGORY_BY_ID[m.id]?.name ?? m.id}
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-3 overflow-hidden corner-full bg-muted"
                  >
                    <span
                      className="block h-full w-(--bar) corner-full bg-cat"
                      style={
                        {
                          "--bar": `${(m.n / top) * 100}%`,
                        } as CSSProperties
                      }
                    />
                  </span>
                  <span className="tabular w-6 text-right font-medium">
                    {m.n}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">
              No visits in the last 30 days.
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
