"use client"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useApp } from "@/components/app/use-app"
import { BookPage } from "@/components/book/book-tabs"
import { FilterBar, FilterSheet } from "@/components/book/filter-bar"
import { type ClubId, ClubSet } from "@/components/brand/graphics"
import { SelectBox } from "@/components/kit/ui"
import {
  NoticeTile,
  ReserveNotice,
  soonerPlan,
} from "@/components/reserve/empty"
import {
  DayBookings,
  DayPicks,
  useDayBookings,
  useDayPicks,
} from "@/components/schedule/day-aside"
import { DayStrip } from "@/components/schedule/day-strip"
import { ScheduleFilters } from "@/components/schedule/filters"
import { TimeSections } from "@/components/schedule/time-sections"
import { Button } from "@/components/ui/button"
import { addRemind } from "@/lib/actions"
import { CATEGORIES, CLUB_BY_SLUG } from "@/lib/data/catalog"
import { sessionsForDay } from "@/lib/data/sessions"
import { useEmptyPreview } from "@/lib/empty-preview"
import { opensAt, windowDays } from "@/lib/engine"
import {
  activeCount,
  applyFilters,
  EMPTY,
  type Filters,
  parseFilters,
  serializeFilters,
} from "@/lib/schedule-filters"
import {
  addDays,
  dateKey,
  dayStart,
  fmtDay,
  fmtDayLong,
  fmtDayShort,
  fmtTime,
  fromKey,
} from "@/lib/time"
import { toast } from "@/lib/toast"
import type { CategoryId } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * Book › Classes. One toolbar row, the day strip, then that day's timetable in Home's cards, one for each part of the
 * day, with the member's bookings and picks for the day beside it.
 * Two filters are on the page because members use them every visit: the club and the kind of class.
 * The other filters (time of day, intensity, open spots, coach, room, length) are one step away in "More filters".
 */
