"use client"
import { type CSSProperties, useEffect, useState } from "react"
import { BarList, PairTable, ViewToggle } from "@/components/app/screen-parts"
import { useApp } from "@/components/app/use-app"
import { SuggestedCard } from "@/components/booking/class-row"
import { Check } from "@/components/icons"
import { AppPage, Card, Row, Rows, Stat, Stats } from "@/components/kit/app"
import { VisitMonth, VisitStrip } from "@/components/kit/progress"
import { RibMeter } from "@/components/kit/ribs"
import { EmptyState, LoadingBlock, Segmented } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { CATEGORIES, CATEGORY_BY_ID } from "@/lib/data/catalog"
import { sessionsForDay } from "@/lib/data/sessions"
import { weekStart } from "@/lib/engine"
import { visitHistory } from "@/lib/history"
import {
  addDays,
  DAY,
  DOW_LONG,
  dateKey,
  dayStart,
  fmtDay,
  fmtDayShort,
  parts,
} from "@/lib/time"
import type { CategoryId } from "@/lib/types"
import { openDialog } from "@/lib/ui-state"
import { cn } from "@/lib/utils"

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const plural = (n: number, w: string) => `${n} ${n === 1 ? w : `${w}s`}`

type Week = { start: number; n: number }

/** A number with its goal after it in small quiet type: "2 of 3". */
function OfGoal({ n, goal }: { n: number; goal: number }) {
  return (
    <>
      {n}
      <span className="text-body-s font-medium text-muted-foreground">
        {" "}
        of {goal}
      </span>
    </>
  )
}

/**
 * The main chart: one bar for each week, with a line at the weekly goal. The bars are a picture; the label and the
 * table view carry the same numbers as text.
 */
function VisitsChart({
  weeks,
  goal,
  className,
}: {
  weeks: Week[]
  goal: number
  className?: string
}) {
  const max = Math.max(goal, 1, ...weeks.map((w) => w.n))
  const met = weeks.filter((w) => w.n >= goal).length
  // About six date labels fit under the bars at any range.
  const every = Math.max(1, Math.ceil(weeks.length / 6))
  const dense = weeks.length > 14
  return (
    <div className={cn("gap-xs flex min-w-0 flex-col", className)}>
      <div
        role="img"
        aria-label={`Visits by week. You met your goal of ${goal} in ${met} of ${plural(weeks.length, "week")}.`}
        className={cn(
          "relative flex h-40 items-end rule-b",
          dense ? "gap-xxs" : "gap-s"
        )}
      >
        <div
          className="absolute inset-x-0 bottom-(--goal) h-px bg-primary"
          style={{ "--goal": `${(goal / max) * 80}%` } as CSSProperties}
        />
        {weeks.map((w) => (
          <div
            key={w.start}
            className="gap-xxs relative flex h-full min-w-0 flex-1 flex-col items-center justify-end"
          >
            {dense ? null : (
              // text-body-xs: a value label of the chart, not a sentence.
              <span className="tabular text-body-xs font-medium">{w.n}</span>
            )}
            <div
              className="h-(--bar) min-h-0.5 w-full max-w-12 bg-night dark:bg-night-foreground"
              style={{ "--bar": `${(w.n / max) * 80}%` } as CSSProperties}
            />
          </div>
        ))}
      </div>
      {/* text-body-xs: axis ticks of the chart. */}
      <div
        aria-hidden="true"
        className={cn(
          "tabular flex text-body-xs font-medium text-muted-foreground",
          dense ? "gap-xxs" : "gap-s"
        )}
      >
        {weeks.map((w, i) => (
          <span
            key={w.start}
            className="min-w-0 flex-1 text-center whitespace-nowrap"
          >
            {i % every === 0 ? fmtDayShort(w.start) : ""}
          </span>
        ))}
      </div>
    </div>
  )
}

/** One milestone: the name, how far along it is in the line, and a meter, or "Done" when it is reached. */
function Milestone({
  title,
  line,
  done,
  meter,
}: {
  title: string
  line: string
  done: boolean
  /** The meter, zero to five ribs, with its text for a screen reader. */
  meter?: { value: number; label: string; valueText: string }
}) {
  return (
    <Row
      title={title}
      line={<span className="tabular">{line}</span>}
      end={
        done ? (
          <span className="gap-xxs flex items-center font-medium">
            <Check
              className="size-4 shrink-0 text-success"
              aria-hidden="true"
            />
            Done
          </span>
        ) : meter ? (
          <RibMeter
            value={meter.value}
            size="sm"
            tone="brand"
            label={meter.label}
            valueText={meter.valueText}
            decorative
          />
        ) : null
      }
    />
  )
}

