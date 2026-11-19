"use client"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useRef, useState } from "react"
import { useApp } from "@/components/app/use-app"
import { CancelDialog } from "@/components/booking/cancel-dialog"
import { ListCount } from "@/components/booking/parts"
import { BookingPreview, type Item } from "@/components/bookings/booking-panel"
import { MonthCards, PastSummary } from "@/components/bookings/past"
import {
  DayCards,
  RequestsCard,
  UpcomingSummary,
} from "@/components/bookings/upcoming"
import { AppPage, TabButtons } from "@/components/kit/app"
import { Banner, SelectBox } from "@/components/kit/ui"
import { NoticeTile, ReserveNotice } from "@/components/reserve/empty"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent } from "@/components/ui/popover"
import { activeStrikes, pausedUntil } from "@/lib/engine"
import { dayStart, fmtDay } from "@/lib/time"
import type { Booking } from "@/lib/types"

type PastFilter = "all" | "attended" | "cancelled"

/**
 * Bookings, in the patterns of Home and Book. Two tabs, Upcoming and Past. Each tab opens with a row of stat cards,
 * then its list as cards: one for each day coming up, one for each month gone by. The filters for the whole page sit
 * in Book's filter well under the tabs. A booking opens in a popover anchored to its row, so the days keep the full
 * width and the member keeps their place in the list.
 * Waitlists and held spots are in the same days as bookings, in time order, because a member reads them as "my week".
 */