function Inner() {
  const { s, me, hh, prefs, club, now } = useApp()
  // TEMPORARY design review switch (lib/empty-preview.ts).
  const preview = useEmptyPreview()
  const router = useRouter()
  const path = usePathname()
  const sp = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const f = useMemo(() => parseFilters(sp, club), [sp, club])
  const today = dayStart(now)
  const dateParam = sp.get("date")
  const date = dateParam ? fromKey(dateParam) : today
  const stored = useRef(false)
  // The member's saved filters apply once when the URL has none.
  // biome-ignore lint/correctness/useExhaustiveDependencies: saved filters apply once on mount, the stored ref guards repeats
  useEffect(() => {
    if (stored.current) return
    stored.current = true
    if (
      prefs.savedFilters &&
      ![...sp.keys()].some((k) => !["view", "date"].includes(k))
    ) {
      try {
        const saved = JSON.parse(prefs.savedFilters) as Filters
        router.replace(`${path}?${serializeFilters(saved, sp, club)}`)
      } catch {}
    }
  }, [])
  const win = windowDays(hh.plan)
  const push = (p: URLSearchParams, replace = false) => {
    const url = `${path}?${p.toString()}`
    if (replace) router.replace(url, { scroll: false })
    else router.push(url, { scroll: false })
  }
  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(sp)
    if (v) p.set(k, v)
    else p.delete(k)
    push(p)
  }
  const setFilters = (nf: Filters) => push(serializeFilters(nf, sp, club), true)

  const homeOnly = hh.plan === "trailhead"
  // Trailhead books at the home club only, and may look at one other club at a time. Its rows show the lock.
  const clubs = homeOnly
    ? [f.clubs.includes(me.homeClub) ? me.homeClub : f.clubs[0]]
    : f.clubs
  const away = homeOnly && clubs[0] !== me.homeClub
  const clubKey = clubs.join(",")
  // biome-ignore lint/correctness/useExhaustiveDependencies: clubKey stands for clubs
  const baseDay = useMemo(
    () =>
      clubs
        .flatMap((c) => sessionsForDay(c, date))
        .sort((a, b) => a.start - b.start),
    [date, clubKey]
  )
  const shown = applyFilters(baseDay, f, s, me.id)
  const catCounts = Object.fromEntries(
    CATEGORIES.map((c) => [
      c.id,
      baseDay.filter((x) => x.category === c.id).length,
    ])
  )
  const studios = [...new Set(clubs.flatMap((c) => CLUB_BY_SLUG[c].studios))]
  const marks = new Set(
    s.bookings
      .filter(
        (b) => b.memberId === me.id && ["booked", "held"].includes(b.status)
      )
      .map((b) => dateKey(b.start))
  )
  const opens = opensAt(date + 9 * 3600_000, win)
  const notOpen = now < opens
  const sooner = notOpen ? soonerPlan(hh.plan, date, now) : undefined
  // The class type is counted on the page itself. `more` is what only the sheet shows. The club is chosen once in the
  // Book header; a compare of several clubs is a filter in the sheet.
  const more = activeCount(f, club) - (f.cats.length ? 1 : 0)
  const clearAll = () => setFilters({ ...EMPTY, clubs: [club] })
  const catValue: CategoryId | "all" | "several" =
    f.cats.length === 0 ? "all" : f.cats.length === 1 ? f.cats[0] : "several"

  // On a phone every filter is in the sheet.
  const phoneMore = activeCount(f, club)

  const countText = `${shown.length} ${shown.length === 1 ? "class" : "classes"}`
  // One count for the day, in the heading. When filters hide some, it reads "3 of 12 classes".
  const dayCount =
    shown.length === baseDay.length
      ? countText
      : `${shown.length} of ${baseDay.length} ${baseDay.length === 1 ? "class" : "classes"}`
  const nextDay = () => setParam("date", dateKey(addDays(date, 1)))
  const query = sp.toString() ? `?${sp.toString()}` : ""
  const mineToday = useDayBookings(date)
  // A member cannot book a day that has not opened, or a club outside a Trailhead plan, so neither gets picks.
  const canBook = !notOpen && !away
  const allPicks = useDayPicks(shown)
  const picks = canBook ? allPicks : []

  return (
    <BookPage>
      <div className="gap-s flex flex-col">
        {/* The toolbar every Book tab shares (FilterBar): the club and class type, then the drawer and the reset. */}
        <FilterBar
          quick={
            <SelectBox
              label="Class type"
              hideLabel
              className="min-w-0 flex-none"
              value={catValue}
              onChange={(v) =>
                v !== "several" &&
                setFilters({ ...f, cats: v === "all" ? [] : [v as CategoryId] })
              }
              options={[
                { value: "all", label: "All classes" },
                ...(catValue === "several"
                  ? [
                      {
                        value: "several" as const,
                        label: `${f.cats.length} types`,
                      },
                    ]
                  : []),
                ...CATEGORIES.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          }
          onFilters={() => setFiltersOpen(true)}
          count={phoneMore}
          more={more}
          active={activeCount(f, club) > 0}
          onClear={clearAll}
        />

        <DayStrip
          selected={date}
          onSelect={(d) => setParam("date", d === today ? "" : dateKey(d))}
          now={now}
          windowDays={win}
          marks={marks}
        />
      </div>

      {/* The day as Home lays out its cards: the timetable in a card for each part of the day, and beside it the
          member's own day (what they have booked, and the classes picked for them). Narrow, the picks move above
          the timetable and the bookings follow it. */}
      <div className="gap-s flex flex-col">
        <div className="gap-s px-xs flex min-h-9 items-center justify-between text-body-s">
          <h2 id="day-head" className="min-w-0 truncate font-heavy">
            {fmtDayLong(date)}
          </h2>
          {notOpen || !baseDay.length ? null : (
            <span className="tabular shrink-0 text-muted-foreground">
              {dayCount}
            </span>
          )}
        </div>
        <p role="status" className="sr-only">
          {countText} on {fmtDayLong(date)}
        </p>
        <div className="gap-m grid items-start xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <section
            aria-labelledby="day-head"
            className="gap-m flex min-w-0 flex-col"
          >
            {/* Trailhead looking at another club: what the plan covers, the way back home, and the way to Ridge. The
                rows below keep their lock, so this says it once for the whole day. */}
            {away ? (
              <ReserveNotice
                art={<ClubSet club={clubs[0] as ClubId} className="w-28" />}
                title={`Classes at ${CLUB_BY_SLUG[clubs[0]].name} come with Ridge`}
                line={`Trailhead books at ${CLUB_BY_SLUG[me.homeClub].name}. You can look at this schedule.`}
                actions={
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setFilters({ ...f, clubs: [me.homeClub] })}
                    >
                      See {CLUB_BY_SLUG[me.homeClub].name}
                    </Button>
                    {me.role === "primary" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        render={<Link href="/membership/change-plan" />}
                      >
                        Switch to Ridge
                      </Button>
                    ) : null}
                  </>
                }
              />
            ) : null}
            {notOpen || preview === "notopen" ? (
              <ReserveNotice
                art={<NoticeTile id="schedule" />}
                title={`${fmtDayShort(date)} classes open ${fmtDay(opens)} at ${fmtTime(opens)}`}
                line={
                  sooner
                    ? `On ${sooner.name}, classes open ${sooner.window} days ahead, so this day is open now.`
                    : `Classes open ${win} days ahead.`
                }
                actions={
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        addRemind(dateKey(date))
                        toast({
                          title: "We'll remind you",
                          description: `A push at ${fmtTime(opens - 5 * 60000)} on ${fmtDay(opens)}.`,
                        })
                      }}
                    >
                      Remind me
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setParam("date", "")}
                    >
                      See today
                    </Button>
                    {sooner && me.role === "primary" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        render={<Link href="/membership/change-plan" />}
                      >
                        Compare plans
                      </Button>
                    ) : null}
                  </>
                }
              />
            ) : !baseDay.length || preview === "none" ? (
              <ReserveNotice
                art={<NoticeTile id="calendar" />}
                title={`No classes on ${fmtDayLong(date).split(",")[0]}`}
                actions={
                  <Button size="sm" variant="outline" onClick={nextDay}>
                    See the next day
                  </Button>
                }
              />
            ) : !shown.length || preview === "nomatch" ? (
              <ReserveNotice
                art={<NoticeTile id="mat" />}
                title="No classes match these filters"
                line={`${baseDay.length} ${baseDay.length === 1 ? "class runs" : "classes run"} on ${fmtDayLong(date).split(",")[0]} without them.`}
                actions={
                  <>
                    <Button size="sm" variant="outline" onClick={clearAll}>
                      Clear filters
                    </Button>
                    <Button size="sm" variant="outline" onClick={nextDay}>
                      See the next day
                    </Button>
                  </>
                }
              />
            ) : (
              <>
                {/* A phone: the picks come before the timetable as one short row of tiles. Wide, they are in the
                    side column. */}
                {picks.length ? (
                  <DayPicks
                    variant="tiles"
                    picks={picks}
                    query={query}
                    className="xl:hidden"
                  />
                ) : null}
                <TimeSections
                  key={date}
                  sessions={shown}
                  showClub={clubs.length > 1}
                  query={query}
                />
              </>
            )}
          </section>

          {mineToday.length || picks.length ? (
            <aside
              aria-label="Your day"
              // A phone shows the picks above the timetable, so this column holds only the bookings there.
              className={cn(
                "gap-m flex min-w-0 flex-col xl:sticky xl:top-0",
                !mineToday.length && "max-xl:hidden"
              )}
            >
              {mineToday.length ? <DayBookings list={mineToday} /> : null}
              {picks.length ? (
                <DayPicks
                  picks={picks}
                  query={query}
                  className="max-xl:hidden"
                />
              ) : null}
            </aside>
          ) : null}
        </div>
      </div>

      <FilterSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        label="Class filters"
        show={`Show ${countText}`}
      >
        <ScheduleFilters
          f={f}
          onChange={setFilters}
          count={shown.length}
          counts={catCounts}
          studios={studios}
        />
      </FilterSheet>
    </BookPage>
  )
}

export default function SchedulePage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  )
}
