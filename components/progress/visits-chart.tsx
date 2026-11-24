"use client"
import { useCallback, useEffect, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { PairTable, ViewToggle } from "@/components/app/screen-parts"
import { Segmented } from "@/components/kit/ui"
import { ChartContainer } from "@/components/ui/chart"
import type { WeekBar } from "@/lib/progress"
import { fmtDayShort } from "@/lib/time"
import { cn } from "@/lib/utils"

export type Range = "4" | "12" | "year"
const RANGES: { value: Range; label: string }[] = [
  { value: "4", label: "4 weeks" },
  { value: "12", label: "12 weeks" },
  { value: "year", label: "This year" },
]

const plural = (n: number, w: string) => `${n} ${n === 1 ? w : `${w}s`}`

// Met bars are solid Saguaro Night (a light neutral in dark mode, where Night is under 3:1 on the card). Missed bars
// are the quiet input grey, so met and missed differ by fill, not only by the selection opacity. The week in
// progress is an outline: it has not missed yet.
const FILL = {
  met: "var(--bar)",
  missed: "var(--input)",
  current: "transparent",
} as const

const STATE_WORD = {
  met: "goal met",
  missed: "short of the goal",
  current: "this week, in progress",
} as const

/** Reports the week under the pointer or the keyboard focus. It draws nothing. */
function ActiveProbe({
  active,
  payload,
  onActive,
}: {
  active?: boolean
  payload?: readonly { payload?: WeekBar }[]
  onActive: (start: number | null) => void
}) {
  const start = active ? (payload?.[0]?.payload?.start ?? null) : null
  useEffect(() => {
    onActive(start)
  }, [start, onActive])
  return null
}

/** A legend key: a small swatch and its words. */
function Key({ swatch, children }: { swatch: string; children: string }) {
  return (
    <li className="gap-xs flex items-center">
      <span aria-hidden="true" className={cn("size-3 shrink-0", swatch)} />
      {children}
    </li>
  )
}

/**
 * The visits chart: the range control, a headline with the average (or the selected week) and its dates, then one bar
 * for each week with the goal as a dashed line and a quiet axis at the right. The bars are a picture; the headline,
 * the legend and the table view carry the same numbers as text.
 */
export function VisitsChart({
  weeks,
  goal,
  average,
  from,
  now,
  range,
  onRange,
  className,
}: {
  weeks: WeekBar[]
  goal: number
  average: string
  from: number
  now: number
  range: Range
  onRange: (r: Range) => void
  className?: string
}) {
  const [table, setTable] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const pick = useCallback((start: number | null) => setSelected(start), [])
  const top = Math.max(goal + 1, ...weeks.map((w) => w.n))
  const ticks = [...new Set([0, goal, top])].sort((a, b) => a - b)
  // The last bar is the week in progress, so "full weeks" leave it out even when its goal is already met.
  const full = weeks.slice(0, -1)
  const has = {
    met: weeks.some((w) => w.state === "met"),
    missed: weeks.some((w) => w.state === "missed"),
    current: weeks.some((w) => w.state === "current"),
  }
  const met = full.filter((w) => w.state === "met").length
  const sel = table ? undefined : weeks.find((w) => w.start === selected)
  const goalLine = sel
    ? sel.n > goal
      ? `Goal met, ${sel.n - goal} bonus`
      : sel.n === goal
        ? "Goal met"
        : sel.state === "current"
          ? `${goal - sel.n} to go this week`
          : `${goal - sel.n} short of the goal`
    : `Goal met in ${met} of ${plural(full.length, "full week")}`
  return (
    <section
      aria-labelledby="visits-title"
      className={cn(
        "gap-m p-m flex min-w-0 flex-col corner-m raised",
        className
      )}
    >
      <div className="gap-s flex flex-wrap items-center justify-between">
        <h2
          id="visits-title"
          className="font-display-wide text-body-l font-heavy"
        >
          Visits by week
        </h2>
        <ViewToggle table={table} onChange={setTable} />
      </div>
      <Segmented
        label="Range"
        value={range}
        onChange={onRange}
        options={RANGES}
      />
      <div className="flex min-w-0 flex-col" aria-live="polite">
        {/* text-body-s uppercase: a data label, not a heading. */}
        <p className="text-body-s font-medium text-muted-foreground uppercase">
          {sel ? `Week of ${fmtDayShort(sel.start)}` : "Average"}
        </p>
        <p className="gap-xs flex items-baseline">
          <span className="tabular font-display-wide text-display-m font-heavy">
            {sel ? sel.n : average}
          </span>
          <span className="text-body-m text-muted-foreground">
            {sel ? (sel.n === 1 ? "visit" : "visits") : "visits a week"}
          </span>
        </p>
        <p className="tabular text-body-m text-muted-foreground sm:text-body-s">
          {sel ? goalLine : `${fmtDayShort(from)}–${fmtDayShort(now)}`}
        </p>
        {sel ? null : (
          <p className="tabular text-body-m sm:text-body-s">{goalLine}</p>
        )}
      </div>
      {table ? (
        <PairTable
          caption={`Visits by week. Your goal is ${goal} a week.`}
          head={["Week of", "Visits"]}
          rows={weeks.map((w) => ({
            key: w.start,
            label: <span className="tabular">{fmtDayShort(w.start)}</span>,
            value: (
              <span className="gap-xs inline-flex items-baseline">
                {w.n}
                <span className="text-body-s font-regular text-muted-foreground">
                  {STATE_WORD[w.state]}
                </span>
              </span>
            ),
          }))}
        />
      ) : (
        <figure
          aria-label={`Visits by week. Your goal is ${goal} a week, met in ${met} of ${plural(full.length, "full week")}. Use the arrow keys to read each week.`}
          className="gap-s flex min-w-0 flex-col [--bar:var(--night)] dark:[--bar:var(--night-foreground)]"
        >
          <ChartContainer
            config={{ n: { label: "Visits" } }}
            className="aspect-auto h-52 w-full"
          >
            <BarChart
              data={weeks}
              accessibilityLayer
              // The left margin keeps the first date label, centred under a narrow bar, inside the card.
              margin={{ top: 8, right: 0, bottom: 0, left: 16 }}
              onMouseLeave={() => setSelected(null)}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeOpacity={0.6}
              />
              <XAxis
                dataKey="start"
                tickFormatter={fmtDayShort}
                // Recharts drops labels that would overlap, so a phone shows fewer dates than a desktop.
                interval="equidistantPreserveStart"
                minTickGap={12}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                orientation="right"
                domain={[0, top]}
                ticks={ticks}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                width={24}
              />
              <ReferenceLine
                y={goal}
                stroke="var(--primary)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                ifOverflow="extendDomain"
              />
              <Tooltip
                cursor={false}
                isAnimationActive={false}
                content={(p) => (
                  <ActiveProbe
                    active={p.active}
                    payload={
                      p.payload as readonly { payload?: WeekBar }[] | undefined
                    }
                    onActive={pick}
                  />
                )}
              />
              <Bar
                dataKey="n"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
                minPointSize={2}
                isAnimationActive={false}
              >
                {weeks.map((w) => (
                  <Cell
                    key={w.start}
                    fill={FILL[w.state]}
                    stroke={w.state === "current" ? "var(--bar)" : "none"}
                    strokeWidth={w.state === "current" ? 1.5 : 0}
                    strokeDasharray={w.state === "current" ? "3 2" : undefined}
                    fillOpacity={
                      selected === null || selected === w.start ? 1 : 0.35
                    }
                    strokeOpacity={
                      selected === null || selected === w.start ? 1 : 0.35
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
          <figcaption>
            <ul className="gap-x-m gap-y-xs flex flex-wrap text-body-s text-muted-foreground">
              {/* A key only for the bar kinds that are drawn in this range. */}
              {has.met ? (
                <Key swatch="corner-xs bg-(--bar)">Goal met</Key>
              ) : null}
              {has.missed ? <Key swatch="corner-xs bg-input">Short</Key> : null}
              {has.current ? (
                <Key swatch="corner-xs border border-dashed border-(--bar)">
                  This week
                </Key>
              ) : null}
              <li className="gap-xs flex items-center">
                <span
                  aria-hidden="true"
                  className="w-4 shrink-0 border-t-2 border-dashed border-primary"
                />
                <span className="tabular">Goal, {goal} a week</span>
              </li>
            </ul>
          </figcaption>
        </figure>
      )}
    </section>
  )
}
