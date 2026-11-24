"use client"
import { useEffect, useState } from "react"
import { useApp } from "@/components/app/use-app"
import { SuggestedCard } from "@/components/booking/class-row"
import {
  CalendarCheck,
  CalendarDays,
  Flame,
  TrendingUp,
} from "@/components/icons"
import { AppPage, Card } from "@/components/kit/app"
import { VisitMonth } from "@/components/kit/progress"
import { RibMeter } from "@/components/kit/ribs"
import { EmptyState, LoadingBlock } from "@/components/kit/ui"
import {
  ClassMix,
  KpiTile,
  MilestoneGrid,
  ProgressBar,
  VisitPattern,
  WeekMarks,
} from "@/components/progress/parts"
import { type Range, VisitsChart } from "@/components/progress/visits-chart"
import { Button } from "@/components/ui/button"
import { CATEGORY_BY_ID } from "@/lib/data/catalog"
import { sessionsForDay } from "@/lib/data/sessions"
import { weekStart } from "@/lib/engine"
import { visitHistory } from "@/lib/history"
import { nextMilestone } from "@/lib/insights"
import {
  classMix,
  countBetween,
  dayParts,
  milestones,
  signed,
  soFarDelta,
  weekBars,
  weekdayCounts,
} from "@/lib/progress"
import { addDays, DAY, dateKey, dayStart, MONTHS, parts } from "@/lib/time"
import { openDialog } from "@/lib/ui-state"

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

/** The range in words, after "in": "the last 4 weeks", or the year ("2026"). */
const scopeOf = (r: Range, year: number) =>
  r === "4" ? "the last 4 weeks" : r === "12" ? "the last 12 weeks" : `${year}`

/**
 * "+1 vs. last week", or "Same as last week". The count compares with the same point of the period before, so a part
 * week is never compared with a full one; a screen reader hears that, and the visible line stays short.
 */
const trend = (d: number, what: string) => (
  <span className="block">
    {d ? `${signed(d)} vs. ${what}` : `Same as ${what}`}
    <span className="sr-only"> at this point</span>
  </span>
)

/**
 * Progress is a dashboard, read top to bottom: four headline tiles (this week against the goal, the streak, this month
 * against its goal, lifetime visits), the visits chart for the chosen range, then the class mix and when the member
 * visits for the same range, then this month's calendar and the milestones.
 */
