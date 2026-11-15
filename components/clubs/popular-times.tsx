"use client"
import { type CSSProperties, useState } from "react"
import { PairTable, ViewToggle } from "@/components/app/screen-parts"
import { Tip } from "@/components/kit/tip"
import { Segmented } from "@/components/kit/ui"
import { BUSY_WORDS } from "@/lib/data/catalog"
import { typicalFor } from "@/lib/engine"
import { DOW, hourLabel } from "@/lib/time"
import { cn } from "@/lib/utils"

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

// Typical hours by weekday, sized for a card. Bars use five stepped heights. "Now" is a text label and an outline,
// not a colour.
export function PopularTimesChart({
  slug,
  nowDow,
  nowHour,
  live,
  className,
}: {
  slug: string
  nowDow: number
  nowHour: number
  live: boolean
  className?: string
}) {
  const [dow, setDow] = useState(nowDow)
  const [table, setTable] = useState(false)
  const arr = typicalFor(slug, dow)
  const open = dow === 0 || dow === 6 ? [6, 20] : [4, 22]
  const hours = arr
    .map((v, i) => ({ h: i + 4, v }))
    .filter((x) => x.h >= open[0] && x.h < open[1])
  const peak = hours.filter((x) => x.v === Math.max(...hours.map((y) => y.v)))
  const quiet = hours.filter(
    (x) =>
      x.v ===
        Math.min(
          ...hours.filter((y) => y.h >= 8 && y.h <= 21).map((y) => y.v)
        ) && x.h >= 8
  )
  const bare = (h: number) => `${h % 12 || 12}`
  const range = (xs: { h: number }[]) => {
    const a = xs[0].h,
      b = xs.at(-1)!.h + 1
    const ap = (h: number) => (h < 12 ? "am" : "pm")
    return `${bare(a)}${ap(a) !== ap(b) ? ` ${ap(a)}` : ""} to ${bare(b)} ${ap(b)}`
  }
  const days = [1, 2, 3, 4, 5, 6, 0]
  return (
    <figure className={cn("gap-s flex min-w-0 flex-col", className)}>
      <div className="gap-xs flex flex-wrap items-center justify-between">
        <Segmented
          label="Day of the week"
          value={dow}
          onChange={setDow}
          size="sm"
          options={days.map((d) => ({
            value: d,
            label: DOW[d],
            sr: DAY_NAMES[d],
          }))}
        />
        <ViewToggle table={table} onChange={setTable} />
      </div>
      {table ? (
        <PairTable
          caption={`Typical busyness by hour, ${DOW[dow]}`}
          head={["Hour", "Typical busyness"]}
          rows={hours.map((x) => ({
            key: x.h,
            label: <span className="tabular">{hourLabel(x.h)}</span>,
            value: `${BUSY_WORDS[x.v]} · ${x.v} of 5`,
          }))}
        />
      ) : (
        <div className="gap-xs flex flex-col">
          <div
            role="img"
            aria-label={`Typical busyness by hour on ${DAY_NAMES[dow]}. Busiest ${range(peak)}`}
            className="gap-xxs pt-m flex h-32 items-end rule-b"
          >
            {hours.map((x) => {
              const isNow = live && dow === nowDow && x.h === nowHour
              return (
                <div
                  key={x.h}
                  className="relative flex h-full min-w-0 flex-1 flex-col justify-end"
                >
                  {isNow ? (
                    <span
                      className={cn(
                        "absolute -top-3 left-1/2",
                        "corner-xs px-xxs",
                        "text-body-xs font-medium",
                        "-translate-x-1/2 bg-foreground text-background"
                      )}
                    >
                      Now
                    </span>
                  ) : null}
                  {/* A pointer hint for one bar. The bars are not focusable: the chart label and the table view carry
                      the same data for keyboard and screen reader users. */}
                  <Tip content={`${hourLabel(x.h)}: ${BUSY_WORDS[x.v]}`}>
                    <div
                      className={cn(
                        "h-(--bar) w-full bg-night/80 dark:bg-night-foreground/70",
                        isNow && "outline-2 outline-offset-2 outline-foreground"
                      )}
                      style={{ "--bar": `${x.v * 17}%` } as CSSProperties}
                    />
                  </Tip>
                </div>
              )
            })}
          </div>
          {/* text-body-xs: axis ticks of the chart, not sentences. */}
          <div
            className="tabular flex justify-between text-body-xs font-medium text-muted-foreground"
            aria-hidden="true"
          >
            {hours
              .filter((_, i) => i % 3 === 0)
              .map((x) => (
                <span key={x.h}>{hourLabel(x.h)}</span>
              ))}
          </div>
        </div>
      )}
      <figcaption className="gap-x-m gap-y-xxs tabular flex flex-wrap text-body-m text-muted-foreground sm:text-body-s">
        <span>
          Busiest{" "}
          <span className="font-medium text-foreground">{range(peak)}</span>
        </span>
        <span>
          Quietest{" "}
          <span className="font-medium text-foreground">
            {quiet.length ? range(quiet.slice(0, 2)) : "after 8 pm"}
          </span>
        </span>
        <span>Typical for {DOW[dow]}</span>
      </figcaption>
    </figure>
  )
}