/**
 * Progress is a dashboard. One block holds the four numbers a member checks (week, month, streak, favourite class)
 * and the visits chart for the chosen range. Under it: the class mix and the weekdays as ranked lists, then the
 * month and the milestones.
 */
export default function ProgressPage() {
  const { s, me, now, prefs, club } = useApp()
  const [range, setRange] = useState<"4" | "12" | "year">("4")
  const [loading, setLoading] = useState(false)
  const [table, setTable] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300)
    return () => clearTimeout(t)
  }, [])
  const hist = visitHistory(s, me.id, now)
  const real = s.visits.filter((v) => v.memberId === me.id)
  const p = parts(now)
  const monthStart = dayStart(Date.UTC(p.y, p.m, 1, 7))
  const monthVisits = hist.filter((v) => v.at >= monthStart && v.at < now + DAY)
  const from =
    range === "4"
      ? now - 28 * DAY
      : range === "12"
        ? now - 84 * DAY
        : Date.UTC(p.y, 0, 1)
  const inRange = hist.filter((v) => v.at >= from && v.at <= now + DAY)
  const weeks = Math.max(1, (now - from) / (7 * DAY))
  const wk = weekStart(now)
  const weekCount = hist.filter((v) => v.at >= wk && v.at < wk + 7 * DAY).length
  const target = prefs.weeklyTarget
  const stats = s.stats[me.id]
  const mix = CATEGORIES.map((c) => ({
    id: c.id as CategoryId,
    n: inRange.filter((v) => v.category === c.id).length,
  }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
  const fav = mix[0]
  const byDow = Array.from({ length: 7 }, (_, i) => ({
    dow: (i + 1) % 7,
    n: inRange.filter((v) => parts(v.at).dow === (i + 1) % 7).length,
  }))
  const topDays = [...byDow]
    .sort((a, b) => b.n - a.n)
    .slice(0, 2)
    .map((x) => DOW_LONG[x.dow])
  const morning =
    inRange.filter((v) => parts(v.at).h < 12).length >= inRange.length / 2
  const visitDays = new Set(real.map((v) => dateKey(v.at)))
  const monthDays = new Set(monthVisits.map((v) => dateKey(v.at)))
  const planned = new Set(
    s.bookings
      .filter(
        (b) => b.memberId === me.id && b.status === "booked" && b.start > now
      )
      .map((b) => dateKey(b.start))
  )
  const to50 = Math.max(0, 50 - stats.lifetime)
  const monthlyGoal = target * 4
  const maxMix = Math.max(1, ...mix.map((x) => x.n))
  const maxDow = Math.max(1, ...byDow.map((x) => x.n))
  // One bar for each week of the range. The first week can start before the range, so it counts whole weeks.
  const byWeek: Week[] = []
  for (let w = weekStart(from); w <= wk; w += 7 * DAY)
    byWeek.push({
      start: w,
      n: hist.filter((v) => v.at >= w && v.at < w + 7 * DAY).length,
    })
  const rangeLabel =
    range === "4" ? "4 weeks" : range === "12" ? "12 weeks" : "this year"
  if (loading) return <LoadingBlock text="Loading your progress…" rows={4} />
  if (!hist.length) {
    const first = sessionsForDay(club, addDays(dayStart(now), 1))
      .filter((x) => x.firstTimerOk)
      .slice(0, 3)
    return (
      <AppPage
        title="Progress"
        // The range filters the whole page (the tiles, the chart, the class mix and the days), so it sits in the
        // page header, not in one card.
        actions={
          <Segmented
            label="Range"
            value={range}
            onChange={setRange}
            options={[
              { value: "4", label: "4 weeks" },
              { value: "12", label: "12 weeks" },
              { value: "year", label: "This year" },
            ]}
          />
        }
      >
        <Card>
          <EmptyState
            object="heart-watch"
            className="py-m"
            title="Your first visit starts the streak"
            body="Show your pass at the front desk."
            action={
              <Button size="sm" onClick={() => openDialog("pass")}>
                Show my pass
              </Button>
            }
          />
        </Card>
        {first.length ? (
          <Card tone="bare" title="First-timer classes tomorrow">
            <div className="pt-m @container">
              <ul className="gap-m grid grid-cols-1 @xl:grid-cols-3">
                {first.map((x) => (
                  <li key={x.id}>
                    <SuggestedCard se={x} />
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ) : null}
      </AppPage>
    )
  }
  const avg = (inRange.length / weeks).toFixed(1)
  return (
    <AppPage
      title="Progress"
      // The range filters the whole page (the tiles, the chart, the class mix and the days), so it sits in the
      // page header, not in one card.
      actions={
        <Segmented
          label="Range"
          value={range}
          onChange={setRange}
          options={[
            { value: "4", label: "4 weeks" },
            { value: "12", label: "12 weeks" },
            { value: "year", label: "This year" },
          ]}
        />
      }
    >
      {/* One block: the numbers on top, the chart under them. The tiles' own edge is also the line above the chart. */}
      <section
        id="wg"
        aria-label="Visits"
        className="flex min-w-0 flex-col corner-m raised"
      >
        <Stats className="[&>dl]:corner-b-zero">
          <Stat
            label="Visits this week"
            value={<OfGoal n={weekCount} goal={target} />}
            hint={
              weekCount > target
                ? `Goal met, ${weekCount - target} bonus`
                : weekCount === target
                  ? "Goal met"
                  : undefined
            }
          />
          <Stat
            label="Visits this month"
            value={<OfGoal n={monthVisits.length} goal={monthlyGoal} />}
            hint={monthVisits.length >= monthlyGoal ? "Goal met" : undefined}
          />
          <Stat label="Streak" value={plural(stats.streakWeeks, "week")} />
          <Stat
            label="Most-taken class"
            value={fav ? CATEGORY_BY_ID[fav.id].name : "None yet"}
          />
        </Stats>
        <div className="gap-m p-m flex flex-col">
          <div className="gap-s flex flex-wrap items-center justify-between">
            <div className="min-w-0 text-body-m sm:text-body-s">
              <h2 className="font-heavy">Visits by week</h2>
              <p className="tabular text-muted-foreground">
                Average {avg} a week · the line is your goal
              </p>
            </div>
            <ViewToggle table={table} onChange={setTable} />
          </div>
          {table ? (
            <PairTable
              caption="Visits by week"
              head={["Week of", "Visits"]}
              rows={byWeek.map((w) => ({
                key: w.start,
                label: <span className="tabular">{fmtDayShort(w.start)}</span>,
                value: w.n,
              }))}
            />
          ) : (
            <VisitsChart weeks={byWeek} goal={target} />
          )}
        </div>
        <div id="st" className="p-m rule-t">
          <VisitStrip
            weekStart={wk}
            visits={visitDays}
            planned={planned}
            today={now}
            goal={target}
          />
        </div>
      </section>

      <div className="gap-m md:gap-l grid items-start lg:grid-cols-2">
        <Card title="Class mix" id="cm">
          {mix.length ? (
            <BarList
              label="Visits by category"
              max={maxMix}
              items={mix.map((m) => ({
                key: m.id,
                label: CATEGORY_BY_ID[m.id].name,
                value: m.n,
                className: `cat-${m.id}`,
                barClassName: "bg-cat",
              }))}
            />
          ) : (
            <p className="text-body-m text-muted-foreground sm:text-body-s">
              No classes in {rangeLabel}.
            </p>
          )}
        </Card>
        <Card title="Visits by day" id="vd">
          <div className="gap-s flex flex-col">
            <BarList
              label={`Visits by weekday. ${topDays.join(" and ")} are your busiest days.`}
              max={maxDow}
              items={byDow.map((d) => ({
                key: d.dow,
                label: DOW_LONG[d.dow],
                value: d.n,
              }))}
            />
            <p className="tabular text-body-m text-muted-foreground sm:text-body-s">
              Most on {DOW_LONG[[...byDow].sort((a, b) => b.n - a.n)[0].dow]}
              s, {morning ? "mostly in the morning" : "mostly later in the day"}
            </p>
          </div>
        </Card>
      </div>

      <div className="gap-m md:gap-l grid items-start lg:grid-cols-[auto_minmax(0,1fr)]">
        <Card title={MONTH_NAMES[p.m]} id="mc">
          <VisitMonth today={now} visits={monthDays} planned={planned} />
        </Card>
        <Card title="Milestones" id="ms" flush>
          <Rows>
            <Milestone
              title="50th visit"
              line={`${Math.min(50, stats.lifetime)} of 50`}
              done={to50 === 0}
              meter={{
                value: Math.round((stats.lifetime / 50) * 5),
                label: "Progress to 50th visit",
                valueText: `${stats.lifetime} of 50`,
              }}
            />
            <Milestone
              title="10-week streak"
              line={`${Math.min(10, stats.streakWeeks)} of 10 weeks`}
              done={stats.streakWeeks >= 10}
              meter={{
                value: Math.min(5, Math.round((stats.streakWeeks / 10) * 5)),
                label: "Progress to 10-week streak",
                valueText: `${stats.streakWeeks} of 10`,
              }}
            />
            <Milestone
              title="First lap swim"
              line={fmtDay(Date.UTC(2026, 9, 9, 14))}
              done
            />
          </Rows>
        </Card>
      </div>
    </AppPage>
  )
}