export default function ProgressPage() {
  const { s, me, now, prefs, club } = useApp()
  const [range, setRange] = useState<Range>("4")
  // Nothing sets this to true yet, so the block below never shows. The state stays for a real load to use.
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300)
    return () => clearTimeout(t)
  }, [])
  const hist = visitHistory(s, me.id, now)
  if (loading) return <LoadingBlock text="Loading your progress…" rows={4} />
  if (!hist.length) {
    const first = sessionsForDay(club, addDays(dayStart(now), 1))
      .filter((x) => x.firstTimerOk)
      .slice(0, 3)
    return (
      <AppPage title="Progress">
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

  const real = s.visits.filter((v) => v.memberId === me.id)
  // Same fallback and lifetime count as the Streak card on Today, so the two pages agree.
  const stats = s.stats[me.id] ?? { streakWeeks: 0, lifetime: 0, longest: 0 }
  const lifetime = Math.max(stats.lifetime, real.length)
  const target = prefs.weeklyTarget
  const monthlyGoal = target * 4
  const p = parts(now)

  // This week and the same point of last week.
  const wk = weekStart(now)
  const weekCount = countBetween(hist, wk, wk + 7 * DAY)
  const weekDelta = soFarDelta(hist, wk, wk - 7 * DAY, now)
  const visitDays = new Set(real.map((v) => dateKey(v.at)))
  const planned = new Set(
    s.bookings
      .filter(
        (b) => b.memberId === me.id && b.status === "booked" && b.start > now
      )
      .map((b) => dateKey(b.start))
  )
  // Days still to come this week with a booking, and no visit yet that day.
  const bookedThisWeek = Array.from({ length: 7 }, (_, i) =>
    dateKey(addDays(wk, i))
  ).filter((k) => planned.has(k) && !visitDays.has(k)).length
  const toGo = Math.max(0, target - weekCount)
  const weekRibs =
    weekCount >= target
      ? 5
      : Math.min(
          4,
          Math.max(weekCount ? 1 : 0, Math.round((weekCount / target) * 5))
        )

  // This month and the same point of last month.
  const monthStart = dayStart(Date.UTC(p.y, p.m, 1, 7))
  const prevMonthStart = dayStart(Date.UTC(p.y, p.m - 1, 1, 7))
  const monthVisits = hist.filter((v) => v.at >= monthStart && v.at < now + DAY)
  const monthDelta = soFarDelta(hist, monthStart, prevMonthStart, now)
  const monthDays = new Set(monthVisits.map((v) => dateKey(v.at)))
  // Same rule as the week tile: a booked day counts only if there is no visit on it yet.
  const plannedMonth = [...planned].filter(
    (k) => k.startsWith(dateKey(now).slice(0, 7)) && !visitDays.has(k)
  ).length

  const ms = nextMilestone(lifetime)
  // The streak tile's marks: the last seven full weeks and this one.
  const recent = weekBars(hist, wk - 7 * 7 * DAY, now, target)

  // The range of the chart, the class mix and the visit pattern.
  const from =
    range === "4"
      ? now - 28 * DAY
      : range === "12"
        ? now - 84 * DAY
        : // Jan 1 in Arizona time. Midnight UTC would be Dec 31 here.
          dayStart(Date.UTC(p.y, 0, 1, 7))
  const inRange = hist.filter((v) => v.at >= from && v.at <= now + DAY)
  const avg = (inRange.length / Math.max(1, (now - from) / (7 * DAY))).toFixed(
    1
  )
  const mix = classMix(inRange)
  const scope = scopeOf(range, p.y)

  return (
    <AppPage title="Progress">
      <div className="gap-s sm:gap-m grid grid-cols-2 xl:grid-cols-4">
        <KpiTile
          icon={CalendarCheck}
          title="This week"
          value={weekCount}
          unit={`of ${target}`}
          meter={
            <RibMeter
              value={weekRibs}
              tone={weekCount >= target ? "success" : "brand"}
              label="Weekly goal"
              valueText={`${weekCount} of ${target} visits this week`}
            />
          }
          line={
            <>
              {/* Two short lines, so the tile stays as low as its neighbour on a phone. */}
              <span className="block">
                {toGo
                  ? `${toGo} to go${bookedThisWeek ? ` · ${bookedThisWeek} booked` : ""}`
                  : bookedThisWeek
                    ? `${bookedThisWeek} more booked`
                    : weekCount > target
                      ? `${weekCount - target} bonus`
                      : "Goal met"}
              </span>
              {trend(weekDelta, "last week")}
            </>
          }
        />
        <KpiTile
          icon={Flame}
          title="Streak"
          night
          value={stats.streakWeeks}
          unit={stats.streakWeeks === 1 ? "week" : "weeks"}
          meter={<WeekMarks weeks={recent} />}
          line={
            stats.streakWeeks > 0 && stats.streakWeeks >= stats.longest
              ? "Your best streak"
              : `Best ${plural(stats.longest, "week")}`
          }
        />
        <KpiTile
          icon={CalendarDays}
          title={MONTH_NAMES[p.m]}
          value={monthVisits.length}
          unit={`of ${monthlyGoal}`}
          meter={
            <ProgressBar
              value={monthVisits.length / Math.max(1, monthlyGoal)}
              done={monthVisits.length >= monthlyGoal}
            />
          }
          line={
            <>
              <span className="block">
                {monthVisits.length >= monthlyGoal
                  ? "Goal met"
                  : `${monthlyGoal - monthVisits.length} to go`}
              </span>
              {trend(monthDelta, MONTHS[(p.m + 11) % 12])}
            </>
          }
        />
        <KpiTile
          icon={TrendingUp}
          title="All time"
          value={lifetime}
          unit={lifetime === 1 ? "visit" : "visits"}
          meter={
            <ProgressBar value={(lifetime - ms.from) / (ms.to - ms.from)} />
          }
          line={`${ms.to - lifetime} to ${ms.to} visits`}
        />
      </div>

      <VisitsChart
        // Bars start at the first week with history, so weeks before it never draw as missed.
        weeks={weekBars(hist, Math.max(from, hist[0].at), now, target)}
        goal={target}
        average={avg}
        from={from}
        now={now}
        range={range}
        onRange={setRange}
      />

      <div className="gap-m md:gap-l grid items-start lg:grid-cols-2">
        <ClassMix rows={mix.rows} total={mix.total} scope={scope} />
        <VisitPattern
          days={weekdayCounts(inRange)}
          dayParts={dayParts(inRange)}
          scope={scope}
        />
      </div>

      <div className="gap-m md:gap-l grid items-start lg:grid-cols-[auto_minmax(0,1fr)]">
        <Card
          title={MONTH_NAMES[p.m]}
          description={`${plural(monthVisits.length, "visit")}${plannedMonth ? ` · ${plannedMonth} booked` : ""}`}
        >
          <VisitMonth today={now} visits={monthDays} planned={planned} />
        </Card>
        <MilestoneGrid
          {...milestones({
            history: hist,
            saved: real,
            lifetime,
            streak: stats.streakWeeks,
            longest: stats.longest,
            swimName: CATEGORY_BY_ID.aqua?.name ?? "Aqua",
          })}
        />
      </div>
    </AppPage>
  )
}