function Inner() {
  const { s, me, hh, now } = useApp()
  const sp = useSearchParams()
  const router = useRouter()
  // The booking in the popover. It stays set after the popover closes, so the popover keeps its content while it
  // fades out, and a click on another row (which closes it and opens it again at once) never meets an empty one.
  // `open` is what the member sees. The popover anchors to the row that opened it (or the Details button),
  // and focus goes back to the control that opened it when it closes.
  const [sel, setSel] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<Element | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  // After Esc or the close button, focus goes back to the row (or button) that opened the popover. A click outside
  // leaves focus where the member clicked.
  const refocus = () => requestAnimationFrame(() => opener.current?.focus())
  const show = (id: string, from: HTMLElement) => {
    opener.current = from
    setAnchor(from.closest("li") ?? from)
    setSel(id)
    setOpen(true)
  }
  const [cancelFor, setCancelFor] = useState<Booking | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [pastFilter, setPastFilter] = useState<PastFilter>("all")
  const [pastN, setPastN] = useState(10)
  const who = sp.get("who") ?? "all"
  const tab = sp.get("tab") === "past" ? "past" : "upcoming"
  const go = (next: { who?: string; tab?: string }) => {
    const p = new URLSearchParams()
    const w = next.who ?? who
    const t = next.tab ?? tab
    if (w !== "all") p.set("who", w)
    if (t === "past") p.set("tab", "past")
    router.replace(`/bookings${p.size ? `?${p}` : ""}`, { scroll: false })
  }
  const household = Object.values(s.members).filter(
    (m) => m.householdId === hh.id
  )
  const ids =
    me.role === "teen"
      ? [me.id]
      : who === "all"
        ? household.map((m) => m.id)
        : [who]
  const mine = s.bookings.filter((b) => ids.includes(b.memberId))
  // Two children in the same kids club block are one row.
  const group = (list: Booking[]) => {
    const out: Item[] = []
    for (const b of list) {
      if (b.kind === "kids") {
        const prev = out.find(
          (o) =>
            o.b.kind === "kids" &&
            o.b.ref === b.ref &&
            o.b.start === b.start &&
            o.b.status === b.status
        )
        if (prev?.group) {
          prev.group.push(b)
          continue
        }
        out.push({ b, group: [b] })
      } else out.push({ b })
    }
    return out
  }
  const upcoming = group(
    mine
      .filter(
        (b) =>
          (["booked", "held", "pending_approval"].includes(b.status) &&
            b.end > now) ||
          (b.status === "waitlisted" && b.start > now)
      )
      .sort((a, b) => a.start - b.start)
  )
  const pastAll = mine
    .filter(
      (b) =>
        ["attended", "late_cancelled", "cancelled", "no_show"].includes(
          b.status
        ) ||
        (b.status === "booked" && b.end <= now)
    )
    .sort((a, b) => b.start - a.start)
  const past = pastAll.filter(
    (b) =>
      pastFilter === "all" ||
      (pastFilter === "attended"
        ? b.status === "attended"
        : b.status !== "attended")
  )
  const days = Object.entries(
    upcoming.reduce<Record<number, Item[]>>((acc, r) => {
      const day = dayStart(r.b.start)
      acc[day] ??= []
      acc[day].push(r)
      return acc
    }, {})
  ).map(([d, rows]) => [Number(d), rows] as [number, Item[]])
  const strikes = activeStrikes(s, me.id, now)
  const pu = pausedUntil(s, me.id, now)
  const requests =
    me.role === "teen"
      ? s.requests.filter((r) => r.teenId === me.id && r.status === "pending")
      : []
  // A cancelled or confirmed booking leaves the list, so the sheet closes with it.
  const current = sel ? upcoming.find((r) => r.b.id === sel) : undefined
  const showWho = me.role !== "teen" && household.length > 1
  const pastShown = Math.min(pastN, past.length)

  // The filter well, as Book's: whose bookings for the whole page, and on Past the kind of record.
  const filters =
    showWho || tab === "past" ? (
      <div className="gap-xs p-xs flex flex-wrap items-center corner-m bg-muted/50">
        {showWho ? (
          <SelectBox
            label="Whose bookings"
            hideLabel
            className="min-w-0 flex-none"
            value={who}
            onChange={(v) => go({ who: v })}
            options={[
              { value: "all", label: "Everyone" },
              ...household.map((m) => ({
                value: m.id,
                label: m.id === me.id ? `${m.firstName} (you)` : m.firstName,
              })),
            ]}
          />
        ) : null}
        {tab === "past" ? (
          <SelectBox<PastFilter>
            label="Show"
            hideLabel
            className="min-w-0 flex-none"
            value={pastFilter}
            onChange={(v) => {
              setPastFilter(v)
              setPastN(10)
            }}
            options={[
              { value: "all", label: "All past bookings" },
              { value: "attended", label: "Attended" },
              { value: "cancelled", label: "Cancelled and missed" },
            ]}
          />
        ) : null}
      </div>
    ) : null

  return (
    <AppPage
      title="Bookings"
      actions={
        <Button size="sm" render={<Link href="/schedule" />}>
          Book
        </Button>
      }
      tabs={
        <TabButtons
          label="Bookings"
          value={tab}
          onChange={(t) => go({ tab: t })}
          items={[
            { value: "upcoming", label: "Upcoming", count: upcoming.length },
            { value: "past", label: "Past" },
          ]}
        />
      }
    >
      {filters}

      {pu ? (
        <Banner tone="warning" title={`Booking is paused until ${fmtDay(pu)}`}>
          You can still cancel and check in.
        </Banner>
      ) : null}

      <div
        id="bookings-panel"
        role="tabpanel"
        aria-label={tab === "past" ? "Past" : "Upcoming"}
        className="gap-m flex flex-col"
      >
        {tab === "upcoming" ? (
          <>
            {upcoming.length ? (
              <UpcomingSummary
                list={upcoming}
                strikes={strikes}
                yours={showWho}
                onOpen={show}
              />
            ) : null}
            {requests.length ? <RequestsCard requests={requests} /> : null}
            {upcoming.length ? (
              <div className="gap-m flex flex-col">
                <DayCards
                  days={days}
                  showWho={showWho}
                  selected={open ? current?.b.id : undefined}
                  onSelect={show}
                />
              </div>
            ) : (
              <ReserveNotice
                art={<NoticeTile id="schedule" />}
                title="Nothing booked"
                line={
                  strikes.length
                    ? `${strikes.length} of 3 late cancels in the last 30 days.`
                    : undefined
                }
                actions={
                  <Button
                    size="sm"
                    variant="outline"
                    render={<Link href="/schedule" />}
                  >
                    Book a class
                  </Button>
                }
              />
            )}
          </>
        ) : pastAll.length ? (
          <>
            <PastSummary all={pastAll} strikes={strikes} yours={showWho} />
            {past.length ? (
              <>
                <MonthCards list={past.slice(0, pastN)} />
                <div className="gap-s flex flex-col items-center">
                  <ListCount>
                    Viewing 1–{pastShown} of {past.length}
                  </ListCount>
                  {past.length > pastN ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPastN((n) => n + 10)}
                    >
                      Show 10 more
                    </Button>
                  ) : null}
                </div>
              </>
            ) : (
              <ReserveNotice
                art={<NoticeTile id="mat" />}
                title="No past bookings match"
                actions={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPastFilter("all")}
                  >
                    Show all
                  </Button>
                }
              />
            )}
          </>
        ) : (
          <ReserveNotice
            art={<NoticeTile id="heart-watch" />}
            title="No past bookings yet"
          />
        )}
      </div>
      <Popover
        open={open && !!current}
        onOpenChange={(o, details) => {
          setOpen(o)
          if (!o && details.reason === "escape-key") refocus()
        }}
      >
        {/* Under the row, at its right end, where the chevron is. The popover flips above it near the foot of the
            screen. 360 px holds the facts and three actions on two lines; the theme caps it to the screen. */}
        <PopoverContent
          anchor={anchor}
          side="bottom"
          align="end"
          // The popover has no trigger of its own, so it would leave focus on the page. `refocus` returns it.
          finalFocus={false}
          aria-label="Booking details"
          className="!w-90"
        >
          {current ? (
            <BookingPreview
              key={current.b.id}
              item={current}
              now={now}
              showWho={showWho}
              onClose={() => {
                setOpen(false)
                refocus()
              }}
              onCancel={(b) => {
                setOpen(false)
                setCancelFor(b)
                setCancelOpen(true)
              }}
            />
          ) : null}
        </PopoverContent>
      </Popover>
      {cancelFor ? (
        <CancelDialog
          booking={cancelFor}
          open={cancelOpen}
          onOpenChange={setCancelOpen}
        />
      ) : null}
    </AppPage>
  )
}

export default function BookingsPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  )
}
