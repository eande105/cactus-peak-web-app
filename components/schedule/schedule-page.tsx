"use client"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useApp } from "@/components/app/use-app"
import { BookPage } from "@/components/book/book-tabs"
import { ScheduleRow } from "@/components/booking/class-row"
import { ListRows, ListSection } from "@/components/booking/parts"
import { ListFilter, Lock, Search } from "@/components/icons"
import { Panel, Toolbar } from "@/components/kit/app"
import { SideSheet } from "@/components/kit/overlays"
import { Banner, EmptyState, SelectBox } from "@/components/kit/ui"
import { DayStrip } from "@/components/schedule/day-strip"
import { ScheduleFilters } from "@/components/schedule/filters"
import { Button } from "@/components/ui/button"
import { addRemind } from "@/lib/actions"
import { CATEGORIES, CLUB_BY_SLUG, CLUBS } from "@/lib/data/catalog"
import { sessionsForDay } from "@/lib/data/sessions"
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

/**
 * Book › Classes. One toolbar row, the day strip, then that day's timetable as bare rows on the sheet.
 * Two filters are on the page because members use them every visit: the club and the kind of class.
 * The other filters (time of day, intensity, open spots, coach, room, length) are one step away in "More filters".
 */
function Inner() {
  const { s, me, hh, prefs, club, now } = useApp()
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
  const clubs = f.clubs.filter((c) => !homeOnly || c === me.homeClub)
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
  // The two page filters are counted on the page itself. `more` is what only the sheet shows.
  const more =
    activeCount(f, club) -
    (f.cats.length ? 1 : 0) -
    (clubs.length !== 1 || clubs[0] !== club ? 1 : 0)
  const clearAll = () => setFilters({ ...EMPTY, clubs: [club] })
  const clubValue = clubs.length === 1 ? clubs[0] : "several"
  const catValue: CategoryId | "all" | "several" =
    f.cats.length === 0 ? "all" : f.cats.length === 1 ? f.cats[0] : "several"

  const countText = `${shown.length} ${shown.length === 1 ? "class" : "classes"}`
  // One count for the day, in the heading. When filters hide some, it reads "3 of 12 classes".
  const dayCount =
    shown.length === baseDay.length
      ? countText
      : `${shown.length} of ${baseDay.length} ${baseDay.length === 1 ? "class" : "classes"}`
  const nextDay = () => setParam("date", dateKey(addDays(date, 1)))

  return (
    <BookPage>
      {homeOnly && club !== me.homeClub ? (
        <Banner
          tone="neutral"
          icon={Lock}
          title={`Trailhead books at ${CLUB_BY_SLUG[me.homeClub].name}.`}
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/membership/change-plan")}
            >
              See Ridge
            </Button>
          }
        >
          You can look at this schedule. You cannot book from it.
        </Banner>
      ) : null}

      <div className="gap-s flex flex-col">
        {/* One toolbar row in a faint well: the club and class type, then the filter sheet and the reset. */}
        <Toolbar className="p-xs items-center corner-m bg-muted/50">
          <SelectBox
            label="Club"
            hideLabel
            className="min-w-0 flex-1 basis-32 md:flex-none md:basis-auto"
            value={clubValue}
            onChange={(v) =>
              v !== "several" && setFilters({ ...f, clubs: [v] })
            }
            options={[
              ...(clubValue === "several"
                ? [{ value: "several", label: `${clubs.length} clubs` }]
                : []),
              ...CLUBS.map((c) => ({
                value: c.slug,
                label: c.name,
                disabled: homeOnly && c.slug !== me.homeClub,
              })),
            ]}
          />
          <SelectBox
            label="Class type"
            hideLabel
            className="min-w-0 flex-1 basis-32 md:flex-none md:basis-auto"
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
          <Button variant="outline" onClick={() => setFiltersOpen(true)}>
            <ListFilter aria-hidden="true" data-icon="inline-start" />
            More filters{more > 0 ? ` (${more})` : ""}
          </Button>
          {activeCount(f, club) > 0 ? (
            <Button variant="ghost" onClick={clearAll}>
              Clear
            </Button>
          ) : null}
        </Toolbar>

        <DayStrip
          selected={date}
          onSelect={(d) => setParam("date", d === today ? "" : dateKey(d))}
          now={now}
          windowDays={win}
          marks={marks}
        />
      </div>

      {/* The day's classes sit on the sheet: a small date heading, then bare rows with a rule between them. */}
      <ListSection
        title={<span id="day-head">{fmtDayLong(date)}</span>}
        end={
          notOpen || !baseDay.length ? undefined : (
            <span className="tabular">{dayCount}</span>
          )
        }
      >
        <p role="status" className="sr-only">
          {countText} on {fmtDayLong(date)}
        </p>
        {notOpen ? (
          <EmptyState
            icon={Lock}
            title={`${fmtDayShort(date)} classes open ${fmtDay(opens)} at ${fmtTime(opens)}`}
            action={
              <Button
                size="sm"
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
            }
            secondary={
              <Button
                size="sm"
                variant="outline"
                onClick={() => setParam("date", "")}
              >
                See today
              </Button>
            }
          />
        ) : !baseDay.length ? (
          <EmptyState
            object="schedule"
            title={`No classes on ${fmtDayLong(date).split(",")[0]}`}
            action={
              <Button size="sm" variant="outline" onClick={nextDay}>
                See the next day
              </Button>
            }
          />
        ) : !shown.length ? (
          <EmptyState
            icon={Search}
            title="No classes match"
            action={
              <Button size="sm" onClick={clearAll}>
                Clear filters
              </Button>
            }
            secondary={
              <Button size="sm" variant="outline" onClick={nextDay}>
                See the next day
              </Button>
            }
          />
        ) : (
          <ListRows label="Classes" className="rule-b">
            {shown.map((x) => (
              <ScheduleRow
                key={x.id}
                se={x}
                showClub={clubs.length > 1}
                query={sp.toString() ? `?${sp.toString()}` : ""}
              />
            ))}
          </ListRows>
        )}
      </ListSection>

      <SideSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        label="Class filters"
      >
        <Panel
          title="Filters"
          onClose={() => setFiltersOpen(false)}
          footer={
            <Button size="sm" onClick={() => setFiltersOpen(false)}>
              Show {countText}
            </Button>
          }
        >
          <ScheduleFilters
            f={f}
            onChange={setFilters}
            count={shown.length}
            counts={catCounts}
            studios={studios}
          />
        </Panel>
      </SideSheet>
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
